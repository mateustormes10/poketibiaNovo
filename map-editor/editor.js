
const canvas = document.getElementById("mapCanvas");
const ctx = canvas.getContext("2d");
const spriteListDiv = document.getElementById("sprite-list");
const walkableCheckbox = document.getElementById("walkable");
const spawnCheckbox = document.getElementById("spawn");
const saveBtn = document.getElementById("saveBtn");
const prevSpritesBtn = document.getElementById("prevSprites");
const nextSpritesBtn = document.getElementById("nextSprites");
const brushSizeSelect = document.getElementById("brushSize");
const floorUpBtn = document.getElementById("floorUp");
const floorDownBtn = document.getElementById("floorDown");
const floorDisplay = document.getElementById("floorDisplay");

const floorUpTileBtn = document.getElementById("floorUpTileBtn");
const floorDownTileBtn = document.getElementById("floorDownTileBtn");

const floorValueInput = document.getElementById("floorValueInput");
const typeSelect = document.getElementById("typeSelect");



// -------------------- SALVAR MAP (Node.js / Electron) --------------------
const fs = require('fs');
const path = require('path');

const tileSize = 64;
const mapSize = 500; // mapa real
const viewWidth = canvas.width / tileSize;  // tiles visíveis horizontal
const viewHeight = canvas.height / tileSize; // tiles visíveis vertical

let mapData = [];
const maxFloors = 5;          // número de andares
let currentFloor = 1;          // andar inicial
let floorData = [];            // guarda cada andar

// inicializa cada andar com a mesma estrutura do mapa
for (let z = 0; z < maxFloors; z++) {
    const map = [];
    for (let y = 0; y < mapSize; y++) {
        map[y] = [];
        for (let x = 0; x < mapSize; x++) {
            map[y][x] = { ground: [], walkable: true, spawn: null, entities: [] };
        }
    }
    floorData.push(map);
}

// atualiza mapData para o andar atual
function setCurrentMapData() {
    mapData = floorData[currentFloor - 1];
}
setCurrentMapData();

function updateFloorDisplay() {
    floorDisplay.textContent = `Andar: ${currentFloor}`;
}
updateFloorDisplay();

floorUpBtn.addEventListener("click", () => {
    if (currentFloor < maxFloors) {
        currentFloor++;
        setCurrentMapData();
        updateFloorDisplay();
        render();
    }
});

floorDownBtn.addEventListener("click", () => {
    if (currentFloor > 1) {
        currentFloor--;
        setCurrentMapData();
        updateFloorDisplay();
        render();
    }
});
// Botão TYPE: aplica o valor do select typeSelect ao tile selecionado
document.getElementById("addTypeBtn").addEventListener("click", () => {
    const tile = mapData[cursorY][cursorX];
    tile.type = typeSelect.value || undefined;
    render();
    // Atualiza display da célula
    var arr = [tile.ground.join(",")];
    if (tile.up) { arr.push("UP(" + tile.up + ")"); }
    if (tile.down) { arr.push("DOWN(" + tile.down + ")"); }
    arr.push(tile.walkable ? "S" : "N");
    if (tile.spawn) { arr.push("SPAWN(" + tile.spawn + ")"); }
    if (tile.type) { arr.push("TYPE(" + tile.type.toUpperCase() + ")"); }
    tileContentSpan.textContent = "[" + arr.join(",") + "]";
});

// Removido: let sprites = new Map();
// Carrega o índice de sprites para mapear número -> pasta
const spriteIndex = (() => {
    try {
        const fs = require('fs');
        const path = require('path');
        const indexPath = path.join(__dirname, '../client/assets/sprites/sprites_index.json');
        if (fs.existsSync(indexPath)) {
            return JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        }
    } catch (e) {
        console.error('Erro ao carregar sprites_index.json:', e);
    }
    return {};
})();
let selectedSpriteId = null;
let spritePage = 0;
const spritesPerPage = 250;

let cursorX = 0;
let cursorY = 0;
let cameraX = 0;
let cameraY = 0;

let clipboard = null; // guarda o conteúdo da célula/copiar
let undoStack = [];   // pilha de ações para Ctrl+Z


const spriteSearch = document.getElementById("spriteSearch");
const spriteGroupSearch = document.getElementById("spriteGroupSearch");
const deselectSpriteBtn = document.getElementById("deselectSprite");
const tileXSpan = document.getElementById("tileX");
const tileYSpan = document.getElementById("tileY");
const tileContentSpan = document.getElementById("tileContent");

let spriteFilter = ""; // filtro de busca
let spriteGroupFilter = null;
const totalSprites = 65000;

// Inicializa matriz
for (let y = 0; y < mapSize; y++) {
  mapData[y] = [];
  for (let x = 0; x < mapSize; x++) {
    mapData[y][x] = { ground: [], walkable: true, spawn: null, entities: [] };
  }
}


// -------------------- Botão desselecionar --------------------
deselectSpriteBtn.addEventListener("click", () => {
    selectedSpriteId = null;
    document.querySelectorAll(".sprite").forEach(s => s.classList.remove("selected"));
});

spriteSearch.addEventListener("input", () => {
    spriteFilter = spriteSearch.value.trim();
    // Se for um número válido, busca em todas as pastas
    const id = parseInt(spriteFilter);
    if (!isNaN(id) && id >= 1 && id <= totalSprites) {
        let foundFolder = null;
        for (const folder of spriteFolders) {
            const fs = require('fs');
            const path = require('path');
            const spritePath = path.join(__dirname, '../client/assets/sprites', folder, `${id}.png`);
            if (fs.existsSync(spritePath)) {
                foundFolder = folder;
                break;
            }
        }
        if (foundFolder) {
            selectedSpriteFolder = foundFolder;
            spriteFolderSelect.value = foundFolder;
        }
        spriteGroupFilter = null;
        spriteGroupSearch.value = "";
    } else {
        spriteGroupFilter = null;
        spriteGroupSearch.value = "";
    }
    renderSpriteList();
});

spriteGroupSearch.addEventListener("input", () => {
    const val = parseInt(spriteGroupSearch.value);
    if (!isNaN(val) && val >= 1) {
        spriteGroupFilter = val;
        spriteFilter = ""; // limpa filtro de ID ao digitar grupo
        renderSpriteList();
    }
});


// -------------------- CARREGAR SPRITES --------------------

let loadedSprites = new Map(); // cache de sprites já carregadas

// --- Pastas de sprites ---
const spriteFolderSelect = document.getElementById("spriteFolderSelect");
let spriteFolders = [
    "animacoes_damage",
    "cenario",
    "chao",
    "items",
    "liquidos_chao",
    "monstros_tibia",
    "monstro_tibia_dead",
    "objetos_com_actions",
    "outfit_players",
    "paredes",
    "pokeball",
    "pokemons",
    "pokemon_dead",
    "portas"
];
let selectedSpriteFolder = spriteFolders[0];

function populateSpriteFolderSelect() {
    spriteFolderSelect.innerHTML = "";
    spriteFolders.forEach(folder => {
        const option = document.createElement("option");
        option.value = folder;
        option.textContent = folder;
        spriteFolderSelect.appendChild(option);
    });
    spriteFolderSelect.value = selectedSpriteFolder;
}

spriteFolderSelect.addEventListener("change", () => {
    selectedSpriteFolder = spriteFolderSelect.value;
    renderSpriteList();
});

async function loadSpritesPage(page) {
    const start = page * spritesPerPage + 1;
    const end = Math.min(start + spritesPerPage - 1, 65000); // limite total

    const promises = [];
    for (let i = start; i <= end; i++) {
        if (loadedSprites.has(i)) continue; // já carregada

        const img = new Image();
        img.src = `../assets/sprites/${i}.png`;
        const p = new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
        });
        promises.push(p);
        loadedSprites.set(i, img);
    }

    await Promise.all(promises);
}



const spawnNameInput = document.getElementById("spawnName");

spawnCheckbox.addEventListener("change", () => {
    spawnNameInput.disabled = !spawnCheckbox.checked;
});
canvas.addEventListener("click", async (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left)/tileSize) + cameraX;
    const y = Math.floor((e.clientY - rect.top)/tileSize) + cameraY;
    const size = parseInt(brushSizeSelect.value);
    const half = Math.floor(size / 2);

    // guarda o estado atual do bloco para desfazer
    const undoBlock = [];

    for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= mapSize || ny >= mapSize) continue;

            const ntile = mapData[ny][nx];

            // salva cópia para undo
            undoBlock.push({
                x: nx,
                y: ny,
                tile: { 
                    ground: [...ntile.ground],
                    walkable: ntile.walkable,
                    spawn: ntile.spawn,
                    entities: [...ntile.entities.map(e => ({...e}))]
                }
            });

            if (selectedSpriteId) {
                if (typeof selectedSpriteId === 'number' && !ntile.ground.includes(selectedSpriteId)) {
                    ntile.ground.push(selectedSpriteId);
                    // Limpa cache da sprite para garantir recarregamento
                    let spritePath = null;
                    const folder = spriteIndex[selectedSpriteId];
                    if (folder !== undefined && folder !== null && folder !== "") {
                        spritePath = `${folder}/${selectedSpriteId}.png`;
                        loadedSprites.delete(spritePath);
                    } else if (folder === "") {
                        spritePath = `${selectedSpriteId}.png`;
                        loadedSprites.delete(spritePath);
                    } else {
                        // Tenta buscar em todas as pastas
                        for (const f of spriteFolders) {
                            const testPath = `${f}/${selectedSpriteId}.png`;
                            loadedSprites.delete(testPath);
                        }
                    }
                }
            }

            ntile.walkable = walkableCheckbox.checked;
            ntile.spawn = spawnCheckbox.checked && spawnNameInput.value.trim() !== "" ? spawnNameInput.value.trim() : null;
            // Só aplica o TYPE se o brush for maior que 1 (pincel), ou se o usuário estiver desenhando
            if (size > 1) {
                ntile.type = typeSelect.value || undefined;
            }

        }
    }

    // adiciona à pilha de undo
    undoStack.push(undoBlock);

    cursorX = x; cursorY = y;

    tileXSpan.textContent = x;
    tileYSpan.textContent = y;
    // Mostra UP/DOWN no conteúdo
    let arr = [mapData[y][x].ground.join(",")];
    if (mapData[y][x].up !== undefined) arr.push(`UP(${mapData[y][x].up})`);
    if (mapData[y][x].down !== undefined) arr.push(`DOWN(${mapData[y][x].down})`);
    arr.push(mapData[y][x].walkable ? "S" : "N");
    if (mapData[y][x].spawn) arr.push(`SPAWN(${mapData[y][x].spawn})`);
    if (mapData[y][x].type) arr.push(`TYPE(${mapData[y][x].type.toUpperCase()})`);
    tileContentSpan.textContent = `[${arr.join(",")}]`;
    // Atualiza o select TYPE
    if (mapData[y][x].type) {
        typeSelect.value = mapData[y][x].type;
    } else {
        typeSelect.value = "";
    }

    render();
});




// -------------------- RENDERIZAÇÃO DA LISTA DE SPRITES --------------------
async function renderSpriteList() {
    spriteListDiv.innerHTML = '';

    // Busca arquivos da pasta selecionada
    const folder = selectedSpriteFolder;
    const fs = require('fs');
    const path = require('path');
    const folderPath = path.join(__dirname, '../client/assets/sprites', folder);
    let files = [];
    try {
        files = fs.readdirSync(folderPath).filter(f => f.endsWith('.png'));
    } catch (err) {
        console.error('Erro ao ler pasta de sprites:', folderPath, err);
    }

    files.forEach(file => {
        const img = document.createElement("img");
        // Corrige o caminho para ser relativo ao HTML
        img.src = `../client/assets/sprites/${folder}/${file}`;
        img.title = file;
        img.classList.add("sprite");
        img.addEventListener("click", () => {
            document.querySelectorAll(".sprite").forEach(s => s.classList.remove("selected"));
            img.classList.add("selected");
            // Extrai apenas o número do arquivo (ex: 123.png -> 123)
            const match = file.match(/^(\d+)\.png$/);
            if (match) {
                selectedSpriteId = parseInt(match[1], 10);
            } else {
                selectedSpriteId = null;
            }
            render(); // Atualiza o canvas ao selecionar sprite
        });
        spriteListDiv.appendChild(img);
    });
}


// -------------------- Navegação de páginas --------------------
prevSpritesBtn.addEventListener("click", async () => {
    if (spritePage > 0) spritePage--;
    await renderSpriteList();
});

nextSpritesBtn.addEventListener("click", async () => {
    spritePage++;
    await renderSpriteList();
});

// -------------------- PARSE MAPA --------------------

function parseCell(cell) {
    if (!cell.startsWith("[") || !cell.endsWith("]")) return { ground: [], walkable: true, spawn: null, entities: [], up: undefined, down: undefined };

    const raw = cell.slice(1, -1).split(",");
    const tile = { ground: [], walkable: true, spawn: null, entities: [], up: undefined, down: undefined };

    for (let item of raw) {
        item = item.trim();
        // Aceita números como spriteId
        if (/^\d+$/.test(item)) tile.ground.push(Number(item));
        else if (item.includes("/") && item.endsWith(".png")) tile.ground.push(item);
        else if (item === "S") tile.walkable = true;
        else if (item === "N") tile.walkable = false;
        else if (item.startsWith("UP(") && item.endsWith(")")) tile.up = parseInt(item.slice(3, -1));
        else if (item.startsWith("DOWN(") && item.endsWith(")")) tile.down = parseInt(item.slice(5, -1));
        else if (item.startsWith("SPAWN(") && item.endsWith(")")) 
            tile.entities.push({ type: "pokemon", name: item.slice(6, -1) });
        else if (item.startsWith("TYPE(") && item.endsWith(")"))
            tile.type = item.slice(5, -1).toLowerCase();
    }

    // Para compatibilidade, se houver SPAWN, também popular tile.spawn
    const spawnEntity = tile.entities.find(e => e.type === "pokemon");
    if (spawnEntity) tile.spawn = spawnEntity.name;

    return tile;
}

async function loadAllFloors() {
    for (let z = 1; z <= maxFloors; z++) {
        try {
            const txt = await fetch(`./map_z${z}.txt`).then(r => r.text());
            const lines = txt.split("\n");

            for (let y = 0; y < mapSize; y++) {
                if (!lines[y]) continue;
                const row = lines[y].trim().split(/\s+/);
                for (let x = 0; x < mapSize; x++) {
                    if (!row[x]) continue;
                    floorData[z-1][y][x] = parseCell(row[x]);
                }
            }
        } catch(err) {
            console.warn(`Não foi possível carregar map_z${z}.txt:`, err);
        }
    }
    setCurrentMapData();
}



async function loadMap(path) {
    const txt = await fetch(path).then(r => r.text());
    const lines = txt.split("\n");

    // inicializa matriz
    mapData = Array.from({ length: mapSize }, () => 
        Array.from({ length: mapSize }, () => ({ ground: [], walkable: true, spawn: null, entities: [] }))
    );

    for (let y = 0; y < mapSize; y++) {
        if (!lines[y]) continue;
        const row = lines[y].trim().split(/\s+/);
        for (let x = 0; x < mapSize; x++) {
            if (!row[x]) continue;
            mapData[y][x] = parseCell(row[x]);
        }
    }
}

// -------------------- RENDER DO MAPA --------------------
function render() {
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // Renderiza múltiplos andares: z atual, z-1, z-2 (se existirem)
    for (let vy = 0; vy < viewHeight; vy++) {
        for (let vx = 0; vx < viewWidth; vx++) {
            const mx = cameraX + vx;
            const my = cameraY + vy;
            if (mx >= mapSize || my >= mapSize) continue;

            // Renderiza do mais baixo para o mais alto (apenas sprites)
            for (let dz = 2; dz >= 0; dz--) {
                const z = currentFloor - dz - 1; // floorData é 0-based
                if (z < 0 || z >= maxFloors) continue;
                const tile = floorData[z][my][mx];
                if (!tile) continue;

                // Opacidade: z atual = 1, z-1 = 0.7, z-2 = 0.5
                let alpha = 1.0;
                if (dz === 1) alpha = 0.7;
                if (dz === 2) alpha = 0.5;
                ctx.save();
                ctx.globalAlpha = alpha;

                // DESENHA SPRITES EMPILHADAS
                tile.ground.forEach(id => {
                    let spritePath = null;
                    let found = false;
                    if (typeof id === 'number' || (/^\d+$/.test(id))) {
                        const folder = spriteIndex[id];
                        if (folder !== undefined && folder !== null && folder !== "") {
                            spritePath = `${folder}/${id}.png`;
                            found = true;
                        } else if (folder === "") {
                            spritePath = `${id}.png`;
                            found = true;
                        } else {
                            // Tenta buscar em todas as pastas
                            for (const f of spriteFolders) {
                                const testPath = `${f}/${id}.png`;
                                let img = loadedSprites.get(testPath);
                                if (!img) {
                                    img = new Image();
                                    img.src = `../client/assets/sprites/${testPath}`;
                                    img.onload = () => render();
                                    loadedSprites.set(testPath, img);
                                }
                                if (img.complete && img.naturalWidth > 0) {
                                    ctx.drawImage(img, vx*tileSize, vy*tileSize, tileSize, tileSize);
                                    found = true;
                                    break;
                                }
                            }
                        }
                    }
                    if (found && spritePath) {
                        let img = loadedSprites.get(spritePath);
                        if (!img) {
                            img = new Image();
                            img.src = `../client/assets/sprites/${spritePath}`;
                            img.onload = () => render();
                            loadedSprites.set(spritePath, img);
                        }
                        if (img.complete && img.naturalWidth > 0) {
                            ctx.drawImage(img, vx*tileSize, vy*tileSize, tileSize, tileSize);
                        }
                    } else if (!found) {
                        // id não existe, mostra placeholder
                        ctx.save();
                        ctx.strokeStyle = "red";
                        ctx.lineWidth = 3;
                        ctx.strokeRect(vx*tileSize, vy*tileSize, tileSize, tileSize);
                        ctx.restore();
                    }
                });
                ctx.restore();
            }

            // --- OVERLAYS, GRID E BORDAS: sempre do andar atual ---
            const tile = floorData[currentFloor-1][my][mx];
            if (tile) {
                // OVERLAY WALKABLE
                if (!tile.walkable) {
                    ctx.fillStyle = "rgba(255,0,0,0.3)";
                    ctx.fillRect(vx*tileSize, vy*tileSize, tileSize, tileSize);
                }

                // OVERLAY SPAWN
                if (tile.spawn || (tile.entities && tile.entities.length > 0)) {
                    ctx.fillStyle = "rgba(0,255,0,0.3)";
                    ctx.fillRect(vx*tileSize, vy*tileSize, tileSize, tileSize);
                }

                // OVERLAY UP/DOWN + desenha seta e número
                if (tile.up !== undefined || tile.down !== undefined) {
                    ctx.fillStyle = "rgba(255,255,0,0.3)"; // amarelo transparente
                    ctx.fillRect(vx*tileSize, vy*tileSize, tileSize, tileSize);

                    ctx.save();
                    ctx.font = Math.floor(tileSize * 0.5) + "px Arial";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    let text = "";
                    let color = "#bfa800";
                    if (tile.up !== undefined) {
                        text = `↑${tile.up}`;
                    }
                    if (tile.down !== undefined) {
                        // Se tiver up e down, mostra ambos, um em cima do outro
                        if (tile.up !== undefined) {
                            ctx.fillStyle = color;
                            ctx.fillText(`↑${tile.up}`,
                                vx*tileSize + tileSize/2,
                                vy*tileSize + tileSize*0.33
                            );
                            ctx.fillStyle = color;
                            ctx.fillText(`↓${tile.down}`,
                                vx*tileSize + tileSize/2,
                                vy*tileSize + tileSize*0.67
                            );
                            ctx.restore();
                            // OVERLAY TYPE (após up/down)
                            if (tile.type === "house") {
                                ctx.fillStyle = "rgba(0, 0, 128, 0.35)";
                                ctx.fillRect(vx*tileSize, vy*tileSize, tileSize, tileSize);
                            } else if (tile.type === "construcao") {
                                ctx.fillStyle = "rgba(100, 180, 255, 0.35)";
                                ctx.fillRect(vx*tileSize, vy*tileSize, tileSize, tileSize);
                            } else if (tile.type === "floor") {
                                ctx.fillStyle = "rgba(180, 0, 90, 0.35)";
                                ctx.fillRect(vx*tileSize, vy*tileSize, tileSize, tileSize);
                            }
                            continue;
                        } else {
                            text = `↓${tile.down}`;
                        }
                    }
                    ctx.fillStyle = color;
                    ctx.fillText(text, vx*tileSize + tileSize/2, vy*tileSize + tileSize/2);
                    ctx.restore();
                }

                // OVERLAY TYPE (após overlays principais)
                if (tile.type === "house") {
                    ctx.fillStyle = "rgba(0, 0, 128, 0.55)"; // azul escuro mais visível
                    ctx.fillRect(vx*tileSize, vy*tileSize, tileSize, tileSize);
                } else if (tile.type === "construcao") {
                    ctx.fillStyle = "rgba(100, 180, 255, 0.35)";
                    ctx.fillRect(vx*tileSize, vy*tileSize, tileSize, tileSize);
                } else if (tile.type === "floor") {
                    ctx.fillStyle = "rgba(180, 0, 90, 0.35)";
                    ctx.fillRect(vx*tileSize, vy*tileSize, tileSize, tileSize);
                }
            }
            // GRID/BORDA sempre
            ctx.strokeStyle = "gray";
            ctx.strokeRect(vx*tileSize, vy*tileSize, tileSize, tileSize);
        }
    }

    // PREVIEW DA SPRITE SELECIONADA SOB O CURSOR
    if (typeof selectedSpriteId === 'number') {
        const folder = spriteIndex[selectedSpriteId];
        if (folder) {
            const spritePath = `${folder}/${selectedSpriteId}.png`;
            let img = loadedSprites.get(spritePath);
            if (!img) {
                img = new Image();
                img.src = `../client/assets/sprites/${spritePath}`;
                img.onload = () => render();
                loadedSprites.set(spritePath, img);
            }
            if (img.complete && img.naturalWidth > 0) {
                ctx.globalAlpha = 0.7;
                ctx.drawImage(img, (cursorX-cameraX)*tileSize, (cursorY-cameraY)*tileSize, tileSize, tileSize);
                ctx.globalAlpha = 1.0;
            }
        }
    }

    // CURSOR
    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 2;
    ctx.strokeRect((cursorX-cameraX)*tileSize, (cursorY-cameraY)*tileSize, tileSize, tileSize);

    // Contorno vermelho para brushSize
    const brushSize = parseInt(brushSizeSelect.value);
    const half = Math.floor(brushSize / 2);
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.strokeRect(
        (cursorX - half - cameraX) * tileSize,
        (cursorY - half - cameraY) * tileSize,
        brushSize * tileSize,
        brushSize * tileSize
    );

}


// -------------------- CLIQUE NA GRID --------------------
canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / tileSize) + cameraX;
  const y = Math.floor((e.clientY - rect.top) / tileSize) + cameraY;
    const tile = mapData[y][x];

    // Só permite sprites numéricos
    if (typeof selectedSpriteId === 'number' && !tile.ground.includes(selectedSpriteId)) {
        tile.ground.push(selectedSpriteId);
    }
    tile.walkable = walkableCheckbox.checked;
    tile.spawn = spawnCheckbox.checked ? spawnNameInput.value.trim() || "POKEMON" : null;
    // Salva o tipo selecionado
    tile.type = typeSelect.value || undefined;

    cursorX = x; cursorY = y;
    // Atualiza display da célula
        tileXSpan.textContent = x;
        tileYSpan.textContent = y;
        tileContentSpan.textContent = `[${tile.ground.join(",")},${tile.walkable ? "S" : "N"}${tile.spawn ? ",SPAWN(" + tile.spawn + ")" : ""}]`;

    render();
});

// -------------------- TECLADO --------------------
document.addEventListener("keydown", (e) => {

  const ctrl = e.ctrlKey || e.metaKey; // suporta Ctrl ou Command

    // ------------------ COPIAR ------------------
    if (ctrl && e.key.toLowerCase() === "c") {
        const size = parseInt(brushSizeSelect.value);
        const half = Math.floor(size / 2);
        clipboard = [];

        for (let dy = -half; dy <= half; dy++) {
            const row = [];
            for (let dx = -half; dx <= half; dx++) {
                const nx = cursorX + dx;
                const ny = cursorY + dy;
                if (nx < 0 || ny < 0 || nx >= mapSize || ny >= mapSize) {
                    row.push(null);
                } else {
                    row.push(JSON.parse(JSON.stringify(mapData[ny][nx])));
                }
            }
            clipboard.push(row);
        }

        e.preventDefault();
        console.log("Área copiada:", clipboard);
    }


    // ------------------ COLAR ------------------
    if (ctrl && e.key.toLowerCase() === "v" && clipboard) {
        const size = clipboard.length;
        const half = Math.floor(size / 2);
        const undoBlock = [];

        for (let dy = 0; dy < size; dy++) {
            for (let dx = 0; dx < size; dx++) {
                const nx = cursorX + dx - half;
                const ny = cursorY + dy - half;
                if (nx < 0 || ny < 0 || nx >= mapSize || ny >= mapSize) continue;
                const ntile = mapData[ny][nx];
                const sourceTile = clipboard[dy][dx];
                if (!sourceTile) continue;

                // adiciona undo
                undoBlock.push({
                    x: nx,
                    y: ny,
                    tile: {
                        ground: [...ntile.ground],
                        walkable: ntile.walkable,
                        spawn: ntile.spawn,
                        entities: [...ntile.entities.map(e => ({...e}))]
                    }
                });

                // cola
                ntile.ground = [...sourceTile.ground];
                ntile.walkable = sourceTile.walkable;
                ntile.spawn = sourceTile.spawn;
                ntile.entities = [...sourceTile.entities.map(e => ({...e}))];
            }
        }

        undoStack.push(undoBlock);
        render();
        e.preventDefault();
        console.log("Área colada");
    }


    // ------------------ DESFAZER ------------------
    if (ctrl && e.key.toLowerCase() === "z") {
        if (undoStack.length === 0) return;

        const lastAction = undoStack.pop();
        lastAction.forEach(a => {
            mapData[a.y][a.x] = {
                ground: [...a.tile.ground],
                walkable: a.tile.walkable,
                spawn: a.tile.spawn,
                entities: [...a.tile.entities.map(e => ({...e}))]
            };
        });
        render();
        e.preventDefault();
        console.log("Undo");
    }
  if (e.key === "ArrowUp") cursorY = Math.max(0, cursorY - 1);
  if (e.key === "ArrowDown") cursorY = Math.min(mapSize - 1, cursorY + 1);
  if (e.key === "ArrowLeft") cursorX = Math.max(0, cursorX - 1);
  if (e.key === "ArrowRight") cursorX = Math.min(mapSize - 1, cursorX + 1);
  if (e.key === "Delete") {
    const tile = mapData[cursorY][cursorX];
    tile.ground = [];
    tile.walkable = true;
    tile.spawn = null;
    tile.entities = [];
  }

  // Ajusta câmera para manter cursor visível
  if (cursorX < cameraX) cameraX = cursorX;
  if (cursorY < cameraY) cameraY = cursorY;
  if (cursorX >= cameraX + viewWidth) cameraX = cursorX - viewWidth + 1;
  if (cursorY >= cameraY + viewHeight) cameraY = cursorY - viewHeight + 1;

  render();
});


saveBtn.addEventListener("click", () => {
    floorData.forEach((map, index) => {
        let txt = "";
        for (let y = 0; y < mapSize; y++) {
            for (let x = 0; x < mapSize; x++) {
                const t = map[y][x];
                const s = t.ground.join(",");
                let vertical = "";
                if (t.up) vertical += `UP(${t.up})`;
                if (t.down) vertical += (vertical ? "," : "") + `DOWN(${t.down})`;
                const w = t.walkable ? "S" : "N";
                const sp = t.spawn ? `SPAWN(${t.spawn})` : "";

                // Ordem correta: [ground,UP...,DOWN...,S/N,SPAWN,TYPE]
                let arr = [s];
                if (vertical) arr.push(vertical);
                arr.push(w);
                if (sp) arr.push(sp);
                if (t.type) arr.push(`TYPE(${t.type.toUpperCase()})`);
                txt += `[${arr.join(",")}] `;
            }
            txt += "\n";
        }
        const mapPath = path.join(__dirname, `map_z${index+1}.txt`);
        fs.writeFile(mapPath, txt, err => {
            if (err) console.error("Erro ao salvar o mapa:", err);
            else console.log(`Mapa z${index+1} salvo com sucesso em:`, mapPath);
        });
    });
});

floorUpTileBtn.addEventListener("click", () => {
    const tile = mapData[cursorY][cursorX];
    const val = parseInt(floorValueInput.value) || 0; // pega o valor do input, default 0
    tile.up = val;    // grava UP
    render();

    // Atualiza display da célula (UP/DOWN antes do S/N)
    var arr = [tile.ground.join(",")];
    if (tile.up) { arr.push("UP(" + tile.up + ")"); }
    if (tile.down) { arr.push("DOWN(" + tile.down + ")"); }
    arr.push(tile.walkable ? "S" : "N");
    if (tile.spawn) { arr.push("SPAWN(" + tile.spawn + ")"); }
    tileContentSpan.textContent = "[" + arr.join(",") + "]";
});

floorDownTileBtn.addEventListener("click", () => {
    const tile = mapData[cursorY][cursorX];
    const val = parseInt(floorValueInput.value) || 0;
    tile.down = val;  // grava DOWN
    render();

    // Atualiza display da célula (UP/DOWN antes do S/N)
    var arr = [tile.ground.join(",")];
    if (tile.up) { arr.push("UP(" + tile.up + ")"); }
    if (tile.down) { arr.push("DOWN(" + tile.down + ")"); }
    arr.push(tile.walkable ? "S" : "N");
    if (tile.spawn) { arr.push("SPAWN(" + tile.spawn + ")"); }
    tileContentSpan.textContent = "[" + arr.join(",") + "]";
});



// -------------------- INICIALIZA --------------------
async function initialize() {
    await loadAllFloors();


    // Inicializa select box de pastas
    populateSpriteFolderSelect();
    renderSpriteList();

    // Descobre todas as sprites usadas em TODOS os andares
    const spriteIds = new Set();
    for (let z = 0; z < maxFloors; z++) {
        const map = floorData[z];
        for (let y = 0; y < mapSize; y++) {
            for (let x = 0; x < mapSize; x++) {
                map[y][x].ground.forEach(id => spriteIds.add(id));
            }
        }
    }

    // Carrega todas as sprites usadas em TODOS os andares
    const promises = [];
    spriteIds.forEach(function(id) {
        if (!sprites.has(id)) {
            var img = new window.Image();
            img.src = "../client/assets/sprites/" + id + ".png";
            var p = new Promise(function(resolve) {
                img.onload = resolve;
                img.onerror = resolve;
            });
            promises.push(p);
            sprites.set(id, img);
        }
    });

    await Promise.all(promises);
    render(); // renderiza só depois que todas imagens do mapa estiverem prontas
}

initialize();

