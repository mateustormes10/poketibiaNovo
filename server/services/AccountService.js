import { AccountRepository } from '../persistence/AccountRepository.js';
import { Logger } from '../utils/Logger.js';
import crypto from 'crypto';

const logger = new Logger('AccountService');

export class AccountService {
    constructor(database) {
        this.accountRepository = new AccountRepository(database);
    }
    
    async createAccount(name, password, email) {
        try {
            // Verifica se já existe
            const existing = await this.accountRepository.findByName(name);
            if (existing) {
                throw new Error('Account name already exists');
            }
            
            // Hash da senha
            const hashedPassword = this.hashPassword(password);
            
            const account = await this.accountRepository.create({
                name,
                password: hashedPassword,
                email,
                premdays: 0,
                group_id: 1
            });
            
            logger.info(`Account created: ${name}`);
            return account;
        } catch (error) {
            logger.error('Error creating account:', error.message);
            throw error;
        }
    }
    
    async authenticate(name, password) {
        try {
            const account = await this.accountRepository.findByName(name);
            
            if (!account) {
                return { success: false, message: 'Account not found' };
            }
            
            if (account.blocked) {
                return { success: false, message: 'Account is blocked' };
            }
            
            const hashedPassword = this.hashPassword(password);
            if (account.password !== hashedPassword) {
                return { success: false, message: 'Invalid password' };
            }
            
            // Atualiza último login
            await this.accountRepository.updateLastLogin(account.id);
            
            return { success: true, account };
        } catch (error) {
            logger.error('Error authenticating:', error.message);
            return { success: false, message: 'Authentication error' };
        }
    }
    
    hashPassword(password) {
        return crypto.createHash('sha256').update(password).digest('hex');
    }
    
    async banAccount(accountId, days, reason) {
        const expires = Math.floor(Date.now() / 1000) + (days * 86400);
        await this.accountRepository.ban(accountId, expires, reason);
        logger.info(`Account banned: ${accountId} for ${days} days`);
    }
    
    async unbanAccount(accountId) {
        await this.accountRepository.unban(accountId);
        logger.info(`Account unbanned: ${accountId}`);
    }
}
