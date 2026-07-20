import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import { rateLimit } from 'express-rate-limit';
import adminRoutes from './routes/admin.js';
import facetecRoutes from './routes/facetec.js';
import ApiError, { error } from './utils/ApiError.js';
import { send } from './utils/ApiResponse.js';
import { setRequestProperty } from './utils/setRequestProperty.js';


const app = express();

const normalizeOrigin = (origin) => origin.trim().replace(/\/$/, '');
const allowedOrigins = (process.env.CLIENT_URL ?? '')
    .split(',')
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);
const isAnyBrowserOriginAllowed = allowedOrigins.includes('*');

const corsOptions = {
    origin(origin, callback) {
        // Native mobile apps, Postman, and server-side requests usually do not send an Origin header.
        if (!origin) {
            return callback(null, true);
        }

        const normalizedOrigin = normalizeOrigin(origin);

        if (
            isAnyBrowserOriginAllowed ||
            allowedOrigins.length === 0 ||
            allowedOrigins.includes(normalizedOrigin)
        ) {
            return callback(null, true);
        }

        return callback(error(403, `CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};


app.use(helmet());
app.use(cors(corsOptions));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 400,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { status: 'fail', message: 'Too many requests. Please try again later.' },
});

app.use(limiter);

app.use('/api/facetec', facetecRoutes);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use((req, res, next) => {
    setRequestProperty(req, 'query', req.query);
    return next();
});
app.use(mongoSanitize());

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
};


app.get('/health', (req, res) => {
    return send(res, 200, null, 'Server is healthy');
});

app.use('/api/admin', adminRoutes);

app.use((req, res, next) => {
    return next(error(404, `Route not found: ${req.originalUrl}`));
});

app.use((err, req, res, next) => {
    const apiError = ApiError.normalize(err);

    return res.status(apiError.statusCode).json({
        success: false,
        message: apiError.message,
        errors: apiError.errors,
    });
});

export default app;
