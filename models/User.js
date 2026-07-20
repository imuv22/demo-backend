import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 80,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            index: true,
        },
        passwordHash: {
            type: String,
            required: true,
            select: false,
        },
        profilePicture: {
            url: {
                type: String,
                default: '',
            },
            publicId: {
                type: String,
                default: '',
            },
        },
        profilePictureVerification: {
            isVerified: {
                type: Boolean,
                default: false,
            },
            verifiedAt: {
                type: Date,
                default: null,
            },
            externalDatabaseRefID: {
                type: String,
                default: '',
            },
            profilePicturePublicId: {
                type: String,
                default: '',
            },
            matchLevel: {
                type: Number,
                default: null,
            },
            imageProcessingStatusEnumInt: {
                type: Number,
                default: null,
            },
            pendingExternalDatabaseRefID: {
                type: String,
                default: '',
            },
            pendingProfilePicturePublicId: {
                type: String,
                default: '',
            },
            pendingStartedAt: {
                type: Date,
                default: null,
            },
        },
    },
    { timestamps: true }
);

const User = mongoose.model('User', userSchema);

export default User;
