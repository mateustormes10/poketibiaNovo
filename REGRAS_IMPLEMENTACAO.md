# 🎮 REGRAS DE IMPLEMENTAÇÃO - ChaosWar

## ⚠️ REGRAS DE OURO (NUNCA QUEBRAR)

1. ✅ **Cliente renderiza, servidor manda**
2. ✅ **Movimento é por tile (discreto, não contínuo)**
3. ✅ **Visão é limitada (viewport fixo)**
4. ✅ **Comunicação é por evento (não por frame)**
5. ✅ **Nunca sincronizar por frame**
6. ✅ **Nunca confiar no cliente**

## 🏗️ Arquitetura Obrigatória

### ❌ O Cliente NUNCA Decide:
- Colisão
- Posição final
- Spawn de Pokémon
- Visão do mundo

### ✅ O Cliente Apenas:
- Renderiza (60 FPS)
- Envia intenções
- Anima sprites
- Atualiza câmera

### ✅ O Servidor Decide Tudo:
- Processa em ticks (10-20 TPS)
- Valida movimento
- Calcula colisão
- Atualiza visão
- Spawna entidades

## 🚶 Movimento (Modelo Tibia)

### Cliente envia:
```json
{
  "action": "MOVE",
  "direction": "UP"
}
```

### Servidor processa:
1. Verifica cooldown
2. Verifica colisão
3. Atualiza posição
4. Atualiza visão
5. Envia delta aos clientes relevantes

### ❌ NUNCA:
- Cliente envia coordenadas
- Movimento contínuo (pixel por pixel)
- Envio por frame

## 👁️ Visão Limitada (Viewport)

- **Raio:** 15 tiles
- **Viewport:** 31x31 tiles
- Servidor envia apenas o que está visível
- Recalcula apenas por evento, nunca por frame
- Cliente nunca recebe mapa inteiro

## 🔄 Game Loop do Servidor

```
Tick rate: 10-20 ticks/segundo

Em cada tick:
1. Processa inputs recebidos
2. Atualiza entidades
3. Resolve colisões
4. Atualiza visão
5. Envia apenas deltas (não snapshots)
```

## 📡 Comunicação WebSocket

### Baseada em Eventos:
- `MOVE` - Movimento
- `CHAT` - Chat
- `ENTITY_SPAWN` - Spawn de entidade
- `ENTITY_DESPAWN` - Despawn
- `WORLD_UPDATE` - Atualização de mundo
- `BATTLE_START` - Início de batalha

### Características:
- Mensagens pequenas
- Direcionadas apenas aos jogadores relevantes (por visão)
- Sem broadcast global

## 🎯 Sistema de Visão

```javascript
// Quando player move:
1. Calcular novo viewport (31x31 centrado no player)
2. Identificar entidades na área
3. Enviar apenas deltas:
   - Entidades que entraram na visão
   - Entidades que saíram da visão
   - Tiles novos visíveis
```

## 🔥 Pokémon

### Selvagem:
- Existe apenas no servidor
- Spawn controlado por zona/terreno
- Não persistido no banco

### Do Jogador:
- Persistido no banco
- Só vira entidade visível quando necessário
- Controlado exclusivamente pelo servidor

## 💾 Persistência

### Persistir:
✅ Conta, Player, Pokémon, Inventário, Última posição

### NÃO Persistir:
❌ Pokémon selvagem, Estado momentâneo do mundo

## 📊 Escalabilidade

- Visão limitada
- Sem broadcast global
- Indexar entidades por grid
- Carregar mapas sob demanda
- Separar zonas logicamente
- Objetivo: Milhares de jogadores simultâneos

---

## 🎯 Frase Contexto

> "Este projeto implementa um MMORPG 2D em tiles, inspirado em Tibia e PokexGames, com servidor autoritativo, comunicação via WebSocket, visão limitada por viewport, movimentação discreta por tile, renderização em FPS no cliente e lógica baseada em ticks no backend."

---

**Sempre consulte este arquivo antes de implementar funcionalidades!**
