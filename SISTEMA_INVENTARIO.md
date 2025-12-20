# Sistema de Inventário - Pokémon RPG

## Visão Geral

Sistema completo de inventário estilo RPG Pokémon moderno, com interface visual, persistência em banco de dados e controle 100% pelo servidor.

## Características Principais

✅ **Interface Visual Moderna**
- Grade de 40 slots (5 colunas x 8 linhas)
- Painel de detalhes do item selecionado
- Hover effects e feedback visual
- Design responsivo e centralizado

✅ **Controle pelo Servidor**
- Toda lógica de inventário no servidor
- Cliente apenas renderiza e envia intenções
- Validação e segurança totais

✅ **Persistência em Banco**
- Tabela `player_inventory` com dados completos
- Suporte a tipos de itens (consumível, batalha, key, misc)
- Quantidade rastreada por item

✅ **Sistema de Itens**
- Definições de itens com efeitos
- Poções (cura de HP)
- Pokébolas (captura - preparado para futuro)
- Itens-chave e diversos

## Como Usar

### Abrindo o Inventário

**Tecla:** `I`
- Pressione `I` para abrir
- Pressione `I` ou `ESC` para fechar

### Interagindo com Itens

1. **Selecionar Item**: Clique em um slot com item
2. **Ver Detalhes**: Painel à direita mostra informações
3. **Usar Item**: Clique no botão "Usar" no painel de detalhes

### Comportamento

- ✅ Bloqueia movimentação do player quando aberto
- ✅ Permite interação apenas com UI
- ✅ Atualização em tempo real ao receber/usar itens

## Arquitetura

### Banco de Dados

```sql
CREATE TABLE player_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    item_type VARCHAR(50) NOT NULL DEFAULT 'consumable',
    item_name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    slot_order INT NOT NULL DEFAULT 0,
    created_at INT NOT NULL DEFAULT UNIX_TIMESTAMP(),
    updated_at INT NOT NULL DEFAULT UNIX_TIMESTAMP() ON UPDATE UNIX_TIMESTAMP(),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);
```

### Server

**Arquivos:**
- `server/persistence/InventoryRepository.js` - Acesso ao banco
- `server/services/InventoryService.js` - Lógica de negócio
- `server/handlers/inventoryHandler.js` - Processamento de requisições
- `server/network/messageRouter.js` - Roteamento de mensagens

**Métodos Principais:**
```javascript
// InventoryRepository
getInventory(playerId)          // Busca inventário
addItem(playerId, type, name, quantity)   // Adiciona item
removeItem(playerId, name, quantity)      // Remove item
hasItem(playerId, name, quantity)         // Verifica posse

// InventoryService
getPlayerInventory(playerId)    // Inventário formatado
useItem(playerId, itemName, context)  // Usa item
giveItem(playerId, itemName, quantity) // Dá item ao player
```

### Shared

**Arquivos:**
- `shared/dto/InventoryDTO.js` - Estrutura de dados padronizada
- `shared/protocol/InventoryProtocol.js` - Constantes de protocolo

**Eventos do Protocolo:**

Cliente → Servidor:
- `inventory_request` - Solicita inventário
- `inventory_use_item` - Usa um item
- `inventory_drop_item` - Dropa item (futuro)

Servidor → Cliente:
- `inventory_data` - Dados completos do inventário
- `inventory_update` - Atualização do inventário
- `item_used` - Confirmação de uso
- `item_added` - Notificação de item adicionado
- `inventory_error` - Erro ocorrido

### Client

**Arquivos:**
- `client/render/UI/InventoryUI.js` - Renderização visual
- `client/managers/InventoryManager.js` - Gerenciamento de estado
- `client/core/Game.js` - Integração com game loop
- `client/network/ProtocolHandler.js` - Processamento de mensagens

## Tipos de Itens

### Consumíveis (consumable)
- **Poção**: Restaura 20 HP
- **Super Poção**: Restaura 50 HP
- **Hyper Poção**: Restaura 200 HP
- **Revive**: Revive Pokémon com 50% HP

### Batalha (battle)
- **Pokébola**: Captura básica
- **Great Ball**: Captura melhorada (1.5x)
- **Ultra Ball**: Captura avançada (2.0x)

### Diversos (misc)
- **Gold Coin**: Moeda do jogo

### Itens-Chave (key)
- Para implementações futuras

## Adicionando Novos Itens

### 1. Definir o Item

Em `server/services/InventoryService.js`:

```javascript
export const ItemDefinitions = {
    'Novo Item': {
        type: ItemType.CONSUMABLE,
        description: 'Descrição do item.',
        effect: 'heal', // ou 'revive', 'capture', 'none'
        value: 50
    }
};
```

### 2. Adicionar ao Inventário do Player

```javascript
// Via código no servidor
await inventoryRepository.addItem(playerId, 'consumable', 'Novo Item', 5);

// Ou via InventoryService
await inventoryService.giveItem(playerId, 'Novo Item', 5);
```

### 3. Implementar Efeito (se necessário)

Em `InventoryService.useItem()`, adicione lógica para novos tipos de efeitos.

## Integração com NPCs

NPCs podem dar itens aos players:

```javascript
// No npcHandler ou similar
const result = await inventoryHandler.addItemToPlayer(playerId, 'Poção', 3);

if (result.success) {
    console.log('Player recebeu 3 poções!');
}
```

## Comandos GM Úteis

Futuramente, podem ser adicionados comandos:
- `/giveitem <player> <item> <quantity>` - Dar item
- `/clearinventory <player>` - Limpar inventário
- `/listinventory <player>` - Listar inventário

## Segurança

✅ **Cliente NÃO pode:**
- Criar itens
- Alterar quantidades
- Modificar tipos
- Bypassar validações

✅ **Servidor valida:**
- Posse do item antes de usar
- Quantidade suficiente
- Contexto de uso válido
- Limite de slots (40)

## Performance

- Inventário carregado sob demanda (ao pressionar I)
- Atualização apenas quando necessário
- Queries otimizadas com índices

## Próximos Passos

### Melhorias Planejadas

1. **Sistema de Drop**
   - Dropar itens no chão
   - Outros players podem coletar

2. **Arrastar e Soltar**
   - Reorganizar itens na grade
   - Mover entre slots

3. **Categorias/Abas**
   - Separar visualmente por tipo
   - Filtros de busca

4. **Efeitos Visuais**
   - Sprites de itens
   - Animações ao usar
   - Partículas de feedback

5. **Sistema de Trade**
   - Trocar itens entre players
   - Interface de negociação

6. **Stacking Inteligente**
   - Auto-organização
   - Compactação de espaço

## Testes

### Como Testar

1. **Adicionar Itens Manualmente:**
```sql
INSERT INTO player_inventory (player_id, item_type, item_name, quantity)
VALUES (1, 'consumable', 'Poção', 10);
```

2. **Abrir o Jogo:**
   - Faça login como player
   - Pressione `I`
   - Veja os itens

3. **Usar Item:**
   - Clique no item
   - Clique em "Usar"
   - Observe feedback

### Casos de Teste

- ✅ Abrir/fechar inventário
- ✅ Selecionar itens
- ✅ Usar itens
- ✅ Receber itens de NPCs
- ✅ Inventário vazio
- ✅ Inventário cheio (40 slots)
- ✅ Itens com quantidade > 1
- ✅ Usar último item (remove da grade)

## Troubleshooting

### Inventário não abre?
- Verifique console do navegador
- Confirme que player está logado
- Verifique conexão WebSocket

### Itens não aparecem?
- Verifique tabela `player_inventory`
- Confirme player_id correto
- Veja logs do servidor

### Uso de item não funciona?
- Verifique definição do item em `ItemDefinitions`
- Confirme efeito implementado
- Veja mensagens de erro no console

## Changelog

### v1.0.0 (2024-12-20)
- ✅ Sistema completo implementado
- ✅ UI de grade 5x8
- ✅ Persistência em banco
- ✅ Tipos de itens: consumível, batalha, misc, key
- ✅ Uso de itens com validação
- ✅ Integração com Game.js
- ✅ Bloqueio de movimento quando aberto
- ✅ Painel de detalhes
- ✅ Feedback visual (hover, seleção)

## Licença

Parte do projeto Pokémon RPG - Todos os direitos reservados.
