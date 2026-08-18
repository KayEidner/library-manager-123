import { state } from './config.js';
import * as DB from './database.js';
import * as API from './api.js';

// ---- Übersetzungen / i18n Simulation ----
async function loadTranslations() {
    try {
        const res = await fetch('translations.json');
        state.translations = await res.json();
        applyTranslations();
    } catch(e) { console.error("Translations error", e); }
}

function t(key) {
    if (state.translations[state.currentLang] && state.translations[state.currentLang][key]) return state.translations[state.currentLang][key];
    if (state.translations['de'] && state.translations['de'][key]) return state.translations['de'][key];
    return key;
}

function applyTranslations() {
    document.getElementById('html_title').innerText = t('app_title');
    document.getElementById('t_app_title').innerText = "📚 " + t('app_title');
    document.getElementById('t_modal_title').innerText = t('modal_title');
    document.getElementById('t_section_quickscan').innerText = t('section_quickscan');
    document.getElementById('btnModeView').innerText = t('mode_view');
    document.getElementById('btnModeEdit').innerText = t('mode_edit');
    document.getElementById('t_btn_edit_from_view').innerText = t('btn_edit_from_view');
    document.getElementById('t_section_capture').innerText = t('section_capture');
    // Setze Dropdown etc
    document.getElementById('quickScan').placeholder = state.currentAppMode === 'view' ? t('placeholder_quickscan_view') : t('placeholder_quickscan');
    
    updateDynamicFields();
    renderItems(true);
}

function changeLanguage(lang) {
    state.currentLang = lang;
    localStorage.setItem('app_lang', lang);
    applyTranslations();
}

// ---- UI Steuerung ----
function updateDynamicFields() {
    const cat = document.getElementById('category').value;
    const isBook = cat === 'Buch';
    document.getElementById('apiSearchBlock').style.display = (cat === 'Volkskunst' || cat === 'Sonstiges') ? 'none' : 'block';
    document.getElementById('editionBlock').style.display = isBook ? 'block' : 'none';
    document.getElementById('bookDetailsBlock').style.display = isBook ? 'flex' : 'none';
}

function setMode(mode) {
    state.currentAppMode = mode;
    document.getElementById('btnModeView').classList.toggle('active', mode === 'view');
    document.getElementById('btnModeEdit').classList.toggle('active', mode === 'edit');
    document.getElementById('mainFormCard').style.display = mode === 'edit' ? 'block' : 'none';
    document.getElementById('viewItemCard').style.display = 'none';
    document.getElementById('quickScan').placeholder = mode === 'view' ? t('placeholder_quickscan_view') : t('placeholder_quickscan');
    document.getElementById('quickScan').focus();
}

function toggleLoanBlock(e) {
    document.getElementById('loanBlock').style.display = e.target.value === 'Verliehen' ? 'flex' : 'none';
}

// ---- Rendering Listen ----
function renderItems(resetLimit = false) {
    if (resetLimit) state.currentRenderLimit = 50;
    const list = document.getElementById('itemList');
    const query = document.getElementById('search').value.toLowerCase();
    list.innerHTML = "";

    const filtered = state.db.filter(item => 
        item.title.toLowerCase().includes(query) || 
        (item.barcode && item.barcode.toLowerCase().includes(query))
    );

    document.getElementById('count').innerText = filtered.length;

    filtered.slice(0, state.currentRenderLimit).forEach(item => {
        const li = document.createElement('li');
        li.className = 'item-card';
        const imgId = `img-list-${item.id}`;
        
        DB.getImageFromDB(item.id).then(img => {
            const el = document.getElementById(imgId);
            if (el && img) el.src = img;
        });

        li.innerHTML = `
            <div style="display: flex; gap: 12px; width: 100%;">
                <img id="${imgId}" src="" style="width:60px;height:60px;object-fit:cover;border-radius:4px;background:#333;">
                <div class="item-info">
                    <div class="item-title">${item.title}</div>
                    <div class="item-meta">ID: ${item.barcode} | Ort: ${item.location}</div>
                </div>
            </div>
            <div class="action-buttons">
                <button class="secondary" onclick="window.app.viewItem(${item.id})">👁️</button>
                <button class="secondary" onclick="window.app.setMode('edit'); window.app.editItem(${item.id})">✏️</button>
                <button class="danger" onclick="window.app.deleteItem(${item.id})">❌</button>
            </div>
        `;
        list.appendChild(li);
    });
}

// ---- Wrapper für die API aus der UI ----
async function triggerApiSearch() {
    const code = document.getElementById('codeField').value;
    const title = document.getElementById('title').value;
    const cat = document.getElementById('category').value;
    
    const uiCallback = {
        updateDynamicFields: updateDynamicFields,
        setImage: (url) => {
            state.currentImageData = url;
            document.getElementById('preview').src = url;
            document.getElementById('preview').style.display = 'block';
        },
        openSettings: toggleApiModal,
        updateButtonText: (txt) => { document.getElementById('apiBtn').innerText = txt; },
        setLoadingState: (isLoading, cleanCode, title) => {
            const btn = document.getElementById('apiBtn');
            btn.disabled = isLoading;
            btn.style.background = isLoading ? "#ff9800" : "var(--accent)";
            if(!isLoading) {
                btn.innerText = "API Suche";
                if(cleanCode && !document.getElementById('title').value) {
                    const amz = document.getElementById('amazonLink');
                    amz.href = `https://www.amazon.de/s?k=${cleanCode}`;
                    amz.style.display = 'block';
                }
            }
        }
    };
    await API.fetchCodeData(code, title, cat, uiCallback);
}

// ---- Modal & Settings ----
function toggleApiModal() {
    const m = document.getElementById('apiSettingsModal');
    m.style.display = m.style.display === 'block' ? 'none' : 'block';
    if(m.style.display === 'block') {
        document.getElementById('omdbKeyInput').value = state.apiKeys.omdb;
        document.getElementById('igdbClientIdInput').value = state.apiKeys.igdb_client;
        document.getElementById('igdbTokenInput').value = state.apiKeys.igdb_token;
    }
}
function saveApiKeys() {
    state.apiKeys.omdb = document.getElementById('omdbKeyInput').value.trim();
    state.apiKeys.igdb_client = document.getElementById('igdbClientIdInput').value.trim();
    let token = document.getElementById('igdbTokenInput').value.trim();
    if(token.toLowerCase().startsWith('bearer ')) token = token.substring(7).trim();
    state.apiKeys.igdb_token = token;
    localStorage.setItem('my_api_keys', JSON.stringify(state.apiKeys));
    alert("Einstellungen gespeichert!");
    toggleApiModal();
}

// Global registrieren (damit inline HTML onclicks funktionieren)
window.app = {
    changeLanguage, toggleApiModal, saveApiKeys, setMode, updateDynamicFields, toggleLoanBlock,
    fetchCodeData: triggerApiSearch, renderItems,
    deleteItem: async (id) => {
        if(confirm("Löschen?")) {
            await DB.deleteItemFromDB(id);
            await DB.loadAllItemsFromDB();
            renderItems(true);
        }
    }
    // (Aus Platzgründen gekürzt: Hier fügst du einfach deine saveItem, editItem und cropper Funktionen an)
};

// Initialisierung beim Start
loadTranslations().then(() => {
    DB.initDB(() => renderItems(true));
});
