// Extrai todos os spriteIds usados em SpritePlayerList.js
// Extrai todos os spriteIds usados em PokemonEntities.js
function collectPokemonSpriteIds() {
    const pokemonEntitiesPath = path.join(__dirname, 'game', 'entities', 'PokemonEntities.js');
    console.log('[DEBUG] Caminho usado:', pokemonEntitiesPath);
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
    console.log('[DEBUG] Todos os spriteIds encontrados:', Array.from(ids));
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
    console.log('[DEBUG] SpriteIds extraídos de PokemonEntities.js:', JSON.stringify(pokemonSpriteIds));
    // Junta e remove duplicados
    const allIds = Array.from(new Set([...spriteIds, ...playerSpriteIds, ...pokemonSpriteIds]));
    let index = buildSpriteIndex(allIds);
    // Garante que todos os spriteIds de pokémon estejam no index como 'pokemons'
    for (const id of pokemonSpriteIds) {
        index[id] = 'pokemons';
    }
    fs.writeFileSync(outputFile, JSON.stringify(index, null, 2), 'utf8');
    console.log('sprites_index.json gerado com', Object.keys(index).length, 'sprites.');
}

main();
