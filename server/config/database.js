import mysql from 'mysql2/promise';
import { Logger } from '../utils/Logger.js';

const logger = new Logger('Database');

export class Database {
    constructor(config) {
        this.config = config;
        this.pool = null;
        this.connected = false;
    }
    
    async connect() {
        try {
            this.pool = mysql.createPool({
                host: this.config.host,
                port: this.config.port,
                user: this.config.user,
                password: this.config.password,
                database: this.config.database,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0,
                enableKeepAlive: true,
                keepAliveInitialDelay: 0
            });
            
            // Testa conexão
            const connection = await this.pool.getConnection();
            logger.info(`Database connected: ${this.config.database}@${this.config.host}`);
            connection.release();
            
            this.connected = true;
        } catch (error) {
            logger.error('Failed to connect to database:', error.message);
            throw error;
        }
    }
    
    async disconnect() {
        if (this.pool) {
            await this.pool.end();
            this.connected = false;
            logger.info('Database disconnected');
        }
    }
    
    async query(sql, params = []) {
        try {
            const [rows] = await this.pool.execute(sql, params);
            return rows;
        } catch (error) {
            logger.error('Query error:', error.message);
            throw error;
        }
    }
    
    async queryOne(sql, params = []) {
        const rows = await this.query(sql, params);
        return rows[0] || null;
    }
    
    async insert(sql, params = []) {
        try {
            const [result] = await this.pool.execute(sql, params);
            return result.insertId;
        } catch (error) {
            logger.error('Insert error:', error.message);
            throw error;
        }
    }
    
    async update(sql, params = []) {
        try {
            const [result] = await this.pool.execute(sql, params);
            return result.affectedRows;
        } catch (error) {
            logger.error('Update error:', error.message);
            throw error;
        }
    }
    
    async delete(sql, params = []) {
        try {
            const [result] = await this.pool.execute(sql, params);
            return result.affectedRows;
        } catch (error) {
            logger.error('Delete error:', error.message);
            throw error;
        }
    }
}
