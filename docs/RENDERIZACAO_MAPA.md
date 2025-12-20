# Sistema de Renderização de Mapa - Client

## Arquitetura Implementada

### 1. Map.js (client/map/Map.js)
**Classe Map** - Armazena matriz 2D de tiles do viewport
- Usa `Map<string, tile>` para eficiência (key: "x,y,z")
- Representa apenas área visível enviada pelo servidor
- Métodos principais:
  - `updateFromServer(mapData)` - Atualiza tiles do servidor
  - `getTile(x, y, z)` - Busca tile específico
  - `getAllTiles()` - Retorna array de todos tiles
  - `getViewport()` - Bounds do viewport atual

### 2. TileSet.js (client/render/TileSet.js)
**Classe TileSet** - Mapeia códigos lógicos para sprites
- Suporta duas modalidades:
  1. **Tileset de imagem** - Carrega sprite sheet (futuro)
  2. **Fallback de cores** - Mapeia spriteId → cor hex
- Mapeamento padrão:
  ```javascript
  9912: { color: '#fdd835', name: 'sand' }  // Areia
  9913: { color: '#d7ccc8', name: 'path' }  // Caminho
  100:  { color: '#7cb342', name: 'grass' } // Grama
  ```
- Métodos:
  - `loadTileset(path, size)` - Carrega sprite sheet
  - `drawTile(ctx, spriteId, x, y, size)` - Desenha tile
  - `addTileMapping(id, color, name)` - Customiza cores

### 3. TileRenderer.js (client/render/TileRenderer.js)
**Classe TileRenderer** - Renderiza matriz de tiles
- Percorre matriz e desenha tile por tile
- **Viewport culling** - Desenha apenas tiles visíveis
- Integração com câmera para transformação
- Modo debug:
  - Grid do mapa
  - Coordenadas do tile
  - Sprite ID
  - Indicador de walkable
- Métodos:
  - `render(ctx, map, camera)` - Renderiza mapa completo
  - `renderGrid(ctx, map, camera)` - Grid de debug
  - `setDebugMode(enabled)` - Liga/desliga debug

### 4. Renderer.js (client/render/Renderer.js)
**Classe Renderer** - Orquestrador principal
- **Ordem de renderização:**
  1. Mapa (background)
  2. Entidades (sobre mapa)
  3. UI (sobre tudo)
- Integra TileRenderer antes de SpriteRenderer
- Suporta grid opcional para debug

## Fluxo de Dados

```
SERVIDOR                           CLIENT
┌─────────────────┐               ┌──────────────────┐
│ MapManager      │               │  Map.js          │
│ (chunks)        │──────────────▶│  (viewport)      │
│                 │    WebSocket  │                  │
│ Formato:        │               │  tiles: Map      │
│ [9913,S]        │               │  {x,y,z,id}      │
│ [9912,S]...     │               │                  │
└─────────────────┘               └──────────────────┘
                                           │
                                           ▼
                                  ┌──────────────────┐
                                  │  TileRenderer    │
                                  │                  │
                                  │  + TileSet       │
                                  │  (spriteId→img)  │
                                  └──────────────────┘
                                           │
                                           ▼
                                  ┌──────────────────┐
                                  │  Canvas          │
                                  │  (32x32 tiles)   │
                                  └──────────────────┘
```

## Formato de Dados

### Servidor → Cliente
```javascript
{
  map: {
    centerX: 100,
    centerY: 150,
    z: 1,
    tiles: [
      { x: 95, y: 145, z: 1, spriteId: 9912, walkable: true, type: 'sand' },
      { x: 96, y: 145, z: 1, spriteId: 9913, walkable: true, type: 'path' },
      // ...
    ]
  }
}
```

### Cliente (Map.js)
```javascript
Map {
  tiles: Map<"x,y,z", {x, y, z, spriteId, walkable, type}>
  viewport: { minX, minY, maxX, maxY, z }
  tileSize: 32
}
```

## MapProtocol (shared/network/MapProtocol.js)

**Adaptador** para converter formato do servidor:
```javascript
// Input: "[9913,S] [9912,S] [9912,W]..."
// Output: { tiles: [{x, y, z, spriteId, walkable}] }

MapProtocol.parseMapViewport(rawData, centerX, centerY, z, viewportSize)
```

## Como Usar

### 1. Inicialização
```javascript
import { Map } from './map/Map.js';
import { TileRenderer } from './render/TileRenderer.js';

const map = new Map(32); // tiles de 32px
const tileRenderer = new TileRenderer(32);

await tileRenderer.init(); // Usa cores
// ou
await tileRenderer.init('./assets/tileset.png'); // Carrega imagem
```

### 2. Atualizar Mapa do Servidor
```javascript
// Recebe dados do servidor
wsClient.on('gameState', (data) => {
  if (data.map) {
    gameState.map.updateFromServer(data.map);
  }
});
```

### 3. Renderizar
```javascript
// No loop de render
tileRenderer.render(ctx, map, camera);
```

### 4. Customizar TileSet
```javascript
const tileSet = tileRenderer.getTileSet();

// Adiciona novo mapeamento
tileSet.addTileMapping(9914, '#8b4513', 'dirt');
tileSet.addTileMapping(9915, '#4caf50', 'forest');
```

### 5. Debug
```javascript
// Liga modo debug
tileRenderer.setDebugMode(true);

// Renderiza grid
renderer.showGrid = true;
```

## Integração com Servidor

### VisionSystem deve enviar:
```javascript
// server/game/systems/VisionSystem.js
getVisibleTiles(player) {
  const viewport = this.calculateViewport(player);
  const tiles = this.mapManager.getTilesInArea(
    viewport.x, viewport.y, player.z,
    viewport.width, viewport.height
  );
  
  return {
    centerX: player.x,
    centerY: player.y,
    z: player.z,
    tiles: tiles.map(tile => ({
      x: tile.x,
      y: tile.y,
      z: tile.z,
      spriteId: tile.spriteId,
      walkable: tile.walkable,
      type: tile.type
    }))
  };
}
```

### Broadcast de mapa:
```javascript
// Envia no gameState
{
  tick: 1234,
  players: [...],
  map: visionSystem.getVisibleTiles(player), // <-- ADICIONAR ISSO
  entities: [...]
}
```

## Performance

### Viewport Culling
- Renderiza apenas tiles visíveis na tela
- Cálculo:
  ```javascript
  startX = floor(cameraX / tileSize)
  endX = ceil((cameraX + width) / tileSize)
  ```
- Reduz desenhos de ~10000 para ~400 tiles (viewport 20x20)

### Map ES6
- Busca O(1) por coordenadas
- `Map<"x,y,z", tile>` mais eficiente que array 3D

### Canvas Optimization
- `ctx.imageSmoothingEnabled = false` (pixel art)
- Uma drawImage por tile (quando usar sprite sheet)

## Tile Size

- **32x32 pixels** por tile (padrão Tibia)
- Configurável no construtor
- Usado para:
  - Renderização
  - Conversão mundo → tela
  - Viewport culling

## Controles de Debug

Implementados em `index.html`:
- **Grid Toggle** - Mostra/esconde grid
- **Debug Toggle** - Mostra coordenadas e IDs
- **+/-** - Zoom da câmera
- **WASD/Setas** - Movimento

## Próximos Passos

1. **Servidor** - Enviar `map` no gameState
2. **VisionSystem** - Implementar `getVisibleTiles()`
3. **Sprite Sheet** - Criar tileset.png 32x32
4. **Layering** - Suportar múltiplas camadas (chão, objetos, teto)
5. **Animação** - Tiles animados (água, lava)
6. **Minimapa** - Renderização simplificada

## Troubleshooting

### Mapa não aparece
- ✓ Servidor enviando `map` no gameState?
- ✓ `map.tiles.size > 0`?
- ✓ Câmera posicionada corretamente?
- ✓ `renderer.init()` aguardado (async)?

### Tiles errados
- ✓ spriteId mapeado no TileSet?
- ✓ Formato do servidor correto?
- ✓ MapProtocol parseando corretamente?

### Performance ruim
- ✓ Viewport culling ativo?
- ✓ Debug mode desligado?
- ✓ imageSmoothingEnabled = false?

## Exemplo Completo

```javascript
// client/index.html
import { Game } from './core/Game.js';

const game = new Game(canvas);
await game.init();

// Ativa debug
game.renderer.showGrid = true;
game.renderer.tileRenderer.setDebugMode(true);

// Loop já inicia automaticamente
```

---

**Status**: ✅ Sistema completo implementado
**Faltando**: Servidor enviar dados de mapa no gameState
