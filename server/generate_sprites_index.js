// Coleta todos os spriteIds usados em spriteSkillList do SkillDatabase.js
function collectSkillSpriteIds() {
    const skillDbPath = path.join(__dirname, '../shared/SkillDatabase.js');
    if (!fs.existsSync(skillDbPath)) {
        console.log('[SkillDB] Arquivo não encontrado:', skillDbPath);
        return [];
    }
    const content = fs.readFileSync(skillDbPath, 'utf8');
    // Regex para capturar arrays spriteSkillList: ["12345","67890"]
    const regex = /spriteSkillList\s*:\s*\[([^\]]*)\]/g;
    const ids = new Set();
    let match;
    let skillCount = 0;
    while ((match = regex.exec(content)) !== null) {
        skillCount++;
        const arr = match[1].split(',').map(s => s.replace(/['"\s]/g, ''));
        arr.forEach(id => {
            if (id && !isNaN(id)) {
                ids.add(Number(id));
            }
        });
    }
    return Array.from(ids);
}
// Extrai todos os spriteIds usados em SpritePlayerList.js
// Extrai todos os spriteIds usados em PokemonEntities.js
function collectPokemonSpriteIds() {
    const pokemonEntitiesPath = path.join(__dirname, 'game', 'entities', 'PokemonEntities.js');
    if (!fs.existsSync(pokemonEntitiesPath)) return [];
    let content = fs.readFileSync(pokemonEntitiesPath, 'utf8');
    // Captura todos os números de 5 dígitos
    const matches = content.match(/\b\d{5}\b/g);
    const ids = new Set();
    if (matches) {
        matches.forEach(num => {
            const n = Number(num);
            if (n > 0) ids.add(n);
        });
    }
    return Array.from(ids);
}
// Retorna um Set de IDs únicos
function collectPlayerSpriteIds() {
    const spriteListPath = path.join(__dirname, '../client', 'config', 'SpritePlayerList.js');
    if (!fs.existsSync(spriteListPath)) return [];
    const content = fs.readFileSync(spriteListPath, 'utf8');
    // Regex para capturar todos os números de 2 a 6 dígitos em todo o arquivo
    const matches = content.match(/\b\d{2,6}\b/g);
    const ids = new Set();
    if (matches) {
        matches.forEach(num => {
            const n = Number(num);
            if (n > 0) ids.add(n);
        });
    }
    return Array.from(ids);
}
// Script para gerar sprites_index.json a partir dos arquivos de mapas e das pastas de sprites
// Uso: node generate_sprites_index.js


import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caminhos
const mapsDir = path.join(__dirname, '../client', 'assets');
const spritesDir = path.join(__dirname, '../client', 'assets', 'sprites');
const outputFile = path.join(__dirname, '../client', 'assets', 'sprites', 'sprites_index.json');

// Subpastas conhecidas
const SPRITE_SUBFOLDERS = [
    '',
    'animacoes_damage',
    'cenario',
    'chao',
    'items',
    'liquidos_chao',
    'monstros_tibia',
    'monstro_tibia_dead',
    'objetos_com_actions',
    'outfit_players',
    'paredes',
    'pokemons',
    'pokeball',
    'pokemon_dead',
    'portas',
];

// Arquivos de mapa
const mapFiles = ['map_z1.txt', 'map_z2.txt', 'map_z3.txt', 'map_z4.txt', 'map_z5.txt'];

// Coleta todos os spriteIds usados nos mapas
function collectSpriteIds() {
    const spriteIds = new Set();
    for (const file of mapFiles) {
        const filePath = path.join(mapsDir, file);
        if (!fs.existsSync(filePath)) continue;
        const content = fs.readFileSync(filePath, 'utf8');
        // Procura números que podem ser spriteIds (ajuste conforme o formato do seu mapa)
        const matches = content.match(/\d{2,6}/g);
        if (matches) {
            matches.forEach(id => spriteIds.add(Number(id)));
        }
    }
    return Array.from(spriteIds);
}

// Para cada spriteId, descobre em qual subpasta está
function buildSpriteIndex(spriteIds) {
    const index = {};
    for (const id of spriteIds) {
        let found = false;
        for (const folder of SPRITE_SUBFOLDERS) {
            const folderPath = path.join(spritesDir, folder);
            const filePath = path.join(folderPath, id + '.png');
            if (fs.existsSync(filePath)) {
                index[id] = folder; // Ex: 14629: 'objetos_com_actions'
                found = true;
                break;
            }
        }
        if (!found) {
            index[id] = null; // Não encontrado
        }
    }
    return index;
}

function main() {
    const spriteIds = collectSpriteIds();
    const playerSpriteIds = collectPlayerSpriteIds();
    const pokemonSpriteIds = collectPokemonSpriteIds();
    const skillSpriteIds = collectSkillSpriteIds();
    // Junta e remove duplicados
    const allIds = Array.from(new Set([...spriteIds, ...playerSpriteIds, ...pokemonSpriteIds, ...skillSpriteIds]));
    let index = buildSpriteIndex(allIds);
    // Garante que todos os spriteIds de pokémon estejam no index como 'pokemons'
    for (const id of pokemonSpriteIds) {
        index[id] = 'pokemons';
    }
    // Garante que todos os spriteIds de skills estejam no index como 'animacoes_damage'
    for (const id of skillSpriteIds) {
        index[id] = 'animacoes_damage';
    }
    fs.writeFileSync(outputFile, JSON.stringify(index, null, 2), 'utf8');
}

main();
