export const setRequestProperty = (req, key, value) => {
    if (key === 'query') {
        // Express 5 exposes req.query as a getter-only property, so we
        // shadow it on the request instance before normalizing it.
        Object.defineProperty(req, key, {
            configurable: true,
            enumerable: true,
            writable: true,
            value,
        });

        return;
    }

    req[key] = value;
};

export default setRequestProperty;