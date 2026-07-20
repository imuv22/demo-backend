import dotenvFlow from 'dotenv-flow';

dotenvFlow.config();

import { getFaceTecConfig } from '../config/facetec.js';

try {
    const config = getFaceTecConfig();

    console.log('FaceTec configuration loaded successfully.');

    console.log({
        mode: config.mode,
        endpoint: config.testingApiEndpoint,
        deviceKeyConfigured:
            Boolean(config.deviceKeyIdentifier),
        timeoutMs: config.requestTimeoutMs,
    });
} catch (error) {
    console.error(
        'FaceTec configuration error:',
        error.message
    );

    process.exit(1);
}