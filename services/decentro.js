import { error } from '../utils/ApiError.js';

const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

const getDecentroBaseUrl = () =>
    trimTrailingSlash(process.env.DECENTRO_BASE_URL || 'https://in.staging.decentro.tech');

const getDecentroHeaders = () => ({
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': 'VerificationApp/1.0',
    client_id: process.env.DECENTRO_CLIENT_ID,
    client_secret: process.env.DECENTRO_CLIENT_SECRET,
    module_secret: process.env.DECENTRO_MODULE_SECRET,
});

const getSafePreview = (text) => text.replace(/\s+/g, ' ').trim().slice(0, 180);

const parseJsonResponse = async (response) => {
    const text = await response.text();
    const contentType = response.headers.get('content-type') || '';

    if (!text) {
        if (!response.ok) {
            throw error(
                502,
                `Decentro returned HTTP ${response.status} with an empty response`,
                [
                    {
                        field: 'decentro',
                        message: 'Check Decentro credentials, IP allowlisting, and active video liveness access.',
                    },
                ]
            );
        }

        return null;
    }

    try {
        return JSON.parse(text);
    } catch {
        if (process.env.NODE_ENV === 'development') {
            console.warn('Decentro non-JSON response', {
                status: response.status,
                contentType,
                preview: getSafePreview(text),
            });
        }

        const authHint = [401, 403].includes(response.status)
            ? ' Check Decentro credentials, IP allowlisting, and active video liveness access.'
            : '';

        throw error(
            502,
            `Decentro returned HTTP ${response.status} (${contentType || 'unknown content type'}) instead of JSON.${authHint}`,
            [
                {
                    field: 'decentro',
                    message: getSafePreview(text) || 'No response body',
                },
            ]
        );
    }
};

const postToDecentro = async (path, payload) => {
    let response;

    try {
        response = await fetch(`${getDecentroBaseUrl()}${path}`, {
            method: 'POST',
            headers: getDecentroHeaders(),
            body: JSON.stringify(payload),
        });
    } catch {
        throw error(502, 'Unable to reach Decentro');
    }

    const body = await parseJsonResponse(response);

    return {
        ok: response.ok,
        statusCode: response.status,
        body,
    };
};

export const initiateActiveVideoLiveness = (payload) =>
    postToDecentro('/v2/kyc/forensics/active_video_liveness/initiate', payload);

export const getActiveVideoLivenessData = (decentroTxnId, payload) =>
    postToDecentro(`/v2/kyc/forensics/active_video_liveness/${decentroTxnId}`, payload);
