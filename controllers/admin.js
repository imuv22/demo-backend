import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cloudinary from '../config/cloudinary.js';
import User from '../models/User.js';
import { fail } from '../utils/ApiError.js';
import { send } from '../utils/ApiResponse.js';

const formatUser = (user) => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    profilePicture: user.profilePicture?.url
        ? {
            url: user.profilePicture.url,
        }
        : null,
});

const uploadBufferToCloudinary = (file) =>
    new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: process.env.CLOUDINARY_FOLDER || 'profile-pictures',
                resource_type: 'image',
            },
            (err, result) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(result);
            }
        );

        uploadStream.end(file.buffer);
    });

const deleteCloudinaryImage = async (publicId) => {
    if (!publicId) {
        return;
    }

    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    } catch (err) {
        console.error(`Failed to delete Cloudinary image ${publicId}:`, err.message);
    }
};

const createAuthPayload = (user) => ({
    user: formatUser(user),
    token: jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }),
});

export const signup = async (req, res) => {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email }).lean();

    if (existingUser) {
        fail(409, 'Email is already registered');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });

    return send(res, 201, createAuthPayload(user), 'Signup successful');
};

export const login = async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user) {
        fail(401, 'Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
        fail(401, 'Invalid email or password');
    }

    return send(res, 200, createAuthPayload(user), 'Login successful');
};

export const me = (req, res) => {
    return send(res, 200, formatUser(req.user), 'Authenticated user');
};

export const uploadProfilePicture = async (req, res) => {
    if (!req.file) {
        fail(400, 'Profile picture is required');
    }

    const previousPublicId = req.user.profilePicture?.publicId;
    let uploadedImage;
    let updatedUser;

    try {
        uploadedImage = await uploadBufferToCloudinary(req.file);

        updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            {
                profilePicture: {
                    url: uploadedImage.secure_url,
                    publicId: uploadedImage.public_id,
                },
            },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            fail(401, 'Invalid or expired token');
        }
    } catch (err) {
        if (uploadedImage?.public_id) {
            await deleteCloudinaryImage(uploadedImage.public_id);
        }

        throw err;
    }

    await deleteCloudinaryImage(previousPublicId);

    return send(res, 200, formatUser(updatedUser), 'Profile picture updated');
};

