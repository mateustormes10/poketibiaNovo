# Sistema de Sprites do Player (SpritePlayerList)

## Visão Geral

Sistema completo de renderização de personagens usando 3 camadas de sprites empilhadas verticalmente, inspirado no sistema clássico do Tibia.

## Arquivos do Sistema

### 1. Definição de Sprites
- **Arquivo**: `client/config/SpritePlayerList.js`
- **Função**: Catálogo centralizado de todas as sprites de personagens
- **Exports**: 
  - `SpritePlayerList` - Objeto com definições de sprites
  - `getPlayerSprites(lookaddons, direction, frameIndex)` - Helper para obter sprites
  - `isValidSpriteType(lookaddons)` - Valida tipo de sprite
  - `getAvailableSpriteTypes()` - Lista tipos disponíveis

### 2. Renderização
- **Arquivo**: `client/render/SpriteRenderer.js`
- **Método**: `renderPlayer(player, screenPos)`
- **Função**: Renderiza as 3 camadas de sprites empilhadas

### 3. Entidade Player
- **Arquivo**: `client/entities/Player.js`
- **Propriedades**:
  - `sprite` - Tipo de sprite (lookaddons)
  - `direction` - Direção atual (up/down/left/right)
  - `animationFrame` - Frame atual (0, 1, 2)
  - `type` - Sempre 'player' para identificação

### 4. Banco de Dados
- **Tabela**: `players`
- **Campo**: `lookaddons VARCHAR(50) DEFAULT 'default'`
- **Valores possíveis**: default, summonerMale, mageMale, warriorMale, maletaMale

## Estrutura de Dados

### SpritePlayerList

```javascript
{
    lookType: {
        direction: [
            [central, esquerda, acima],  // Frame 0
            [central, esquerda, acima],  // Frame 1
            [central, esquerda, acima]   // Frame 2
        ]
    }
}
```

### Ordem das 3 Sprites (CRÍTICO)

Cada frame é composto por **exatamente 3 sprites PNG** na seguinte ordem fixa:

1. **Central** - Corpo principal do personagem
2. **Esquerda** - Complemento do corpo
3. **Acima** - Cabeça ou camada superior

#### Exemplo Prático

```javascript
down: [
    [36204, 36205, 36206],  // Frame 0
    // 36204 = corpo central
    // 36205 = lado esquerdo
    // 36206 = cabeça/topo
]
```

### Sprite Vazia (0)

O valor `0` indica **sprite vazia** (não renderizada):

```javascript
[3434, 0, 0]  // Apenas sprite central, outras 2 vazias
```

Útil para:
- Personagens menores (1 tile de altura)
- Sprites incompletas
- Placeholders temporários

## Tipos de Sprites Disponíveis

### 1. default
- Sprite padrão básico
- 3 camadas completas
- IDs: 36192-36260

### 2. summonerMale
- Invocador masculino
- 1 camada (central only)
- IDs: 3434-3535

### 3. mageMale
- Mago masculino
- 1 camada (central only)
- IDs: 3537-14631

### 4. warriorMale
- Guerreiro masculino
- 2-3 camadas
- IDs: 14498-14517

### 5. maletaMale
- Aparência especial com maleta
- 1 camada (central only)
- IDs: 47943-47965

## Direções

Cada tipo de sprite tem **4 direções**:

- `up` - Virado para cima
- `down` - Virado para baixo
- `left` - Virado para esquerda
- `right` - Virado para direita

## Animação

### Frames de Animação

Cada direção tem **3 frames** de animação:
- Frame 0
- Frame 1
- Frame 2

### Ciclo de Animação

Quando o player está se movendo:
```
Frame 0 → Frame 1 → Frame 2 → Frame 1 → Frame 0 (repete)
```

Quando o player está parado:
```
Frame 0 (fixo)
```

### Controle de Animação

```javascript
// No Player.js
updateAnimation(deltaTime) {
    if (this.isMoving || this.isPredicting) {
        this.animationTime += deltaTime;
        if (this.animationTime >= this.animationSpeed) {
            this.animationTime = 0;
            this.animationFrame = (this.animationFrame + 1) % 3;
        }
    } else {
        this.animationFrame = 0;  // Parado
        this.animationTime = 0;
    }
}
```

## Renderização

### Fluxo de Renderização

1. **Determina tipo de sprite** (do banco de dados)
```javascript
player.sprite = "mageMale"  // Vem do players.lookaddons
```

2. **Determina direção** (do estado do player)
```javascript
player.direction = "down"  // up, down, left, right
```

3. **Determina frame** (da animação)
```javascript
player.animationFrame = 1  // 0, 1, 2
```

4. **Obtém as 3 sprites**
```javascript
const sprites = getPlayerSprites(
    player.sprite,      // "mageMale"
    player.direction,   // "down"
    player.animationFrame  // 1
);
// Retorna: [3542, 0, 0]
```

5. **Renderiza cada camada**
```javascript
for (let i = 0; i < sprites.length; i++) {
    const spriteId = sprites[i];
    if (spriteId === 0) continue;  // Ignora vazias
    
    const img = this.sprites.get(spriteId.toString());
    this.ctx.drawImage(
        img,
        screenPos.x,
        screenPos.y - (i * this.tileSize),  // Empilha verticalmente
        this.tileSize,
        this.tileSize
    );
}
```

### Empilhamento Vertical

As sprites são empilhadas **de baixo para cima**:

```
┌─────────┐
│ Sprite 3│  <- Acima (y - 64)
├─────────┤
│ Sprite 2│  <- Esquerda (y - 32)
├─────────┤
│ Sprite 1│  <- Central (y)
└─────────┘
```

## Carregamento de Sprites

### Pré-carregamento no Renderer

```javascript
// Renderer.js
async init() {
    await this.spriteRenderer.preloadPlayerSprites();
}
```

### Método de Carregamento

```javascript
// SpriteRenderer.js
async preloadPlayerSprites() {
    // 1. Coleta todos os IDs únicos do SpritePlayerList
    const spritesToLoad = new Set();
    for (const lookType in SpritePlayerList) {
        // ... adiciona todos os IDs
    }
    
    // 2. Carrega todas as imagens
    const promises = Array.from(spritesToLoad).map(spriteId => {
        const img = new Image();
        img.src = `./assets/sprites/${spriteId}.png`;
        this.sprites.set(spriteId.toString(), img);
    });
    
    await Promise.all(promises);
}
```

### Localização dos Arquivos

Todas as sprites PNG devem estar em:
```
assets/sprites/[ID].png
```

Exemplos:
- `assets/sprites/36204.png`
- `assets/sprites/3542.png`
- `assets/sprites/14508.png`

## Sincronização Server-Client

### Fluxo de Dados

1. **Banco de Dados** (MySQL)
```sql
SELECT lookaddons FROM players WHERE id = ?
-- Retorna: "mageMale"
```

2. **Server** (PlayerRepository)
```javascript
const player = await playerRepository.findById(playerId);
// player.sprite = "mageMale"
```

3. **WebSocket** (PlayerDTO)
```javascript
PlayerDTO.serialize(player)
// { sprite: "mageMale", direction: "down", ... }
```

4. **Client** (Player.js)
```javascript
this.sprite = data.sprite;  // "mageMale"
```

5. **Renderer** (SpriteRenderer.js)
```javascript
const sprites = getPlayerSprites(
    player.sprite,
    player.direction,
    player.animationFrame
);
```

### Garantia de Sincronização

✅ **Determinístico** - Todos os players veem o mesmo visual
✅ **Server-authoritative** - Visual vem do banco de dados
✅ **Sem estado local** - Client apenas renderiza

## Helpers Disponíveis

### getPlayerSprites()

Retorna as 3 sprites de um frame específico:

```javascript
const sprites = getPlayerSprites("mageMale", "down", 1);
// Retorna: [3542, 0, 0]
```

### isValidSpriteType()

Valida se um tipo de sprite existe:

```javascript
if (isValidSpriteType("mageMale")) {
    // Tipo válido
}
```

### getAvailableSpriteTypes()

Lista todos os tipos disponíveis:

```javascript
const types = getAvailableSpriteTypes();
// ["default", "summonerMale", "mageMale", "warriorMale", "maletaMale"]
```

## Adicionar Novos Personagens

### 1. Adicionar ao SpritePlayerList.js

```javascript
export const SpritePlayerList = {
    // ... existentes
    
    novoPersonagem: {
        up: [
            [id1, id2, id3],
            [id4, id5, id6],
            [id7, id8, id9]
        ],
        down: [
            [id10, id11, id12],
            [id13, id14, id15],
            [id16, id17, id18]
        ],
        left: [
            [id19, id20, id21],
            [id22, id23, id24],
            [id25, id26, id27]
        ],
        right: [
            [id28, id29, id30],
            [id31, id32, id33],
            [id34, id35, id36]
        ]
    }
};
```

### 2. Adicionar sprites PNG

Copiar arquivos para:
```
assets/sprites/[ID].png
```

### 3. Atualizar no banco de dados

```sql
UPDATE players 
SET lookaddons = 'novoPersonagem' 
WHERE id = ?;
```

### 4. Reiniciar o client

O sistema carregará automaticamente as novas sprites.

## Debugging

### Ver sprites carregadas

```javascript
console.log(this.sprites.size + " sprites carregadas");
```

### Ver sprite atual do player

```javascript
console.log("Sprite:", player.sprite);
console.log("Direção:", player.direction);
console.log("Frame:", player.animationFrame);
```

### Testar sprite específica

```javascript
const sprites = getPlayerSprites("mageMale", "down", 0);
console.log("Sprites do frame:", sprites);
```

## Performance

### Otimizações Implementadas

✅ **Pré-carregamento** - Todas as sprites carregadas no init()
✅ **Set para deduplicação** - Não carrega sprites duplicadas
✅ **Cache de imagens** - Map com imagens carregadas
✅ **Animação eficiente** - Apenas quando em movimento

### Uso de Memória

Com 5 tipos de sprites:
- ~150 arquivos PNG únicos
- ~32x32 pixels por sprite
- ~480KB de memória total (estimado)

## Troubleshooting

### Sprites não aparecem

1. Verificar se arquivos PNG existem em `assets/sprites/`
2. Verificar console para erros de carregamento
3. Verificar se `preloadPlayerSprites()` foi chamado

### Animação não funciona

1. Verificar `updateAnimation()` sendo chamado
2. Verificar `isMoving` está true durante movimento
3. Verificar `animationFrame` mudando (0, 1, 2)

### Sprites erradas

1. Verificar `player.sprite` no banco de dados
2. Verificar `PlayerDTO` enviando sprite correta
3. Verificar IDs no SpritePlayerList.js

### Performance ruim

1. Reduzir número de sprites únicas
2. Otimizar tamanho dos PNGs
3. Usar sprite sheets (futuro)

## Futuras Melhorias

- [ ] Sistema de equipamentos (armaduras, capacetes, etc)
- [ ] Addons e customizações
- [ ] Sprite sheets para otimização
- [ ] Cache de frames renderizados
- [ ] Suporte a sprites femininas
- [ ] Sistema de montarias
- [ ] Efeitos visuais (brilho, aura, etc)
