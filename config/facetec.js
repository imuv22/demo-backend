const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;
const DEFAULT_PROFILE_PICTURE_MIN_MATCH_LEVEL = 5;

const getPositiveInteger = (value, fallback) => {
    const parsedValue = Number(value);

    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
        return fallback;
    }

    return parsedValue;
};

const getIntegerInRange = (value, fallback, min, max) => {
    const parsedValue = getPositiveInteger(value, fallback);

    if (parsedValue < min || parsedValue > max) {
        return fallback;
    }

    return parsedValue;
};

const getTestingApiBaseUrl = (testingApiEndpoint) => {
    if (
        typeof testingApiEndpoint !== 'string' ||
        !/\/process-request\/?$/.test(testingApiEndpoint)
    ) {
        return '';
    }

    return testingApiEndpoint.replace(
        /\/process-request\/?$/,
        ''
    );
};

export const getFaceTecConfig = () => {
    const mode = process.env.FACETEC_MODE || 'testing';

    const deviceKeyIdentifier =
        process.env.FACETEC_DEVICE_KEY_IDENTIFIER;

    const testingApiEndpoint =
        process.env.FACETEC_TESTING_API_ENDPOINT;

    const requestTimeoutMs = getPositiveInteger(
        process.env.FACETEC_REQUEST_TIMEOUT_MS,
        DEFAULT_REQUEST_TIMEOUT_MS
    );

    const profilePictureMinMatchLevel = getIntegerInRange(
        process.env.FACETEC_PROFILE_PICTURE_MIN_MATCH_LEVEL,
        DEFAULT_PROFILE_PICTURE_MIN_MATCH_LEVEL,
        1,
        6
    );

    if (!['testing', 'production'].includes(mode)) {
        throw new Error(
            'FACETEC_MODE must be either "testing" or "production".'
        );
    }

    if (mode === 'testing') {
        const missingVariables = [];

        if (!deviceKeyIdentifier) {
            missingVariables.push(
                'FACETEC_DEVICE_KEY_IDENTIFIER'
            );
        }

        if (!testingApiEndpoint) {
            missingVariables.push(
                'FACETEC_TESTING_API_ENDPOINT'
            );
        }

        if (missingVariables.length > 0) {
            throw new Error(
                `Missing FaceTec environment variables: ${missingVariables.join(
                    ', '
                )}`
            );
        }

        if (!getTestingApiBaseUrl(testingApiEndpoint)) {
            throw new Error(
                'FACETEC_TESTING_API_ENDPOINT must end with "/process-request".'
            );
        }
    }

    if (mode === 'production') {
        throw new Error(
            'FaceTec production configuration is not available until your FaceTec Server and Server Key Identifier are issued.'
        );
    }

    return Object.freeze({
        mode,
        deviceKeyIdentifier,
        testingApiEndpoint,
        testingApiBaseUrl:
            getTestingApiBaseUrl(testingApiEndpoint),
        profilePictureMinMatchLevel,
        requestTimeoutMs,
    });
};
