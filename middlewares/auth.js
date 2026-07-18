import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { error } from '../utils/ApiError.js';
import { setRequestProperty } from '../utils/setRequestProperty.js';

const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return next(error(401, 'Authentication required'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.sub);

        if (!user) {
            return next(error(401, 'Invalid or expired token'));
        }

        setRequestProperty(req, 'user', user);
        return next();
    } catch {
        return next(error(401, 'Invalid or expired token'));
    }
};

export default authenticate;
