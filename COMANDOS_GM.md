# Comandos GM/ADM - ChaosWar

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

## 🔧 Comandos GM Disponíveis

### Sistema de Permissões

**Requisito:** Apenas jogadores com `vocation = 4` podem executar comandos GM.

### Comandos Implementados

#### `/teleport`
Teleporta o GM para coordenadas específicas.

**Sintaxe:**
```
/teleport x(coord) y(coord) z(floor)
```

**Exemplos:**
```
/teleport x(100) y(200) z(7)
/teleport x(15) y(19) z(3)
```

**Comportamento:**
- Teleporta instantaneamente para as coordenadas
- Atualiza spatial grid e map manager
- Funciona mesmo em tiles não-walkable (com aviso)

---

#### `/spawn`
Spawna um Pokémon selvagem na posição atual do GM.

**Sintaxe:**
```
/spawn pokemon(nome) level(lvl)
```

**Exemplos:**
```
/spawn pokemon(Pikachu) level(25)
/spawn pokemon(Charizard) level(50)
/spawn pokemon(Rattata) level(5)
```

**Comportamento:**
- Cria Pokémon na posição exata do GM
- HP calculado automaticamente: 20 + (level × 5)
- Pokémon entra no sistema de IA (idle/roaming/engage)
- Todos os players online veem o spawn

---

#### `/heal`
Cura completamente um jogador e seus Pokémon.

**Sintaxe:**
```
/heal player(id)
```

**Exemplos:**
```
/heal player(1)
/heal player(5)
```

**Comportamento:**
- Restaura HP e Mana do player para máximo
- Restaura HP e Mana de todos os Pokémon do player
- Atualiza banco de dados
- Player recebe notificação de cura

---

#### `/kick`
Remove um jogador do servidor imediatamente.

**Sintaxe:**
```
/kick player(id)
```

**Exemplos:**
```
/kick player(3)
```

**Comportamento:**
- Desconecta o player instantaneamente
- Salva progresso antes de desconectar
- Player vê mensagem de remoção

---

#### `/ban`
Bane um jogador por tempo determinado.

**Sintaxe:**
```
/ban player(id) days(quantidade)
```

**Exemplos:**
```
/ban player(7) days(3)
/ban player(10) days(30)
/ban player(5) days(1)
```

**Comportamento:**
- Registra ban na tabela `bans`
- Kicka o player se estiver online
- Ban expira automaticamente após o período
- Login bloqueado durante o período

---

#### `/item`
Adiciona itens ao inventário de um jogador.

**Sintaxe:**
```
/item add(item_id) quantity(qtd) player(id)
```

**Exemplos:**
```
/item add(potion) quantity(10) player(1)
/item add(pokeball) quantity(50) player(2)
/item add(goldcoin) quantity(1000) player(3)
```

**Comportamento:**
- Adiciona item via InventoryRepository
- Atualiza banco de dados
- Player recebe notificação e atualização de inventário
- Funciona com player offline (atualiza apenas DB)

---

#### `/setlevel`
Define o nível de um jogador.

**Sintaxe:**
```
/setlevel player(id) level(lvl)
```

**Exemplos:**
```
/setlevel player(1) level(50)
/setlevel player(3) level(100)
```

**Comportamento:**
- Atualiza level no estado em memória
- Atualiza banco de dados
- Player recebe notificação
- Level válido: 1-300

---

#### `/broadcast`
Envia mensagem global para todos os jogadores online.

**Sintaxe:**
```
/broadcast message(texto)
```

**Exemplos:**
```
/broadcast message(Servidor reiniciará em 10 minutos)
/broadcast message(Evento iniciando agora na área PvP!)
/broadcast message(Manutenção programada às 22h)
```

**Comportamento:**
- Aparece centralizada na tela de todos os players
- Duração: 5 segundos
- Destaque visual (overlay)
- Visível mesmo durante movimento/combate

---

## 🛡️ Sistema de Segurança

### Validações Automáticas

1. **Permissão:** Apenas vocation = 4 pode executar
2. **Parse:** Valida sintaxe antes de executar
3. **Parâmetros:** Valida tipos e ranges
4. **Auditoria:** Todos os comandos geram logs
5. **Server-Side:** Cliente não pode simular comandos

### Feedback ao GM

Todos os comandos retornam:
- ✅ Mensagem de sucesso (verde)
- ❌ Mensagem de erro (vermelho)
- ⚠️ Avisos quando necessário (amarelo)

### Exemplos de Erros

```
❌ Você não tem permissão para usar comandos GM.
❌ Comando inválido.
❌ Uso: /teleport x(coord) y(coord) z(floor)
❌ Coordenadas inválidas.
❌ Player com ID 999 não encontrado ou offline.
```

---

## 📊 Logs de Auditoria

Todos os comandos geram logs no formato:

```
[GM] Teleport: AshKetchum (id=1) para x=100, y=200, z=7
[GM] Spawn Pokémon: Pikachu id=10 level=25 em x=50, y=30, z=7 por GM AshKetchum
[GM] Heal aplicado no player RedPlayer (id=3) pelo GM AshKetchum
[GM] Player BluePlayer (id=5) foi kickado pelo GM AshKetchum
[GM] Player id=7 banido por 3 dias pelo GM AshKetchum (id=1)
[GM] Item potion x10 adicionado ao player id=2 pelo GM AshKetchum
[GM] Level do player id=6 alterado para 50 pelo GM AshKetchum
[GM] Broadcast enviado: "Servidor reiniciará em 10 minutos" por GM AshKetchum
```

---

## 🔧 Comandos Legados (Mantidos para Compatibilidade)

### /add goldcoin
Adiciona gold coins ao saldo de um jogador.
