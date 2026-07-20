import dotenvFlow from 'dotenv-flow';

dotenvFlow.config();

if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'production') {
    process.env.JWT_SECRET = 'verifydesk-development-secret';
}

const firstClientUrl = process.env.CLIENT_URL
    ?.split(',')
    .map((origin) => origin.trim())
    .find(Boolean);

if (!process.env.FRONTEND_URL && firstClientUrl) {
    process.env.FRONTEND_URL = firstClientUrl;
}

if (!process.env.BACKEND_URL && process.env.PORT) {
    process.env.BACKEND_URL = `http://localhost:${process.env.PORT}`;
}

const requiredEnvVariables = [
    'PORT',
    'DB_URL',
    'JWT_SECRET',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
];

requiredEnvVariables.forEach((key) => {
    if (!process.env[key]) {
        throw new Error(`${key} is missing in environment variables`);
    }
});
