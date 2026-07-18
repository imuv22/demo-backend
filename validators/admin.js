import { z } from 'zod';

const authPassword = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password cannot exceed 72 characters');

export const signupSchema = z.object({
    body: z
        .object({
            name: z
                .string()
                .trim()
                .min(2, 'Name must be at least 2 characters')
                .max(80, 'Name cannot exceed 80 characters'),
            email: z.string().trim().toLowerCase().email('Enter a valid email address'),
            password: authPassword,
        })
        .strict(),
});

export const loginSchema = z.object({
    body: z
        .object({
            email: z.string().trim().toLowerCase().email('Enter a valid email address'),
            password: z.string().min(1, 'Password is required'),
        })
        .strict(),
});
