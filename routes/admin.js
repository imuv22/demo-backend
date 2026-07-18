import express from 'express';
import { login, me, signup } from '../controllers/admin.js';
import authenticate from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';
import { loginSchema, signupSchema } from '../validators/admin.js';

const router = express.Router();

// admin routes
router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.get('/me', authenticate, me);

export default router;
