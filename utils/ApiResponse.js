class ApiResponse {
    constructor(statusCode, data, message = 'Success') {
        this.statusCode = statusCode;
        this.success = statusCode < 400;
        this.message = message;
        this.data = data;
    };

    static create(statusCode, data, message = 'Success') {
        return new ApiResponse(statusCode, data, message);
    }
};

export const send = (res, statusCode, data, message = 'Success') =>
    res.status(statusCode).json(ApiResponse.create(statusCode, data, message));

export default ApiResponse;
