import { randomUUID } from 'node:crypto';
import cloudinary from '../config/cloudinary.js';
import User from '../models/User.js';
import {
    matchFaceTecProfilePicture,
    processFaceTecSessionRequest,
} from '../services/facetec.service.js';
import { fail } from '../utils/ApiError.js';
import { send } from '../utils/ApiResponse.js';
import { formatUser } from '../utils/formatUser.js';

const MAX_PROFILE_PICTURE_BYTES = 8 * 1024 * 1024;
const PROFILE_PICTURE_FETCH_TIMEOUT_MS = 30_000;

const createExternalDatabaseRefID = () =>
    `matrimony_${randomUUID()}`;

const getVerificationImageUrl = (profilePicture) => {
    if (profilePicture?.publicId) {
        return cloudinary.url(profilePicture.publicId, {
            secure: true,
            resource_type: 'image',
            format: 'jpg',
        });
    }

    return profilePicture?.url || '';
};

const getProfilePictureImageBase64 = async (imageUrl) => {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
        abortController.abort();
    }, PROFILE_PICTURE_FETCH_TIMEOUT_MS);

    try {
        const response = await fetch(imageUrl, {
            signal: abortController.signal,
        });

        if (!response.ok) {
            fail(
                502,
                'Could not retrieve the saved profile picture.'
            );
        }

        const contentType =
            response.headers.get('content-type') || '';

        if (
            !contentType.startsWith('image/jpeg') &&
            !contentType.startsWith('image/png')
        ) {
            fail(
                422,
                'FaceTec profile picture matching requires a JPG or PNG image.'
            );
        }

        const contentLength = Number(
            response.headers.get('content-length')
        );

        if (
            Number.isFinite(contentLength) &&
            contentLength > MAX_PROFILE_PICTURE_BYTES
        ) {
            fail(
                413,
                'Saved profile picture is too large to verify.'
            );
        }

        const imageBuffer = Buffer.from(
            await response.arrayBuffer()
        );

        if (imageBuffer.byteLength > MAX_PROFILE_PICTURE_BYTES) {
            fail(
                413,
                'Saved profile picture is too large to verify.'
            );
        }

        return imageBuffer.toString('base64');
    } catch (error) {
        if (error?.statusCode) {
            throw error;
        }

        if (error?.name === 'AbortError') {
            fail(
                504,
                'Timed out while retrieving the saved profile picture.'
            );
        }

        fail(
            502,
            'Could not retrieve the saved profile picture.'
        );
    } finally {
        clearTimeout(timeoutId);
    }
};

const clearPendingVerification = {
    'profilePictureVerification.pendingExternalDatabaseRefID': '',
    'profilePictureVerification.pendingProfilePicturePublicId': '',
    'profilePictureVerification.pendingStartedAt': null,
};

export const processSessionRequest = async (req, res) => {
    const {
        requestBlob,
        externalDatabaseRefID,
        testingApiHeader,
    } = req.body;

    const result = await processFaceTecSessionRequest({
        requestBlob,
        externalDatabaseRefID,
        testingApiHeader,
    });

    return send(
        res,
        200,
        result,
        'FaceTec session request processed'
    );
};

export const createProfilePictureVerificationSession = async (
    req,
    res
) => {
    if (
        !req.user.profilePicture?.url ||
        !req.user.profilePicture?.publicId
    ) {
        fail(
            400,
            'Upload and save a profile picture before verification.'
        );
    }

    const externalDatabaseRefID =
        createExternalDatabaseRefID();

    req.user.set(
        'profilePictureVerification.pendingExternalDatabaseRefID',
        externalDatabaseRefID
    );
    req.user.set(
        'profilePictureVerification.pendingProfilePicturePublicId',
        req.user.profilePicture.publicId
    );
    req.user.set(
        'profilePictureVerification.pendingStartedAt',
        new Date()
    );

    await req.user.save();

    return send(
        res,
        201,
        {
            externalDatabaseRefID,
        },
        'FaceTec profile picture verification session created'
    );
};

export const completeProfilePictureVerification = async (
    req,
    res
) => {
    const { externalDatabaseRefID } = req.body;

    if (
        !req.user.profilePicture?.url ||
        !req.user.profilePicture?.publicId
    ) {
        fail(
            400,
            'Upload and save a profile picture before verification.'
        );
    }

    const verification =
        req.user.profilePictureVerification || {};

    if (
        verification.pendingExternalDatabaseRefID !==
        externalDatabaseRefID ||
        verification.pendingProfilePicturePublicId !==
        req.user.profilePicture.publicId
    ) {
        fail(
            403,
            'FaceTec verification session does not belong to the current profile picture.'
        );
    }

    const imageBase64 =
        await getProfilePictureImageBase64(
            getVerificationImageUrl(req.user.profilePicture)
        );

    const matchResult =
        await matchFaceTecProfilePicture({
            imageBase64,
            externalDatabaseRefID,
        });

    const update = {
        ...clearPendingVerification,
        'profilePictureVerification.isVerified':
            matchResult.success,
        'profilePictureVerification.verifiedAt':
            matchResult.success ? new Date() : null,
        'profilePictureVerification.externalDatabaseRefID':
            matchResult.success ? externalDatabaseRefID : '',
        'profilePictureVerification.profilePicturePublicId':
            matchResult.success
                ? req.user.profilePicture.publicId
                : '',
        'profilePictureVerification.matchLevel':
            matchResult.matchLevel,
        'profilePictureVerification.imageProcessingStatusEnumInt':
            matchResult.imageProcessingStatusEnumInt,
    };

    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { $set: update },
        { new: true, runValidators: true }
    );

    if (!updatedUser) {
        fail(401, 'Invalid or expired token');
    }

    if (!matchResult.success) {
        fail(
            422,
            'The live FaceTec selfie did not match the current profile picture.'
        );
    }

    return send(
        res,
        200,
        {
            user: formatUser(updatedUser),
            verification: {
                verified: true,
                matchLevel: matchResult.matchLevel,
                imageProcessingStatusEnumInt:
                    matchResult.imageProcessingStatusEnumInt,
            },
        },
        'Profile picture verified'
    );
};
