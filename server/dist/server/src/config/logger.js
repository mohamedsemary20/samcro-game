function write(level, event, context = {}) {
    const line = JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...context });
    if (level === 'error')
        console.error(line);
    else if (level === 'warn')
        console.warn(line);
    else
        console.log(line);
}
export const logger = {
    info: (event, context) => write('info', event, context),
    warn: (event, context) => write('warn', event, context),
    error: (event, context) => write('error', event, context),
};
