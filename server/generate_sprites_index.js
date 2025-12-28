
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Caminhos
const spritesDir = path.join(__dirname, '../client', 'assets', 'sprites');
const outputFile = path.join(spritesDir, 'sprites_index.json');

function buildSpriteIndex() {
    const index = {};
    // Lê todas as subpastas de spritesDir
    const folders = fs.readdirSync(spritesDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    // Inclui a raiz também
    folders.push('');
    for (const folder of folders) {
        const folderPath = folder ? path.join(spritesDir, folder) : spritesDir;
        if (!fs.existsSync(folderPath)) continue;
        const files = fs.readdirSync(folderPath);
        for (const file of files) {
            if (file.endsWith('.png')) {
                const id = file.replace('.png', '');
                index[id] = folder; // Ex: 14629: 'cenario'
            }
        }
    }
    return index;
}

function main() {
    const index = buildSpriteIndex();
    fs.writeFileSync(outputFile, JSON.stringify(index, null, 2), 'utf8');
    console.log(`[sprites_index] Gerado com ${Object.keys(index).length} sprites.`);
}

main();
