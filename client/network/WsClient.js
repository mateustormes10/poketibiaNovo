export class WsClient {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.connected = false;
        this.handlers = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }
    
    async connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.url);
                
                this.ws.onopen = () => {
                    console.log('Connected to server');
                    this.connected = true;
                    this.reconnectAttempts = 0;
                    resolve();
                };
                
                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };
                
                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    reject(error);
                };
                
                this.ws.onclose = () => {
                    console.log('Disconnected from server');
                    this.connected = false;
                    this.attemptReconnect();
                };
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            const handler = this.handlers.get(message.type);
            
            if (handler) {
                handler(message.data);
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }
    
    send(type, data) {
        if (!this.connected) {
            console.warn('Cannot send message: not connected');
            return;
        }
        
        console.log(`[WsClient] Sending message: ${type}`, data);
        const message = JSON.stringify({ type, data });
        this.ws.send(message);
    }
    
    on(eventType, handler) {
        this.handlers.set(eventType, handler);
    }
    
    off(eventType) {
        this.handlers.delete(eventType);
    }
    
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnect attempts reached');
            return;
        }
        
        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        
        console.log(`Attempting to reconnect in ${delay}ms...`);
        setTimeout(() => this.connect(), delay);
    }
    
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
    }
}
