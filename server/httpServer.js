// Servidor HTTP Express para autenticação e integração com menu.js
import express from 'express';
import cors from 'cors';
import { Database } from './config/database.js';
import { config as defaultConfig } from './config/serverConfig.js';
import { AccountService } from './services/AccountService.js';
import { Logger } from './utils/Logger.js';

const logger = new Logger('HTTP');

function createAuthMiddleware() {
    return function authMiddleware(req, res, next) {
        const auth = req.headers['authorization'];
        if (!auth) return res.status(401).json({ success: false, message: 'No token' });
        const token = String(auth).replace('Bearer ', '');
        req.userId = Number.parseInt(token, 10);
        if (Number.isNaN(req.userId)) return res.status(401).json({ success: false, message: 'Invalid token' });
        next();
    };
}

export async function startHttpServer({ database, config } = {}) {
    const cfg = config ?? defaultConfig;
    let ownDatabase = false;
    let db = database;
    if (!db) {
        ownDatabase = true;
        db = new Database(cfg.database);
        await db.connect();
    }

    const app = express();
    app.use(cors());
    app.use(express.json());

    const accountService = new AccountService(db);
    const authMiddleware = createAuthMiddleware();

    // Registro
    app.post('/auth/register', async (req, res) => {
        const { username, password, email } = req.body || {};
        try {
            const result = await accountService.createAccount(username, password, email);
            if (result) {
                res.json({ success: true });
                return;
            }
            res.status(400).json({ success: false, message: 'Erro ao criar conta' });
        } catch (err) {
            res.status(500).json({ success: false, message: err?.message || 'Internal error' });
        }
    });

    // Login
    app.post('/auth/login', async (req, res) => {
        const { username, password } = req.body || {};
        try {
            const result = await accountService.authenticate(username, password);
            if (result.success) {
                res.json({ token: result.account.id, account: result.account });
                return;
            }
            res.status(401).json({ success: false, message: result.message });
        } catch (err) {
            res.status(500).json({ success: false, message: err?.message || 'Internal error' });
        }
    });

    // Buscar personagens do usuário
    app.get('/player/me', authMiddleware, async (req, res) => {
        try {
            const characters = await accountService.getCharacters(req.userId);
            res.json({ success: true, characters });
        } catch (err) {
            res.status(500).json({ success: false, message: err?.message || 'Internal error' });
        }
    });

    // Criar personagem
    app.post('/player/create', authMiddleware, async (req, res) => {
        const { name } = req.body || {};
        try {
            const result = await accountService.createCharacter(req.userId, name);
            res.status(result.success ? 200 : 400).json(result);
        } catch (err) {
            res.status(500).json({ success: false, message: err?.message || 'Internal error' });
        }
    });

    const port = cfg.httpPort ?? 3001;
    const server = app.listen(port, () => {
        logger.info(`API server running on port ${port}`);
    });

    return {
        app,
        server,
        stop: async () => {
            await new Promise((resolve) => server.close(resolve));
            logger.info('HTTP server stopped');
            if (ownDatabase) {
                await db.disconnect();
            }
        }
    };
}

