/**
 * ========================================
 * MENU.JS - Menu e Inicialização
 * ========================================
 *
 * Responsável por:
 * - Telas de login/registro
 * - Seleção de personagem
 * - Inicialização do Game (authoritative client)
 */

import { Game } from "./core/Game.js";
import { GameConstants } from "../shared/constants/GameConstants.js";

const canvas = document.getElementById("gameCanvas");

document.body.style.margin = "0";
canvas.style.display = "block";
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Redesenha e recalcula campos ao redimensionar
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (menuState === 'login') {
        initLoginFields();
        drawLogin();
    } else if (menuState === 'characterSelect') {
        drawCharacterSelect(accountData);
    } else {
        draw();
    }
});


// Chama initLoginFields ao iniciar (após declarar variáveis)
let menuState = "login"; // login, register, characterSelect
let inputFields = [];
let currentInput = 0;
initLoginFields();

let authToken = null;
let accountData = null;
let selectedCharacter = null;

const ctx = canvas.getContext("2d");
let game = null;

// === Funções de Backend ===
const API_BASE = "http://localhost:3001"; // Altere para o endpoint do novo servidor

async function register(username, password, email) {
    const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, email })
    });
    return await res.json();
}

async function login(username, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    });
    return await res.json();
}

async function getPlayer(token) {
    const res = await fetch(`${API_BASE}/player/me`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${token}` }
    });
    return await res.json();
}

function createInputField(x, y, placeholder, type = "text") {
    inputFields.push({ x, y, value: "", placeholder, type });
}
const background = new Image();
background.src = "assets/wallpaper.png";

let backgroundLoaded = false;
background.onload = () => {
    backgroundLoaded = true;
    draw();
};
function drawBackground() {
    if (backgroundLoaded) {
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = "#222";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}
function drawOverlay() {
    ctx.fillStyle = "rgba(50, 50, 50, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function initLoginFields() {
    inputFields = [];
    // Box login centralizado (ainda maior e inputs centralizados)
    const boxW = 360, boxH = 340;
    const boxX = canvas.width/2 - boxW/2;
    const boxY = canvas.height/2 - boxH/2;
    // Inputs centralizados dentro do box
    const inputW = 240;
    const inputX = boxX + (boxW - inputW) / 2;
    createInputField(inputX, boxY + 150, "Username");
    createInputField(inputX, boxY + 200, "Password", "password");
}

function drawLogin() {
    drawBackground();
    drawOverlay();
    ctx.save();
    // Nome do jogo centralizado acima do box
    ctx.font = "32px Arial Black, Arial, sans-serif";
    ctx.fillStyle = "#FFD700";
    ctx.textAlign = "center";
    ctx.fillText(GameConstants.NAME_GAME, canvas.width/2, canvas.height/2 - 170);
    // Mensagem do dia abaixo do nome
    ctx.font = "16px Arial";
    ctx.fillStyle = "#fff";
    ctx.fillText(GameConstants.MESSAGE_OF_THE_DAY, canvas.width/2, canvas.height/2 - 140);

    // Box branco ao redor do bloco de login, preenchido
    const boxW = 260, boxH = 220;
    const boxX = canvas.width/2 - boxW/2;
    const boxY = canvas.height/2 - 70;
    ctx.save();
    ctx.fillStyle = "rgba(73, 18, 18, 0.1)";
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.strokeRect(boxX, boxY, boxW, boxH);
    ctx.restore();
    // Título dentro do box, mais próximo do topo
    ctx.fillStyle = "white";
    ctx.font = "24px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Login", boxX + boxW/2, boxY+30);
    ctx.font = "14px Arial";
    inputFields.forEach((field, i) => {
        ctx.strokeStyle = i === currentInput ? "#FFD700" : "white";
        ctx.lineWidth = 2;
        ctx.strokeRect(field.x, field.y, 240, 34);
        ctx.fillStyle = "white";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        const txt = field.value.length ? field.value : field.placeholder;
        ctx.fillText(txt, field.x + 8, field.y + 17);
    });
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.font = "14px Arial";
    ctx.fillText("Press Enter to submit", boxX + boxW/2, boxY + boxH - 36);
    ctx.restore();
}

function drawCharacterSelect(playerData) {
    drawBackground();
    drawOverlay();
    ctx.save();
    ctx.fillStyle = "white";
    ctx.font = "24px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Select Character", canvas.width/2, 170);
    const chars = accountData.characters || [];
    // Box config
    const boxWidth = 340;
    const boxHeight = 8 * 44 + 20; // 8 chars, 44px cada, padding
    const boxX = canvas.width/2 - boxWidth/2;
    const boxY = canvas.height/2 - boxHeight/2 + 20;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
    // Scroll logic
    let startIdx = 0;
    if (chars.length > 8) {
        if (selectedCharacter < 4) startIdx = 0;
        else if (selectedCharacter > chars.length - 5) startIdx = chars.length - 8;
        else startIdx = selectedCharacter - 4;
    }
    if (chars.length > 0) {
        ctx.font = "18px Arial";
        for (let i = 0; i < Math.min(8, chars.length); i++) {
            const idx = startIdx + i;
            const c = chars[idx];
            const itemY = boxY + 10 + i * 44;
            // Fundo do item
            ctx.fillStyle = idx === selectedCharacter ? "rgba(255,215,0,0.13)" : "rgba(255,255,255,0.04)";
            ctx.fillRect(boxX + 8, itemY, boxWidth - 16, 38);
            // Borda amarela se selecionado
            if (idx === selectedCharacter) {
                ctx.strokeStyle = "#FFD700";
                ctx.lineWidth = 3;
                ctx.strokeRect(boxX + 8, itemY, boxWidth - 16, 38);
            }
            ctx.fillStyle = "#fff";
            ctx.textAlign = "left";
            ctx.font = "18px Arial";
            ctx.fillText(c.name, boxX + 28, itemY + 24);
        }
        // Indicadores de scroll
        if (chars.length > 8 && startIdx > 0) {
            ctx.fillStyle = "#fff";
            ctx.font = "20px Arial";
            ctx.fillText("▲", canvas.width/2, boxY + 0);
        }
        if (chars.length > 8 && startIdx + 8 < chars.length) {
            ctx.fillStyle = "#fff";
            ctx.font = "20px Arial";
            ctx.fillText("▼", canvas.width/2, boxY + boxHeight - 8);
        }
    } else {
        ctx.font = "16px Arial";
        ctx.fillText("No characters found. Press Enter to create!", canvas.width/2, canvas.height/2);
    }
    ctx.font = "14px Arial";
    ctx.fillStyle = "#fff";
    ctx.fillText("Press Enter to play / C to create new", canvas.width/2 -100, canvas.height - 180);
    ctx.restore();
}

window.addEventListener("keydown", async (e) => {
    if (game !== null) return;
    if(e.key === "Escape" || e.key === "ArrowLeft") {
        switch(menuState) {
            case "characterSelect":
                if(creatingCharacter) {
                    creatingCharacter = false;
                } else {
                    menuState = "login";
                    initLoginFields();
                }
                break;
            case "register":
                menuState = "login";
                initLoginFields();
                break;
            case "login":
                break;
        }
        draw();
        return;
    }
    if(menuState === "login" || menuState === "register") {
        const field = inputFields[currentInput];
        switch(e.key) {
            case "Tab":
                currentInput = (currentInput + 1) % inputFields.length;
                e.preventDefault();
                break;
            case "Backspace":
                field.value = field.value.slice(0, -1);
                break;
            case "Enter":
                if(menuState === "login") {
                    const username = inputFields[0].value;
                    const password = inputFields[1].value;
                    const res = await login(username, password);
                    if(res.token) {
                        authToken = res.token;
                        const playerData = await getPlayer(authToken);
                        accountData = res.account;
                        accountData.characters = playerData.characters || [];
                        selectedCharacter = 0;
                        if(accountData.characters.length === 0){
                            creatingCharacter = true;
                        }
                        menuState = "characterSelect";
                        draw();
                        return;
                    } else {
                        alert("Login failed");
                    }
                } else if(menuState === "register") {
                    const username = inputFields[0].value;
                    const password = inputFields[1].value;
                    const email = inputFields[2].value;
                    const res = await register(username, password, email);
                    if(res.success) {
                        alert("Account created! Please login.");
                        menuState = "login";
                        initLoginFields();
                    } else alert("Registration failed");
                }
                break;
            default:
                if(e.key.length === 1) field.value += e.key;
                break;
        }
        if(e.key.toLowerCase() === "r") {
            if(menuState === "login") initRegisterFields(), menuState="register";
            else if(menuState === "register") initLoginFields(), menuState="login";
        }
        draw();
        return;
    }
    if(menuState === "characterSelect") {
        if(creatingCharacter) {
            if(e.key === "Backspace") {
                newCharacterName = newCharacterName.slice(0,-1);
            } else if(e.key === "Enter") {
                if(newCharacterName.length === 0) return;
                const res = await fetch(`${API_BASE}/player/create`, {
                    method:"POST",
                    headers:{
                        "Content-Type":"application/json",
                        "Authorization":`Bearer ${authToken}`
                    },
                    body: JSON.stringify({ name: newCharacterName })
                });
                const data = await res.json();
                const characters = await getPlayer(authToken);
                accountData.characters = Array.isArray(characters) ? characters : [];
                selectedCharacter = accountData.characters.length - 1;
                creatingCharacter = false;
                newCharacterName = "";
                draw();
            } else if(e.key.length === 1 && newCharacterName.length < 12) {
                newCharacterName += e.key;
            }
            draw();
            return;
        }
        const chars = accountData.characters || [];
        switch(e.key) {
            case "ArrowDown":
                if(chars.length > 0) selectedCharacter = (selectedCharacter + 1) % chars.length;
                break;
            case "ArrowUp":
                if(chars.length > 0) selectedCharacter = (selectedCharacter - 1 + chars.length) % chars.length;
                break;
            case "Enter":
                if(chars.length === 0) {
                    creatingCharacter = true;
                    newCharacterName = "";
                } else {
                    const selectedChar = accountData.characters[selectedCharacter];
                    console.log("[Menu] Personagem selecionado:", selectedChar);
                    // Redireciona para index.html e passa o id do personagem via query string
                    window.location.href = `index.html?playerId=${selectedChar.id}`;
                }
                break;
            case "c":
            case "C":
                creatingCharacter = true;
                newCharacterName = "";
                break;
            default:
                break;
        }
        draw();
    }
});

function draw() {
    if (menuState === "login") drawLogin();
    else if (menuState === "register") drawRegister();
    else if (menuState === "characterSelect") {
        if(creatingCharacter) drawCharacterCreate();
        else drawCharacterSelect(accountData);
    }
}

function initRegisterFields() {
    inputFields = [];
    createInputField(canvas.width/2 - 100, canvas.height/2 - 80, "Username");
    createInputField(canvas.width/2 - 100, canvas.height/2 - 40, "Password", "password");
    createInputField(canvas.width/2 - 100, canvas.height/2, "Email");
}

function drawRegister() {
    drawBackground();
    drawOverlay();
    ctx.save();
    ctx.fillStyle = "white";
    ctx.font = "24px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Register", canvas.width/2, canvas.height/2 - 120);
    ctx.font = "14px Arial";
    inputFields.forEach((field, i) => {
        ctx.strokeStyle = i === currentInput ? "#FFD700" : "white";
        ctx.lineWidth = 2;
        ctx.strokeRect(field.x, field.y, 200, 30);
        ctx.fillStyle = "white";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        const txt = field.value.length ? field.value : field.placeholder;
        ctx.fillText(txt, field.x + 8, field.y + 15);
    });
    ctx.textAlign = "center";
    ctx.fillText("Press Enter to submit", canvas.width/2, canvas.height/2 + 60);
    ctx.restore();
}

function drawCharacterCreate() {
    drawBackground();
    drawOverlay();
    ctx.save();
    // Box amarelo ao redor do bloco de criação
    const boxW = 260, boxH = 220;
    const boxX = canvas.width/2 - boxW/2;
    const boxY = canvas.height/2 - 130;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.strokeRect(boxX, boxY, boxW, boxH);
    ctx.fillStyle = "white";
    ctx.font = "24px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Create New Character", canvas.width/2, canvas.height/2 - 100);
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 3;
    ctx.strokeRect(canvas.width/2 - 100, canvas.height/2 - 50, 200, 30);
    ctx.fillStyle = "white";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(newCharacterName || "Character Name", canvas.width/2 - 95, canvas.height/2 - 35);
    ctx.textAlign = "center";
    ctx.fillText("Press Enter to create", canvas.width/2, canvas.height/2 + 50);
    ctx.restore();
}

initLoginFields();
draw();
window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    draw();
});
let creatingCharacter = false;
let newCharacterName = "";
