// TileActions.js
// Definição das ações e camadas dos tiles do mapa
// Tudo é ground exceto os que tiverem layer: 'overlay'

export const TileActions = {
  49: {
    layer: "ground", // alavanca fica NA FRENTE do player
    look: () => "Uma alavanca antiga.",
    use: {
      allowed: true,
      animationSprites: [49, 50],
      onUse(game, x, y) {
        const tile = game.map.getTile(x, y);
        if (!tile) return;
        tile.overlay[tile.overlay.length - 1] = 50;
        game.showMessage("Alavanca puxada!");
      }
    }
  },
  10358: {
    layer: "ground",
    look: () => "Escadas para cima",
    floorUp: 4,
  },
  455: {
    layer: "ground",
    look: () => "Escadas para baixo",
    floorDown: 3,
  },
  197: {
    layer: "overlay",
    instances: [
      { x: 81, y: 25, z: 3, look: () => "Portal para a cidade.", teleportTo: [73, 34, 3] },
      { x: 81, y: 27, z: 3, look: () => "Portal para a arena 2.", teleportTo: [50, 50, 3] },
      { x: 81, y: 29, z: 3, look: () => "Portal para a arena 3.", teleportTo: [50, 54, 2] },
      { x: 81, y: 31, z: 3, look: () => "Portal para a arena 4.", teleportTo: [50, 58, 3] },
      { x: 81, y: 33, z: 3, look: () => "Portal para a arena 5.", teleportTo: [50, 62, 1] },
    ]
  },
  198: {
    layer: "overlay",
    look: () => "Escadas para cima",
    floorUp: 4,
    idleAnimation: { frames: [198, 198], interval: 200, range: 15 }
  },
  199: {
    layer: "overlay",
    look: () => "Escadas para baixo",
    floorDown: 3,
    idleAnimation: { frames: [199, 199], interval: 200, range: 15 }
  },
  50010: {
    layer: "overlay",
    look: () => "Um baú antigo.",
    use: {
      allowed: true,
      animationSprites: [70001, 70002],
      onUse(game, x, y) {
        const tile = game.map.getTile(x, y);
        if (!tile) return;
        tile.overlay[tile.overlay.length - 1] = 70002;
        game.inventory.addItem({ sprite: 80001, name: "Potion" });
        game.showMessage("Você abriu o baú e encontrou uma Potion!");
      }
    }
  },
  379: {
    layer: "overlay",
    look: () => "Uma placa de madeira.",
    use: { allowed: true, onUse(game) { game.showMessage("Bem-vindo à cidade!"); } }
  },
  380: {
    layer: "overlay",
    look: () => "Uma placa de madeira.",
    use: { allowed: true, onUse(game) { game.showMessage("Bem-vindo à cidade!"); } }
  },
  381: {
    layer: "overlay",
    look: () => "Uma placa de madeira.",
    use: { allowed: true, onUse(game) { game.showMessage("Bem-vindo à cidade!"); } }
  },
  382: {
    layer: "overlay",
    look: () => "Uma placa de madeira.",
    use: { allowed: true, onUse(game) { game.showMessage("Bem-vindo à cidade!"); } }
  },
  383: {
    layer: "overlay",
    look: (tile) => tile.data?.[383] || "Uma placa de madeira.",
    use: {
      allowed: true,
      onUse(game, x, y) {
        const tile = game.map.getTile(x, y);
        const text = tile?.data?.[383];
        if (text) game.showMessage(text);
      }
    }
  },
  384: {
    layer: "overlay",
    look: () => "Uma placa de madeira.",
    use: { allowed: true, onUse(game) { game.showMessage("Bem-vindo à cidade!"); } }
  },
  452: { layer: "overlay" },
  453: { layer: "overlay" },
  454: { layer: "overlay" },
  481: { layer: "overlay" },
  482: { layer: "overlay" },
  483: { layer: "overlay" },
  484: { layer: "overlay" },
  485: { layer: "overlay" },
  1199: {
    layer: "overlay",
    look: () => "Uma pedra media.",
    use: { allowed: true, onUse(game) { game.showMessage("Uma pedra media!"); } }
  },
  1200: {
    layer: "overlay",
    look: () => "Uma pedra pequena.",
    use: { allowed: true, onUse(game) { game.showMessage("Uma pedra pequena!"); } }
  },
  1165: { layer: "overlay" },
  1166: { layer: "overlay" },
  1167: { layer: "overlay" },
  1168: {
    layer: "overlay",
    look: () => "Uma arvore.",
    use: { allowed: true, onUse(game) { game.showMessage("Uma arvore pequena!"); } }
  },

  
  1599: { layer: "overlay" },
  1600: { layer: "overlay" },
  1601: { layer: "overlay" },
  1602: { layer: "pedra gigantesca" },
};
