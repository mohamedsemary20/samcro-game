export function asyncRoute(handler) {
    return (request, response, next) => {
        void handler(request, response).catch(next);
    };
}
