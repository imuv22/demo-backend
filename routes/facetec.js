import express from 'express';
import {
    completeProfilePictureVerification,
    createProfilePictureVerificationSession,
    processSessionRequest,
} from '../controllers/facetec.js';
import authenticate from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import {
    completeProfilePictureVerificationSchema,
    processFaceTecSessionRequestSchema,
} from '../validators/facetec.js';

const router = express.Router();
const faceTecSessionJsonParser = express.json({
    limit: '10mb',
});
const jsonParser = express.json({
    limit: '100kb',
});

router.post(
    '/session-request',
    authenticate,
    faceTecSessionJsonParser,
    validate(processFaceTecSessionRequestSchema),
    processSessionRequest
);

router.post(
    '/profile-picture/start',
    authenticate,
    createProfilePictureVerificationSession
);

router.post(
    '/profile-picture/complete',
    authenticate,
    jsonParser,
    validate(completeProfilePictureVerificationSchema),
    completeProfilePictureVerification
);

export default router;
