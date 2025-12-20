# Comandos GM/ADM - PokeTibia

## 📋 Comandos Disponíveis

### 💰 Sistema de Economia

#### /add goldcoin
Adiciona gold coins ao saldo de um jogador.

**Sintaxe:**
```
/add goldcoin(quantidade) player(player_id)
```

**Exemplos:**
```
/add goldcoin(100) player(1)
/add goldcoin(500) player(2)
/add goldcoin(1000) player(1)
```

**Parâmetros:**
- `quantidade` - Número de gold coins a adicionar (valor numérico)
- `player_id` - ID do jogador no banco de dados (tabela `players`)

**Notas:**
- O comando é executado no chat do jogo
- O jogador receberá uma notificação de saldo atualizado
- O saldo é atualizado em tempo real no HUD

---

## 🎮 Sistema de NPCs

### NPCs Disponíveis

#### Vendedor
- **Localização:** x=10, y=15, z=3
- **Tipo:** Loja (shop)
- **Função:** Vende itens para jogadores
- **Interação:** Pressione `E` próximo ao NPC

**Itens à Venda:**
| Item | Tipo | Preço |
|------|------|-------|
| Poção | potion | 10 gold |
| Pokéball | pokeball | 25 gold |

#### Enfermeira
- **Localização:** x=12, y=15, z=3
- **Tipo:** Cura (heal)
- **Função:** Restaura HP de todos os Pokémon do jogador
- **Interação:** Pressione `E` próximo ao NPC
- **Custo:** Gratuito

---

## 🎯 Controles do Jogo

### Movimento
- **Setas** ou **WASD** - Mover o personagem
- **Mouse** - Clique para mover (se implementado)

### Chat
- **Enter** - Ativar/Enviar mensagem no chat
- **ESC** - Cancelar digitação no chat

### Interação
- **E** - Interagir com NPC próximo (funciona apenas quando chat não está ativo)

### UI
- **F2** - Alternar modo de edição de UI (para desenvolvimento)

### Navegação em Diálogos NPC
- **↑/↓** ou **W/S** - Navegar pelos itens da loja
- **Enter** - Confirmar compra
- **ESC** - Fechar diálogo

---

## 📊 Sistema de Database

### Tabelas Relacionadas

#### `balance`
Armazena o saldo de gold coins dos jogadores.
```sql
SELECT player_id, gold_coin FROM balance;
```

#### `npcs`
Lista de todos os NPCs do jogo.
```sql
SELECT id, name, type, x, y, z FROM npcs;
```

#### `npc_shop_items`
Itens disponíveis nas lojas dos NPCs.
```sql
SELECT npc_id, item_name, item_type, price FROM npc_shop_items;
```

#### `player_inventory`
Inventário dos jogadores.
```sql
SELECT player_id, item_type, item_name, quantity FROM player_inventory WHERE player_id = 1;
```

---

## 🔧 Comandos Futuros (Planejados)

> **Nota:** Estes comandos ainda não foram implementados

- `/teleport x(coord) y(coord) z(floor)` - Teleportar jogador
- `/spawn pokemon(id) level(lvl)` - Spawnar Pokémon
- `/heal player(id)` - Curar jogador específico
- `/kick player(id) reason(texto)` - Expulsar jogador
- `/ban player(id) days(quantidade)` - Banir jogador
- `/item add(item_id) quantity(qtd) player(id)` - Adicionar item ao inventário
- `/setlevel player(id) level(lvl)` - Definir nível do jogador
- `/broadcast message(texto)` - Enviar mensagem global

---

## ⚠️ Observações Importantes

1. **Segurança:** Todos os comandos GM são server-side, não podem ser exploitados pelo client
2. **Validação:** O sistema valida proximidade para interações com NPCs (distância máxima: 1 tile)
3. **Logs:** Todas as ações importantes são registradas no console do servidor
4. **Economia:** Sistema de balance atômico - transações são seguras contra race conditions
5. **Chat Priority:** Quando o chat está ativo, todas as teclas são capturadas para digitação

---

## 📝 Como Adicionar Novos Comandos

Para adicionar um novo comando GM, edite o arquivo:
```
server/handlers/chatHandler.js
```

Exemplo de estrutura:
```javascript
async handleMyCommand(player, params) {
    // Validação de permissões
    if (!player.isGM) return;
    
    // Lógica do comando
    // ...
    
    // Feedback ao jogador
    client.send('system_message', {
        message: 'Comando executado com sucesso!'
    });
}
```

---

**Última Atualização:** 20/12/2025
**Versão do Sistema:** 1.0.0
