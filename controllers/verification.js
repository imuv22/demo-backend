import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Verification from '../models/Verification.js';
import { fail } from '../utils/ApiError.js';
import { send } from '../utils/ApiResponse.js';
import {
    getActiveVideoLivenessData,
    initiateActiveVideoLiveness,
} from '../services/decentro.js';

const DECENTRO_SUCCESS_CODE = 'S00000';

const getPurpose = () =>
    process.env.DECENTRO_CONSENT_PURPOSE || 'Identity verification for onboarding';

const getThreshold = () => {
    const threshold = Number(process.env.DECENTRO_MATCH_THRESHOLD);
    return Number.isFinite(threshold) ? threshold : 70;
};

const normalizeUrl = (url) => url?.trim().replace(/\/$/, '');

const buildCallbackUrl = () => {
    const baseUrl = normalizeUrl(process.env.BACKEND_URL);
    const callbackUrl = new URL('/api/verification/decentro/callback', `${baseUrl}/`);

    if (process.env.DECENTRO_CALLBACK_TOKEN) {
        callbackUrl.searchParams.set('token', process.env.DECENTRO_CALLBACK_TOKEN);
    }

    return callbackUrl.toString();
};

const buildRedirectUrl = (verificationId) => {
    const frontendUrl = normalizeUrl(process.env.FRONTEND_URL || process.env.CLIENT_URL);
    const redirectUrl = new URL('/verification/return', `${frontendUrl}/`);
    redirectUrl.searchParams.set('verificationId', verificationId.toString());
    return redirectUrl.toString();
};

const toBoolean = (value) => {
    if (typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'number') {
        return value === 1;
    }

    if (typeof value !== 'string') {
        return undefined;
    }

    const normalizedValue = value.trim().toLowerCase();

    if (['true', 'yes', 'y', '1'].includes(normalizedValue)) {
        return true;
    }

    if (['false', 'no', 'n', '0'].includes(normalizedValue)) {
        return false;
    }

    return undefined;
};

const toScore = (value) => {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }

    if (typeof value !== 'string') {
        return null;
    }

    const score = Number(value.replace('%', '').trim());
    return Number.isFinite(score) ? score : null;
};

const getBestMatchScore = (videoFaceMatchResults = []) => {
    if (!Array.isArray(videoFaceMatchResults)) {
        return null;
    }

    const scores = videoFaceMatchResults
        .map((result) => toScore(result?.results?.matchScore ?? result?.matchScore))
        .filter((score) => score !== null);

    return scores.length ? Math.max(...scores) : null;
};

const isSuccessfulDecentroResponse = (payload) =>
    String(payload?.status || '').toUpperCase() === 'SUCCESS' ||
    payload?.responseCode === DECENTRO_SUCCESS_CODE;

const isPendingDecentroResponse = (payload) => {
    const status = String(payload?.data?.status || payload?.status || '').toUpperCase();
    return ['CREATED', 'INITIATED', 'IN_PROGRESS', 'PENDING', 'PROCESSING'].includes(status);
};

const normalizeDecentroResult = (payload) => {
    const data = payload?.data || {};
    const providerStatus = payload?.status || data.status;

    if (isPendingDecentroResponse(payload)) {
        return {
            status: 'pending',
            decision: undefined,
            providerStatus,
            responseCode: payload?.responseCode,
            responseKey: payload?.responseKey,
            message: payload?.message || 'Verification is still pending',
        };
    }

    if (!isSuccessfulDecentroResponse(payload)) {
        return {
            status: 'failed',
            decision: 'failed',
            providerStatus,
            responseCode: payload?.responseCode,
            responseKey: payload?.responseKey,
            message: payload?.message || 'Verification failed',
        };
    }

    const matchScore = getBestMatchScore(data.videoFaceMatchResults);
    const liveness = data.liveliness ?? data.liveness ?? data.live;
    const staticRisk = toBoolean(data.staticRisk);
    const prerecordedRisk = toBoolean(data.prerecordedRisk);
    const isLive = String(liveness || '').trim().toLowerCase() === 'yes';
    const riskDataComplete =
        typeof staticRisk === 'boolean' && typeof prerecordedRisk === 'boolean';
    const risksPassed = staticRisk === false && prerecordedRisk === false;

    let decision = 'needs_review';

    if (isLive && riskDataComplete && risksPassed && matchScore !== null) {
        decision = matchScore >= getThreshold() ? 'same_person' : 'different_person';
    }

    return {
        status: 'completed',
        decision,
        matchScore,
        liveness: liveness === undefined ? undefined : String(liveness),
        staticRisk,
        prerecordedRisk,
        providerStatus,
        responseCode: payload?.responseCode,
        responseKey: payload?.responseKey,
        message: payload?.message,
    };
};

const applyDecentroPayload = (verification, payload) => {
    const normalized = normalizeDecentroResult(payload);

    verification.status = normalized.status;
    verification.decision = normalized.decision;
    verification.matchScore = normalized.matchScore;
    verification.liveness = normalized.liveness;
    verification.staticRisk = normalized.staticRisk;
    verification.prerecordedRisk = normalized.prerecordedRisk;
    verification.providerStatus = normalized.providerStatus;
    verification.responseCode = normalized.responseCode;
    verification.responseKey = normalized.responseKey;
    verification.message = normalized.message;
    verification.lastCheckedAt = new Date();

    return verification;
};

const formatVerification = (verification) => ({
    id: verification._id.toString(),
    referenceId: verification.referenceId,
    decentroTxnId: verification.decentroTxnId,
    status: verification.status,
    decision: verification.decision,
    matchScore: verification.matchScore,
    liveness: verification.liveness,
    staticRisk: verification.staticRisk,
    prerecordedRisk: verification.prerecordedRisk,
    responseCode: verification.responseCode,
    responseKey: verification.responseKey,
    providerStatus: verification.providerStatus,
    message: verification.message,
    createdAt: verification.createdAt,
    updatedAt: verification.updatedAt,
    lastCheckedAt: verification.lastCheckedAt,
});

const findUserVerification = async (id, userId) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        fail(404, 'Verification not found');
    }

    const verification = await Verification.findOne({ _id: id, user: userId });

    if (!verification) {
        fail(404, 'Verification not found');
    }

    return verification;
};

const getCallbackReference = (payload) =>
    payload?.reference_id ||
    payload?.referenceId ||
    payload?.data?.reference_id ||
    payload?.data?.referenceId;

const getCallbackTxnId = (payload) =>
    payload?.decentroTxnId ||
    payload?.decentro_transaction_id ||
    payload?.decentro_txn_id ||
    payload?.transaction_id ||
    payload?.data?.decentroTxnId ||
    payload?.data?.decentro_transaction_id;

export const createVerificationSession = async (req, res) => {
    if (toBoolean(req.body?.consent) !== true) {
        fail(400, 'Consent is required to start verification');
    }

    if (!req.file) {
        fail(400, 'Reference photo is required');
    }

    const referenceId = `verification-${Date.now()}-${crypto.randomUUID()}`;
    const verification = await Verification.create({
        user: req.user._id,
        referenceId,
        status: 'created',
    });

    const photoBase64 = req.file.buffer.toString('base64');
    const requestPayload = {
        consent: true,
        purpose: getPurpose(),
        reference_id: referenceId,
        redirect_url: buildRedirectUrl(verification._id),
        callback_url: buildCallbackUrl(),
        face_image_urls: [],
        face_image_base64s: [photoBase64],
    };

    const decentroResponse = await initiateActiveVideoLiveness(requestPayload);
    const body = decentroResponse.body || {};

    verification.decentroTxnId = body.decentroTxnId;
    verification.responseCode = body.responseCode;
    verification.responseKey = body.responseKey;
    verification.providerStatus = body.status;
    verification.message = body.message;

    if (!decentroResponse.ok || !isSuccessfulDecentroResponse(body) || !body.videoLivenessUrl) {
        verification.status = 'failed';
        verification.decision = 'failed';
        await verification.save();
        fail(502, body.message || 'Decentro could not start the verification session');
    }

    verification.status = 'initiated';
    await verification.save();

    return send(
        res,
        201,
        {
            verificationId: verification._id.toString(),
            videoLivenessUrl: body.videoLivenessUrl,
            verification: formatVerification(verification),
        },
        'Verification session created'
    );
};

export const getVerificationSession = async (req, res) => {
    const verification = await findUserVerification(req.params.id, req.user._id);
    return send(res, 200, formatVerification(verification), 'Verification session');
};

export const refreshVerificationSession = async (req, res) => {
    const verification = await findUserVerification(req.params.id, req.user._id);

    if (!verification.decentroTxnId) {
        fail(409, 'Decentro transaction is not available for this verification');
    }

    const decentroResponse = await getActiveVideoLivenessData(verification.decentroTxnId, {
        consent: true,
        purpose: getPurpose(),
        reference_id: verification.referenceId,
    });

    const body = decentroResponse.body || {};
    applyDecentroPayload(verification, body);
    await verification.save();

    return send(res, 200, formatVerification(verification), 'Verification result refreshed');
};

export const decentroCallback = async (req, res) => {
    const configuredToken = process.env.DECENTRO_CALLBACK_TOKEN;
    const requestToken = req.query.token || req.headers['x-callback-token'];

    if (configuredToken && requestToken !== configuredToken) {
        fail(401, 'Invalid callback token');
    }

    const payload = req.body || {};
    const decentroTxnId = getCallbackTxnId(payload);
    const referenceId = getCallbackReference(payload);
    const query = decentroTxnId ? { decentroTxnId } : { referenceId };

    if (!query.decentroTxnId && !query.referenceId) {
        return send(res, 202, { matched: false }, 'Callback received without a known reference');
    }

    const verification = await Verification.findOne(query);

    if (!verification) {
        return send(res, 202, { matched: false }, 'Callback received for unknown verification');
    }

    applyDecentroPayload(verification, payload);
    await verification.save();

    return send(
        res,
        200,
        {
            matched: true,
            verificationId: verification._id.toString(),
        },
        'Callback processed'
    );
};



// this is a comment