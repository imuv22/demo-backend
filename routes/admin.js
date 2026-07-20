import express from 'express';
import multer from 'multer';
import { login, me, signup, uploadProfilePicture } from '../controllers/admin.js';
import authenticate from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import { loginSchema, signupSchema } from '../validators/admin.js';
import { error } from '../utils/ApiError.js';

const router = express.Router();
const supportedProfilePictureTypes = ['image/jpeg', 'image/png', 'image/webp'];

const profilePictureUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 6 * 1024 * 1024,
    },
    fileFilter: (req, file, callback) => {
        if (!supportedProfilePictureTypes.includes(file.mimetype)) {
            callback(error(400, 'Only JPG, PNG, and WEBP profile pictures are supported'));
            return;
        }

        callback(null, true);
    },
});

const uploadProfilePictureFile = (req, res, next) => {
    profilePictureUpload.single('profilePicture')(req, res, (err) => {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return next(error(400, 'Profile picture must be 6MB or smaller'));
        }

        if (err) {
            return next(err);
        }

        return next();
    });
};

// admin routes
router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.get('/me', authenticate, me);
router.post('/profile-picture', authenticate, uploadProfilePictureFile, uploadProfilePicture);

export default router;
