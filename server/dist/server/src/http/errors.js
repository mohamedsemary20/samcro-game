export class HttpError extends Error {
    status;
    code;
    constructor(status, code, message) {
        super(message);
        this.status = status;
        this.code = code;
        this.name = 'HttpError';
    }
}
export function assertOrigin(origin, allowed) {
    if (!origin || !allowed.has(origin))
        throw new HttpError(403, 'UNTRUSTED_ORIGIN', 'Request origin is not trusted.');
}
