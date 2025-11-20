// src/debug.ts
type LogType = 'render' | 'action' | 'api' | 'state' | 'warn' | 'error';

const log = (type: LogType, component: string, message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}] [${type.toUpperCase()}] ${component}:`;
    
    switch (type) {
        case 'error':
            console.error(prefix, message, data);
            break;
        case 'warn':
            console.warn(prefix, message, data);
            break;
        default:
            console.log(prefix, message, data);
    }
};

export const debugLog = {
    render: (component: string, message: string, data?: any) => log('render', component, message, data),
    action: (component: string, message: string, data?: any) => log('action', component, message, data),
    api: (component: string, message: string, data?: any) => log('api', component, message, data),
    state: (component: string, message: string, data?: any) => log('state', component, message, data),
    warn: (component: string, message: string, data?: any) => log('warn', component, message, data),
    error: (component: string, message: string, data?: any) => log('error', component, message, data),
};
