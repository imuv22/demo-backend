import dotenvFlow from 'dotenv-flow';

dotenvFlow.config();

if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'production') {
    process.env.JWT_SECRET = 'verifydesk-development-secret';
}

if (!process.env.DECENTRO_BASE_URL) {
    process.env.DECENTRO_BASE_URL = 'https://in.staging.decentro.tech';
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
    'DECENTRO_CLIENT_ID',
    'DECENTRO_CLIENT_SECRET',
    'DECENTRO_MODULE_SECRET',
    'FRONTEND_URL',
    'BACKEND_URL',
];

requiredEnvVariables.forEach((key) => {
    if (!process.env[key]) {
        throw new Error(`${key} is missing in environment variables`);
    }
});
