import mongoose from 'mongoose';

const verificationSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        referenceId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        decentroTxnId: {
            type: String,
            index: true,
        },
        status: {
            type: String,
            enum: ['created', 'initiated', 'pending', 'completed', 'failed'],
            default: 'created',
            index: true,
        },
        decision: {
            type: String,
            enum: ['same_person', 'different_person', 'needs_review', 'failed'],
        },
        matchScore: {
            type: Number,
            min: 0,
            max: 100,
        },
        liveness: String,
        staticRisk: Boolean,
        prerecordedRisk: Boolean,
        responseCode: String,
        responseKey: String,
        providerStatus: String,
        message: String,
        lastCheckedAt: Date,
    },
    { timestamps: true }
);

const Verification = mongoose.model('Verification', verificationSchema);

export default Verification;
