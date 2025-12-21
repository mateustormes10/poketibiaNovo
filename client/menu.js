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

const canvas = document.getElementById("gameCanvas");

document.body.style.margin = "0";
canvas.style.display = "block";
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

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

let menuState = "login"; // login, register, characterSelect
let inputFields = [];
let currentInput = 0;

function createInputField(x, y, placeholder, type = "text") {
    inputFields.push({ x, y, value: "", placeholder, type });
}
const background = new Image();
background.src = "../assets/wallpaper.png";

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
    createInputField(canvas.width/2 - 100, canvas.height/2 - 50, "Username");
    createInputField(canvas.width/2 - 100, canvas.height/2, "Password", "password");
}

function drawLogin() {
    drawBackground();
    drawOverlay();
    ctx.save();
    ctx.fillStyle = "white";
    ctx.font = "24px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Login", canvas.width/2, canvas.height/2 - 100);
    ctx.font = "14px Arial";
    inputFields.forEach((field, i) => {
        ctx.strokeStyle = i === currentInput ? "yellow" : "white";
        ctx.lineWidth = 2;
        ctx.strokeRect(field.x, field.y, 200, 30);
        ctx.fillStyle = "white";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        const txt = field.value.length ? field.value : field.placeholder;
        ctx.fillText(txt, field.x + 8, field.y + 15);
    });
    ctx.textAlign = "center";
    ctx.fillText("Press Enter to submit", canvas.width/2, canvas.height/2 + 100);
    ctx.restore();
}

function drawCharacterSelect(playerData) {
    drawBackground();
    drawOverlay();
    ctx.save();
    ctx.fillStyle = "white";
    ctx.font = "24px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Select Character", canvas.width/2, 50);
    const chars = accountData.characters || [];
    if (chars.length > 0) {
        ctx.font = "18px Arial";
        chars.forEach((c, i) => {
            ctx.fillStyle = selectedCharacter === i ? "yellow" : "white";
            ctx.textAlign = "center";
            ctx.fillText(c.name, canvas.width/2, 150 + i * 40);
        });
    } else {
        ctx.font = "16px Arial";
        ctx.fillText("No characters found. Press Enter to create!", canvas.width/2, canvas.height/2);
    }
    ctx.font = "14px Arial";
    ctx.fillText("Press Enter to play / C to create new", canvas.width/2, canvas.height - 50);
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
        ctx.strokeStyle = i === currentInput ? "yellow" : "white";
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
    ctx.fillStyle = "white";
    ctx.font = "24px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Create New Character", canvas.width/2, canvas.height/2 - 100);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
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
