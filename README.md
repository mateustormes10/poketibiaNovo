# PokeTibia

Um jogo 2D multiplayer estilo Tibia/Pokémon com arquitetura cliente-servidor autoritativa.

## Arquitetura

```
/game-project
│
├── client/        → Frontend (renderização + input)
├── server/        → Backend (lógica + WebSocket + DB)
├── shared/        → Contratos compartilhados
└── assets/        → Recursos estáticos
```

## Princípios

- **Backend autoritativo**: Servidor decide todo o estado final
- **Cliente apenas renderiza**: Sem lógica de jogo no client
- **WebSocket para comunicação**: Canal de estado em tempo real
- **Mapas centralizados**: Servidor controla colisões e movimento

## Client (Frontend)

Estrutura do cliente:

```
client/
├── core/          → Loop principal, estado, câmera
├── network/       → WebSocket client
├── input/         → Teclado e mouse
├── render/        → Renderização de tiles, sprites e UI
├── entities/      → Representações locais de entidades
├── map/           → Sistema de mapa local
├── animation/     → Animações e sprites
├── utils/         → Utilitários
└── config/        → Configurações
```

### Responsabilidades:
- Renderizar o jogo
- Capturar input do usuário
- Enviar comandos ao servidor
- Exibir estado recebido do servidor

## Server (Backend)

Estrutura do servidor:

```
server/
├── config/        → Configurações e database
├── network/       → WebSocket server
├── game/          → Mundo do jogo e sistemas
│   ├── systems/   → Movimento, colisão, visão, combate
│   ├── entities/  → Player, NPC, Monster
│   ├── map/       → Gerenciamento de mapas
│   └── zones/     → Áreas do jogo
├── handlers/      → Handlers de mensagens do client
├── persistence/   → Repositórios de dados
├── services/      → Serviços (save, respawn, etc)
└── utils/         → Utilitários
```

### Responsabilidades:
- Estado global do jogo
- Validação de movimentos
- Colisões
- Sistema de visão
- Combate
- Persistência de dados

## Shared (Contratos)

Estrutura compartilhada:

```
shared/
├── protocol/      → Eventos cliente/servidor
├── dto/           → Data Transfer Objects
├── enums/         → Enumerações (direções, tipos)
└── constants/     → Constantes do jogo
```

## Como Executar

### Servidor

```bash
cd server
npm install
npm start
```

### Cliente

Abra o arquivo `client/index.html` em um navegador moderno ou use um servidor HTTP local:

```bash
cd client
python -m http.server 8000
# ou
npx serve
```

Acesse: http://localhost:8000

## Tecnologias

- **Frontend**: JavaScript ES6+ Modules, Canvas API
- **Backend**: Node.js, WebSocket (ws)
- **Protocolo**: JSON sobre WebSocket
- **Persistência**: (A implementar: MySQL/PostgreSQL)

## Desenvolvimento

O projeto segue uma arquitetura desacoplada onde:

1. Cliente envia **intenções** (ex: "quero mover para cima")
2. Servidor **valida** e **executa** (verifica colisão, move)
3. Servidor envia **estado atualizado** para clientes relevantes
4. Cliente **renderiza** o novo estado

Nunca confie no cliente para decisões de jogo!
