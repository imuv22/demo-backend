import { getFaceTecConfig } from '../config/facetec.js';

export class FaceTecServiceError extends Error {
    constructor(message, options = {}) {
        super(message);

        this.name = 'FaceTecServiceError';
        this.statusCode = options.statusCode || 502;
        this.details = options.details || null;
    }
}

const parseJsonResponse = (responseText) => {
    try {
        return JSON.parse(responseText);
    } catch {
        return null;
    }
};

/**
 * Forwards an encrypted FaceTec session request blob
 * to the FaceTec Testing API.
 *
 * This service is not connected to an Express route yet.
 */
export const processFaceTecSessionRequest = async ({
    requestBlob,
    externalDatabaseRefID = '',
    testingApiHeader,
}) => {
    if (
        typeof requestBlob !== 'string' ||
        !requestBlob.trim()
    ) {
        throw new FaceTecServiceError(
            'FaceTec requestBlob is required.',
            {
                statusCode: 400,
            }
        );
    }

    if (
        typeof testingApiHeader !== 'string' ||
        !testingApiHeader.trim()
    ) {
        throw new FaceTecServiceError(
            'FaceTec Testing API header is required.',
            {
                statusCode: 400,
            }
        );
    }

    const config = getFaceTecConfig();

    const payload = {
        requestBlob,
    };

    if (
        typeof externalDatabaseRefID === 'string' &&
        externalDatabaseRefID.trim()
    ) {
        payload.externalDatabaseRefID =
            externalDatabaseRefID.trim();
    }

    const abortController = new AbortController();

    const timeoutId = setTimeout(() => {
        abortController.abort();
    }, config.requestTimeoutMs);

    try {
        const response = await fetch(
            config.testingApiEndpoint,
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json',

                    'X-Device-Key':
                        config.deviceKeyIdentifier,

                    'X-Testing-API-Header':
                        testingApiHeader,
                },

                body: JSON.stringify(payload),
                signal: abortController.signal,
            }
        );

        const responseText = await response.text();

        const responseData =
            parseJsonResponse(responseText);

        if (!response.ok) {
            throw new FaceTecServiceError(
                `FaceTec returned HTTP ${response.status}.`,
                {
                    details:
                        responseData || responseText,
                }
            );
        }

        if (
            typeof responseData?.responseBlob !==
            'string' ||
            !responseData.responseBlob
        ) {
            throw new FaceTecServiceError(
                'FaceTec response did not contain a responseBlob.',
                {
                    details: responseData,
                }
            );
        }

        return {
            responseBlob: responseData.responseBlob,
            result: responseData.result || null,
        };
    } catch (error) {
        if (error instanceof FaceTecServiceError) {
            throw error;
        }

        if (error?.name === 'AbortError') {
            throw new FaceTecServiceError(
                'FaceTec request timed out.'
            );
        }

        throw new FaceTecServiceError(
            'Unable to communicate with FaceTec.',
            {
                details: error?.message || String(error),
            }
        );
    } finally {
        clearTimeout(timeoutId);
    }
};