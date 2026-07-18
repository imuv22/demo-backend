import express from 'express';
import multer from 'multer';
import {
    createVerificationSession,
    decentroCallback,
    getVerificationSession,
    refreshVerificationSession,
} from '../controllers/verification.js';
import authenticate from '../middlewares/auth.js';
import { error } from '../utils/ApiError.js';

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 6 * 1024 * 1024,
        files: 1,
    },
    fileFilter(req, file, callback) {
        if (['image/jpeg', 'image/png'].includes(file.mimetype)) {
            return callback(null, true);
        }

        return callback(error(415, 'Only JPG, JPEG, and PNG photos are supported'));
    },
});

const uploadPhoto = (req, res, next) => {
    upload.single('photo')(req, res, (err) => {
        if (!err) {
            return next();
        }

        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return next(error(413, 'Reference photo must be 6MB or smaller'));
        }

        return next(err);
    });
};

router.post('/decentro/callback', decentroCallback);

router.use(authenticate);
router.post('/sessions', uploadPhoto, createVerificationSession);
router.get('/sessions/:id', getVerificationSession);
router.post('/sessions/:id/refresh', refreshVerificationSession);

export default router;
