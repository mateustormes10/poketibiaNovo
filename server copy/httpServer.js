// Servidor HTTP Express para autenticação e integração com menu.js
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { Database } from './config/database.js';
import { config } from './config/serverConfig.js';
import { AccountService } from './services/AccountService.js';

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Inicializa banco de dados
const database = new Database(config.database);
await database.connect();
const accountService = new AccountService(database);

// Registro
app.post('/auth/register', async (req, res) => {
    const { username, password, email } = req.body;
    try {
        // O método correto é createAccount, e o campo é name
        const result = await accountService.createAccount(username, password, email);
        if (result) {
            res.json({ success: true });
        } else {
            res.status(400).json({ success: false, message: 'Erro ao criar conta' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Login
app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        // O método correto é authenticate, e o campo é name
        const result = await accountService.authenticate(username, password);
        if (result.success) {
            // Simples: retorna token fake e dados da conta
            res.json({ token: result.account.id, account: result.account });
        } else {
            res.status(401).json({ success: false, message: result.message });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Middleware de autenticação simples (token = userId)
function authMiddleware(req, res, next) {
    const auth = req.headers['authorization'];
    if (!auth) return res.status(401).json({ success: false, message: 'No token' });
    const token = auth.replace('Bearer ', '');
    req.userId = parseInt(token, 10);
    if (isNaN(req.userId)) return res.status(401).json({ success: false, message: 'Invalid token' });
    next();
}

// Buscar personagens do usuário
app.get('/player/me', authMiddleware, async (req, res) => {
    try {
        const characters = await accountService.getCharacters(req.userId);
        res.json({ success: true, characters });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Criar personagem
app.post('/player/create', authMiddleware, async (req, res) => {
    const { name } = req.body;
    try {
        const result = await accountService.createCharacter(req.userId, name);
        res.status(result.success ? 200 : 400).json(result);
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`[HTTP] API server running on port ${PORT}`);
});
