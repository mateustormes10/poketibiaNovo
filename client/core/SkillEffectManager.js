// Gerencia animações de skills multiplayer
import { SkillDatabase } from '../../shared/SkillDatabase.js';

export class SkillEffectManager {
    constructor(spriteRenderer, camera) {
        this.spriteRenderer = spriteRenderer;
        this.camera = camera;
        this.activeSkillAnims = [];
    }

    // Adiciona uma animação de skill para ser renderizada
    addSkillEffect({ skillName, tile, duration = 700 }) {
        const skill = SkillDatabase[skillName];
        if (!skill || !skill.spriteSkillList) {
            console.warn('[SkillEffectManager] Skill não encontrada ou sem spriteSkillList:', skillName, skill);
            return;
        }
        const now = performance.now();
        // Calcula todos os tiles afetados de acordo com targetArea
        let affectedTiles = [];
        if (skill.targetArea === 'single') {
            affectedTiles = [tile];
        } else if (skill.targetArea === '3x3') {
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    affectedTiles.push({ x: tile.x + dx, y: tile.y + dy, z: tile.z });
                }
            }
        } else if (skill.targetArea === '5x5') {
            for (let dx = -2; dx <= 2; dx++) {
                for (let dy = -2; dy <= 2; dy++) {
                    affectedTiles.push({ x: tile.x + dx, y: tile.y + dy, z: tile.z });
                }
            }
        } else {
            // fallback: só o tile do player
            affectedTiles = [tile];
        }
        console.log(`[SkillEffectManager] addSkillEffect chamado para skill '${skillName}' com sprites:`, skill.spriteSkillList, 'tiles:', affectedTiles);
        this.activeSkillAnims.push({
            skillName,
            spriteList: skill.spriteSkillList,
            tiles: affectedTiles,
            start: now,
            duration,
        });
    }

    // Renderiza todas as animações ativas
    render(ctx) {
        const now = performance.now();
        this.activeSkillAnims = this.activeSkillAnims.filter(anim => now - anim.start < anim.duration);
        for (const anim of this.activeSkillAnims) {
            const t = (now - anim.start) / anim.duration;
            // Frame da animação
            const frameIdx = Math.floor(t * anim.spriteList.length);
            const spriteId = anim.spriteList[frameIdx] || anim.spriteList[anim.spriteList.length - 1];
            for (const tile of anim.tiles) {
                // Centraliza a sprite no tile
                const px = this.camera.worldToScreenX(tile.x);
                const py = this.camera.worldToScreenY(tile.y);
                const centerX = px + (this.spriteRenderer.tileSize / 2);
                const centerY = py + (this.spriteRenderer.tileSize / 2);
                const drawX = centerX - (this.spriteRenderer.tileSize / 2);
                const drawY = centerY - (this.spriteRenderer.tileSize / 2);
                console.log(`[SkillEffectManager] Renderizando skill '${anim.skillName}' com spriteId ${spriteId} em (${drawX},${drawY})`);
                this.spriteRenderer.renderSpriteById(ctx, spriteId, drawX, drawY);
            }
        }
    }
}
