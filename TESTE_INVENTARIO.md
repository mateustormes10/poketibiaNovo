# Guia Rápido de Teste - Sistema de Inventário

## Pré-requisitos

1. ✅ Banco de dados atualizado com a tabela `player_inventory`
2. ✅ Servidor rodando
3. ✅ Cliente aberto no navegador

## Passo a Passo para Testar

### 1. Atualizar Banco de Dados

Execute o script SQL:
```bash
# Navegue até a pasta do projeto
cd d:\xampp\htdocs\projetos\novo_poketibia

# Execute o base.sql (contém a tabela player_inventory)
# Ou execute manualmente no phpMyAdmin/MySQL Workbench
```

Ou execute diretamente:
```sql
-- Criar tabela (se não existir)
CREATE TABLE IF NOT EXISTS player_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_id INT NOT NULL,
    item_type VARCHAR(50) NOT NULL DEFAULT 'consumable',
    item_name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    slot_order INT NOT NULL DEFAULT 0,
    created_at INT NOT NULL DEFAULT UNIX_TIMESTAMP(),
    updated_at INT NOT NULL DEFAULT UNIX_TIMESTAMP() ON UPDATE UNIX_TIMESTAMP(),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    INDEX idx_player_inventory (player_id, slot_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2. Adicionar Itens de Teste

Execute o arquivo `inventory_seed.sql`:
```sql
-- Adiciona itens de teste para o player 1
INSERT INTO player_inventory (player_id, item_type, item_name, quantity, slot_order) VALUES
(1, 'consumable', 'Poção', 15, 1),
(1, 'consumable', 'Super Poção', 8, 2),
(1, 'battle', 'Pokébola', 25, 3),
(1, 'misc', 'Gold Coin', 10000, 4);
```

### 3. Iniciar o Servidor

```bash
cd server
npm start
```

Aguarde ver:
```
[Server] WebSocket server started on port 3000
[GameWorld] Systems initialized
```

### 4. Abrir o Cliente

```bash
cd ..
# Abra client/index.html no navegador
# Ou use um servidor local:
npx http-server -p 8080
```

### 5. Fazer Login

- Quando o prompt aparecer, digite o **Player ID: 1**
- Aguarde o login ser bem-sucedido

### 6. Testar o Inventário

#### Abrir Inventário
- Pressione a tecla **`I`**
- O inventário deve abrir mostrando os itens

✅ **Você deve ver:**
- Uma janela centralizada
- Grade de 40 slots (5x8)
- Itens com nomes e quantidades
- Indicadores coloridos de tipo

#### Navegar pelos Itens
- **Passe o mouse** sobre os slots
- Slots com itens devem ter efeito hover (borda azul clara)

#### Selecionar Item
- **Clique** em um slot com item
- O slot deve ser destacado (borda azul)
- Painel de detalhes aparece à direita mostrando:
  - Nome do item
  - Tipo
  - Quantidade
  - Descrição

#### Usar Item
- Com um item selecionado, clique no botão **"Usar"**
- Observe o console do navegador
- O inventário deve atualizar automaticamente
- A quantidade deve diminuir (ou o item desaparece se foi o último)

#### Fechar Inventário
- Pressione **`I`** novamente
- Ou pressione **`ESC`**
- O inventário fecha e você pode mover o player

### 7. Testar Bloqueio de Movimento

#### Com Inventário Aberto:
- Tente mover o player com **WASD** ou **setas**
- O player **NÃO** deve se mover

#### Com Inventário Fechado:
- Pressione **`I`** para fechar
- Agora o player **pode** se mover normalmente

### 8. Testar Recebimento de Item

#### Via Código do Servidor:
Adicione temporariamente no código ou use console do servidor:
```javascript
// Exemplo: dar uma poção ao player 1
const playerId = 1;
await inventoryRepository.addItem(playerId, 'consumable', 'Poção', 1);
```

#### Via NPC (se integrado):
- Interaja com um NPC vendedor
- Compre um item
- O inventário deve atualizar automaticamente se estiver aberto

### 9. Verificar Console

#### Console do Navegador (F12):
```
[InventoryManager] Solicitando inventário do servidor
[InventoryManager] Dados do inventário recebidos: {...}
[InventoryManager] Inventário aberto
[InventoryManager] Usando item: Poção
[InventoryManager] Item usado: {...}
[InventoryManager] Inventário fechado
```

#### Console do Servidor:
```
[InventoryHandler] Inventário enviado para player 1
[InventoryHandler] Player 1 usou item: Poção
```

## Casos de Teste

### ✅ Teste 1: Inventário Vazio
```sql
DELETE FROM player_inventory WHERE player_id = 1;
```
- Abra inventário
- Deve mostrar 40 slots vazios
- Painel de detalhes não aparece

### ✅ Teste 2: Inventário Cheio
```sql
-- Execute o seed com player_id = 4 (tem 39 itens)
-- Adicione mais 1 item manualmente para completar 40
```
- Todos os 40 slots devem estar preenchidos
- Nenhum slot vazio

### ✅ Teste 3: Item com Quantidade Alta
```sql
UPDATE player_inventory SET quantity = 999 WHERE player_id = 1 AND item_name = 'Poção';
```
- O número deve aparecer como "x999"

### ✅ Teste 4: Usar Último Item
```sql
UPDATE player_inventory SET quantity = 1 WHERE player_id = 1 AND item_name = 'Poção';
```
- Use a poção
- O slot deve ficar vazio após o uso

### ✅ Teste 5: Tipos de Itens
Observe as cores dos indicadores:
- 🔴 Vermelho = Consumível
- 🔵 Azul claro = Batalha
- 🟡 Amarelo = Item-Chave
- ⚪ Cinza = Diversos

## Troubleshooting

### ❌ "Inventário não abre"
**Solução:**
1. Verifique se está logado (player deve existir)
2. Abra console do navegador (F12)
3. Veja erros JavaScript
4. Confirme que servidor está rodando

### ❌ "Slots aparecem vazios mas banco tem dados"
**Solução:**
1. Verifique `player_id` no banco
2. Confirme que fez login com o player correto
3. Veja console do servidor para logs

### ❌ "Usar item não funciona"
**Solução:**
1. Verifique definição do item em `ItemDefinitions`
2. Veja console do servidor para erros
3. Confirme que efeito está implementado

### ❌ "Erro de banco de dados"
**Solução:**
1. Verifique se tabela `player_inventory` existe
2. Confirme foreign key para `players` está correta
3. Execute `base.sql` novamente

## Próximos Testes

Após validar funcionalidade básica:

1. **Performance**: Teste com 1000+ players simultâneos
2. **Concorrência**: Múltiplos clientes do mesmo player
3. **Segurança**: Tente manipular requests via DevTools
4. **Edge Cases**: Quantidades negativas, nomes inválidos, etc.

## Comandos Úteis MySQL

```sql
-- Ver todos os inventários
SELECT p.name, pi.item_name, pi.quantity
FROM player_inventory pi
JOIN players p ON p.id = pi.player_id
ORDER BY p.name, pi.slot_order;

-- Contar itens por player
SELECT player_id, COUNT(*) as total_items
FROM player_inventory
GROUP BY player_id;

-- Limpar inventário de um player
DELETE FROM player_inventory WHERE player_id = 1;

-- Resetar auto increment
ALTER TABLE player_inventory AUTO_INCREMENT = 1;
```

## Checklist Final

Antes de considerar completo:

- [ ] Tabela criada no banco
- [ ] Seed executado
- [ ] Servidor iniciado sem erros
- [ ] Cliente abre inventário com `I`
- [ ] Itens são exibidos corretamente
- [ ] Hover funciona
- [ ] Seleção funciona
- [ ] Painel de detalhes aparece
- [ ] Uso de item funciona
- [ ] Quantidade atualiza
- [ ] Inventário fecha com `I` ou `ESC`
- [ ] Movimento bloqueado quando aberto
- [ ] Movimento normal quando fechado
- [ ] Console sem erros

## Pronto!

Se todos os testes passarem, o sistema está funcionando corretamente! 🎉

Para adicionar novos itens ou funcionalidades, consulte `SISTEMA_INVENTARIO.md`.
