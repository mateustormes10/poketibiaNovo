# Servidor PokeTibia

## Como iniciar o servidor

1. **Pré-requisitos:**
   - Node.js instalado (versão 16+ recomendada)
   - Banco de dados MySQL rodando (veja config em `config/database.js`)
   - Instale as dependências (se houver `package.json`):
     ```
     npm install
     ```

2. **Inicie o servidor:**
   - No terminal, acesse a pasta `server`:
     ```
     cd server
     ```
   - Inicie o servidor:
     ```
     node index.js
     ```
   - Você verá logs como:
     ```
     [INFO] Starting PokeTibia Server...
     WebSocket server started on port 3000
     Server running on port 3000
     Tick rate: 10 ticks/second
     ```

3. **Conecte o cliente:**
   - O cliente web (em `/client`) deve estar configurado para conectar no mesmo endereço/porta do servidor.

---

## Como funciona o servidor

- **WebSocket:**
  - O servidor usa WebSocket para comunicação em tempo real com os clientes (jogadores).
  - Cada jogador conecta, faz login e envia comandos (movimento, chat, etc).

- **Tick Rate:**
  - O loop principal (`GameLoop.js`) roda a cada X ms (configurável em `config/serverConfig.js`), processando lógica do jogo e enviando atualizações.

- **Gerenciamento de jogadores:**
  - Cada conexão é um jogador. O servidor mantém o estado de todos os jogadores conectados.
  - Usa spatial grid para otimizar busca de entidades próximas.

- **Atualizações e eventos:**
  - O servidor envia apenas eventos/deltas relevantes para cada jogador (ex: movimento de outros players, spawn de pokémons, chat).
  - O mapa é enviado apenas quando necessário (login, troca de andar, solicitação manual).

- **Banco de dados:**
  - Usa MySQL para persistir contas, inventário, pokémons, etc.
  - Configuração em `config/database.js`.

- **Logs:**
  - O servidor mostra logs detalhados de conexões, comandos, performance e erros no terminal.

---

## Dicas
- Monitore o uso de CPU/memória durante testes de carga.
- Ajuste o `tickRate` em `config/serverConfig.js` para balancear performance e responsividade.
- Use os scripts de teste em `/teste` para validar a escalabilidade do servidor.
- Para produção, considere usar PM2 ou Docker para gerenciar o processo Node.js.

---

Qualquer dúvida, consulte os arquivos de configuração ou peça ajuda!
