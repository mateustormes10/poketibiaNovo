import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPPORTED_LANGS = ['en', 'es', 'pt', 'zh', 'it'];

function normalizeLang(lang) {
    if (!lang || typeof lang !== 'string') return 'en';
    const base = lang.trim().toLowerCase().replace('_', '-').split('-')[0];
    return SUPPORTED_LANGS.includes(base) ? base : 'en';
}

function interpolate(template, vars) {
    if (!vars) return template;
    return String(template).replace(/\{(\w+)\}/g, (_, key) => {
        const value = vars[key];
        return value === undefined || value === null ? `{${key}}` : String(value);
    });
}

function loadTable(lang) {
    const filePath = path.resolve(__dirname, `${lang}.json`);
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

const TABLES = Object.fromEntries(SUPPORTED_LANGS.map(l => [l, loadTable(l)]));

export const I18n = {
    SUPPORTED_LANGS,
    normalizeLang,

    t(lang, key, vars) {
        const lng = normalizeLang(lang);
        const fromLang = TABLES[lng] || {};
        const fromEn = TABLES.en || {};
        const template = fromLang[key] ?? fromEn[key] ?? key;
        return interpolate(template, vars);
    }
};
