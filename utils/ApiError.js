class ApiError extends Error {
    constructor(statusCode, message = 'Something went wrong', errors = []) {
        super(message);

        this.statusCode = statusCode;
        this.message = message;
        this.success = false;
        this.errors = errors;

        Error.captureStackTrace(this, this.constructor);
    };

    static create(statusCode, message = 'Something went wrong', errors = []) {
        return new ApiError(statusCode, message, errors);
    }

    static normalize(err) {
        if (err instanceof ApiError) {
            return err;
        }

        return new ApiError(
            err?.statusCode || 500,
            err?.message || 'Internal server error',
            err?.errors || []
        );
    }
};

export const error = (statusCode, message = 'Something went wrong', errors = []) =>
    ApiError.create(statusCode, message, errors);

export const fail = (statusCode, message = 'Something went wrong', errors = []) => {
    throw error(statusCode, message, errors);
};

export default ApiError;