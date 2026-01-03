// Protocolo de scanner para o client
export const ClientEvents = {
    ...window.ClientEvents,
    SCAN: 'scan'
};
export const ServerEvents = {
    ...window.ServerEvents,
    SCAN_RESULT: 'scanResult'
};
