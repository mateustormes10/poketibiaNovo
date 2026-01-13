import fs from 'fs';
import path from 'path';

/**
 * CollisionLoader
 * Utilitário para carregar todas as matrizes de colisão .csv em memória
 * Estrutura: { [cityName]: { [andar]: matriz2d } }
 */
export class CollisionLoader {
    constructor(baseDir) {
        this.baseDir = baseDir;
        this.collisionData = {}; // { [city]: { [andar]: matrix } }
        this.offsets = {}; // { [city]: { [andar]: { offsetX, offsetY } } }
    }

    loadAllCSVs() {
        const files = fs.readdirSync(this.baseDir);
        // Carrega offsets.json
        const offsetsPath = path.join(this.baseDir, 'offsets.json');
        if (fs.existsSync(offsetsPath)) {
            try {
                const offsetsRaw = fs.readFileSync(offsetsPath, 'utf8');
                const offsetsJson = JSON.parse(offsetsRaw);
                // offsetsJson: { keys: [...], values: [...] }
                for (let i = 0; i < offsetsJson.keys.length; i++) {
                    const key = offsetsJson.keys[i];
                    const value = offsetsJson.values[i];
                    // key: CidadeInicial_andar_0
                    const match = key.match(/^(.*)_andar_(\d+)$/);
                    if (match) {
                        const city = match[1];
                        const andar = parseInt(match[2], 10);
                        if (!this.offsets[city]) this.offsets[city] = {};
                        this.offsets[city][andar] = { offsetX: value.offsetX, offsetY: value.offsetY };
                    }
                }
            } catch (err) {
                console.error('[CollisionLoader] Erro ao ler offsets.json:', err);
            }
        } else {
            console.warn('[CollisionLoader] offsets.json não encontrado, colisão pode ficar desalinhada!');
        }
        // Carrega matrizes
        for (const file of files) {
            if (file.endsWith('.csv')) {
                // Ex: CidadeInicial_collision_andar_0.csv
                const match = file.match(/^(.*)_collision_andar_(\d+)\.csv$/);
                if (match) {
                    const city = match[1];
                    const andar = parseInt(match[2], 10);
                    const matrix = this.loadCSV(path.join(this.baseDir, file));
                    if (!this.collisionData[city]) this.collisionData[city] = {};
                    this.collisionData[city][andar] = matrix;
                }
            }
        }
    }

    loadCSV(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.trim().split(/\r?\n/);
        return lines.map(line => line.split(',').map(Number));
    }

    isWalkable(city, andar, x, y) {
        const cityData = this.collisionData[city];
        if (!cityData) {
            console.log(`[isWalkable] Cidade '${city}' não encontrada. x=${x}, y=${y}, andar=${andar}`);
            return true;
        }
        const matrix = cityData[andar];
        if (!matrix) {
            console.log(`[isWalkable] Matriz de colisão não encontrada para cidade='${city}', andar=${andar}. x=${x}, y=${y}`);
            return true;
        }
        // Aplica offset se existir
        let offsetX = 0, offsetY = 0;
        if (this.offsets[city] && this.offsets[city][andar]) {
            offsetX = this.offsets[city][andar].offsetX;
            offsetY = this.offsets[city][andar].offsetY;
        }
        const mx = x - offsetX;
        const my = y - offsetY;
        // y = linha, x = coluna
        if (my < 0 || my >= matrix.length) {
            console.log(`[isWalkable] my (${my}) fora dos limites da matriz. x=${x}, y=${y}, offsetY=${offsetY}, matrix.length=${matrix.length}`);
            return true;
        }
        if (mx < 0 || mx >= matrix[0].length) {
            console.log(`[isWalkable] mx (${mx}) fora dos limites da matriz. x=${x}, y=${y}, offsetX=${offsetX}, matrix[0].length=${matrix[0].length}`);
            return true;
        }
        const walkable = matrix[my][mx] === 0;
        console.log(`[isWalkable] city='${city}', andar=${andar}, x=${x}, y=${y}, offsetX=${offsetX}, offsetY=${offsetY}, mx=${mx}, my=${my}, walkable=${walkable}`);
        return walkable;
    }
}
