import { z } from 'zod';

export const processFaceTecSessionRequestSchema = z.object({
    body: z
        .object({
            requestBlob: z
                .string()
                .min(1, 'FaceTec requestBlob is required'),
            externalDatabaseRefID: z
                .string()
                .trim()
                .optional()
                .default(''),
            testingApiHeader: z
                .string()
                .min(1, 'FaceTec Testing API header is required'),
        })
        .strict(),
});

export const completeProfilePictureVerificationSchema = z.object({
    body: z
        .object({
            externalDatabaseRefID: z
                .string()
                .trim()
                .min(1, 'externalDatabaseRefID is required'),
        })
        .strict(),
});
