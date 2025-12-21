// resolveTileLayer.js
// Função utilitária para determinar a camada (ground/overlay) de um tile baseado no spriteId e TileActions
// Uso: resolveTileLayer(spriteId) => 'ground' | 'overlay'

import { TileActions } from '../utils/TileActions.js';

export function resolveTileLayer(spriteId) {
  const action = TileActions[spriteId];
  if (action && action.layer === 'overlay') return 'overlay';
  return 'ground';
}
