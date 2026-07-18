import { error } from '../utils/ApiError.js';
import { setRequestProperty } from '../utils/setRequestProperty.js';

const formatIssues = (issues) =>
    issues.map((issue) => ({
        field: issue.path.join('.') || 'request',
        message: issue.message,
    }));

const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse({
        body: req.body,
        params: req.params,
        query: req.query,
    });

    if (!result.success) {
        return next(error(400, 'Validation failed', formatIssues(result.error.issues)));
    }

    if (result.data.body !== undefined) {
        setRequestProperty(req, 'body', result.data.body);
    }

    if (result.data.params !== undefined) {
        setRequestProperty(req, 'params', result.data.params);
    }

    if (result.data.query !== undefined) {
        setRequestProperty(req, 'query', result.data.query);
    }

    return next();
};

export default validate;