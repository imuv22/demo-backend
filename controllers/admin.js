import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { fail } from '../utils/ApiError.js';
import { send } from '../utils/ApiResponse.js';

const formatUser = (user) => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
});

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

