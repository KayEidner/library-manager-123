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
    document.getElementById('t_label_omdb_key').innerText = t('label_omdb_key');
    document.getElementById('t_btn_save_settings').innerText = t('btn_save_settings');
    document.getElementById('t_section_quickscan').innerText = t('section_quickscan');
    document.getElementById('btnModeView').innerText = t('mode_view');
    document.getElementById('btnModeEdit').innerText = t('mode_edit');
    document.getElementById('quickScan').placeholder = state.currentAppMode === 'view' ? t('placeholder_quickscan_view') : t('placeholder_quickscan');
    document.getElementById('t_btn_edit_from_view').innerText = t('btn_edit_from_view');
    document.getElementById('t_section_capture').innerText = t('section_capture');
    document.getElementById('t_label_barcode').innerText = t('label_barcode');
    document.getElementById('barcode').placeholder = t('placeholder_barcode');
    document.getElementById('t_label_category').innerText = t('label_category');
    document.getElementById('t_cat_book').innerText = t('cat_book');
    document.getElementById('t_cat_game').innerText = t('cat_game');
    document.getElementById('t_cat_movie').innerText = t('cat_movie');
    document.getElementById('t_cat_folk').innerText = t('cat_folk');
    document.getElementById('t_cat_misc').innerText = t('cat_misc');
    document.getElementById('apiBtn').innerText = t('btn_api_search');
    document.getElementById('t_label_title').innerText = t('label_title');
    document.getElementById('title').placeholder = t('placeholder_title');
    document.getElementById('t_label_edition').innerText = t('label_edition');
    document.getElementById('t_label_tags').innerText = t('label_tags');
    document.getElementById('t_label_genre').innerText = t('label_genre');
    document.getElementById('t_label_pages').innerText = t('label_pages');
    document.getElementById('t_label_language').innerText = t('label_language');
    document.getElementById('t_label_description').innerText = t('label_description');
    document.getElementById('t_h3_local').innerText = "3. " + t('h3_local');
    document.getElementById('t_label_location').innerText = t('label_location');
    document.getElementById('t_label_shelf').innerText = t('label_shelf');
    document.getElementById('t_label_format').innerText = t('label_format');
    document.getElementById('t_label_status').innerText = t('label_status');
    document.getElementById('t_stat_owned').innerText = t('stat_owned');
    document.getElementById('t_stat_loaned').innerText = t('stat_loaned');
    document.getElementById('t_stat_wish').innerText = t('stat_wish');
    document.getElementById('t_stat_discarded').innerText = t('stat_discarded');
    document.getElementById('t_label_loaned_to').innerText = t('label_loaned_to');
    document.getElementById('t_label_loaned_date').innerText = t('label_loaned_date');
    document.getElementById('t_label_condition').innerText = t('label_condition');
    document.getElementById('t_cond_new').innerText = t('cond_new');
    document.getElementById('t_cond_good').innerText = t('cond_good');
    document.getElementById('t_cond_age').innerText = t('cond_age');
    document.getElementById('t_cond_bad').innerText = t('cond_bad');
    document.getElementById('t_label_rating').innerText = t('label_rating');
    document.getElementById('t_label_value').innerText = t('label_value');
    document.getElementById('t_label_image').innerText = t('label_image');
    document.getElementById('t_label_notes').innerText = t('label_notes');
    document.getElementById('t_label_keep_location').innerText = t('label_keep_location');

    const saveBtn = document.getElementById('saveBtn');
    if(!state.currentEditId) saveBtn.innerText = t('btn_save_entry');
    else saveBtn.innerText = t('btn_update_entry');

    document.getElementById('t_section_backup').innerText = t('section_backup');
    document.getElementById('search').placeholder = t('placeholder_search');
    document.getElementById('t_btn_json_export').innerText = t('btn_json_export');
    document.getElementById('t_btn_json_import').innerText = t('btn_json_import');
    document.getElementById('t_btn_csv_export').innerText = t('btn_csv_export');
    document.getElementById('t_section_inventory').innerHTML = `${t('section_inventory')} (<span id="count">0</span> <span id="t_text_objects">${t('text_objects')}</span>)`;

    updateDynamicFields(); 
    renderItems(true); 
}

function changeLanguage(lang) {
    state.currentLang = lang;
    localStorage.setItem('app_lang', lang);
    applyTranslations();
}

// ---- UI Steuerung ----
function setMode(mode) {
    state.currentAppMode = mode;
    document.getElementById('btnModeView').classList.toggle('active', mode === 'view');
    document.getElementById('btnModeEdit').classList.toggle('active', mode === 'edit');
    document.getElementById('mainFormCard').style.display = mode === 'edit' ? 'block' : 'none';
    document.getElementById('viewItemCard').style.display = 'none';
    document.getElementById('quickScan').placeholder = mode === 'view' ? t('placeholder_quickscan_view') : t('placeholder_quickscan');
    document.getElementById('quickScan').focus();
}

function toggleApiModal() {
    const modal = document.getElementById('apiSettingsModal');
    modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
    if (modal.style.display === 'block') {
      document.getElementById('omdbKeyInput').value = state.apiKeys.omdb || '';
      document.getElementById('igdbClientIdInput').value = state.apiKeys.igdb_client || '';
      document.getElementById('igdbTokenInput').value = state.apiKeys.igdb_token || '';
    }
}

function saveApiKeys() {
    state.apiKeys.omdb = document.getElementById('omdbKeyInput').value.trim();
    state.apiKeys.igdb_client = document.getElementById('igdbClientIdInput').value.trim();
    let token = document.getElementById('igdbTokenInput').value.trim();
    if(token.toLowerCase().startsWith('bearer ')) token = token.substring(7).trim();
    state.apiKeys.igdb_token = token;
    
    localStorage.setItem('my_api_keys', JSON.stringify(state.apiKeys));
    alert(t('alert_settings_saved'));
    toggleApiModal();
}

function toggleLoanBlock(e) {
    document.getElementById('loanBlock').style.display = e.target.value === 'Verliehen' ? 'flex' : 'none';
}

function clearRating() { document.querySelectorAll('input[name="rating"]').forEach(rb => rb.checked = false); }
function getRating() { const checked = document.querySelector('input[name="rating"]:checked'); return checked ? checked.value : ""; }
function setRating(val) { clearRating(); if(val && val >= 1 && val <= 5) document.getElementById('star' + val).checked = true; }

function initLanguageChips() {
    document.querySelectorAll('.lang-chip').forEach(chip => {
        chip.addEventListener('click', function(e) {
            e.preventDefault();
            const category = document.getElementById('category').value;
            const isBook = category === 'Buch';
            
            if (isBook) {
                if (this.classList.contains('active')) {
                    this.classList.remove('active');
                } else {
                    document.querySelectorAll('.lang-chip').forEach(c => c.classList.remove('active'));
                    this.classList.add('active');
                }
            } else {
                this.classList.toggle('active');
            }
        });
    });
}

function updateDynamicFields() {
    const category = document.getElementById('category').value;
    const apiSearchBlock = document.getElementById('apiSearchBlock');
    const editionBlock = document.getElementById('editionBlock');
    const bookDetailsBlock = document.getElementById('bookDetailsBlock');
    
    const pagesBlock = document.getElementById('pagesBlock');
    const languageBlock = document.getElementById('languageBlock');
    
    const lblCode = document.getElementById('codeLabel');
    const lblSubtitle = document.getElementById('dynamicSubtitleLabel');
    const lblAuthor = document.getElementById('dynamicAuthorLabel');
    const lblPublisher = document.getElementById('dynamicPublisherLabel');
    const lblYear = document.getElementById('dynamicYearLabel');

    lblYear.innerText = t('year_normal');
    
    const isBook = category === 'Buch';
    const isMedia = category === 'Film' || category === 'Spiel';

    if (isBook) {
        document.getElementById('t_h3_biblio').innerText = "1. " + t('h3_biblio_book');
        document.getElementById('t_h3_extended').innerText = "2. " + t('h3_ext_book');
        apiSearchBlock.style.display = 'block';
        editionBlock.style.display = 'block';
        pagesBlock.style.display = 'block';
        languageBlock.style.display = 'block';
        lblCode.innerText = t('label_isbn');
        document.getElementById('codeField').placeholder = t('placeholder_code');
        lblSubtitle.innerText = t('sub_book');
        lblAuthor.innerText = t('auth_book');
        lblPublisher.innerText = t('pub_book');
    } 
    else if (category === 'Film') {
        document.getElementById('t_h3_biblio').innerText = "1. " + t('h3_biblio_movie');
        document.getElementById('t_h3_extended').innerText = "2. " + t('h3_ext_movie');
        apiSearchBlock.style.display = 'block';
        editionBlock.style.display = 'none';
        pagesBlock.style.display = 'none';
        languageBlock.style.display = 'block';
        lblCode.innerText = t('label_ean');
        document.getElementById('codeField').placeholder = t('placeholder_code');
        lblSubtitle.innerText = t('sub_film');
        lblAuthor.innerText = t('auth_film');
        lblPublisher.innerText = t('pub_film');
    } 
    else if (category === 'Spiel') {
        document.getElementById('t_h3_biblio').innerText = "1. " + t('h3_biblio_game');
        document.getElementById('t_h3_extended').innerText = "2. " + t('h3_ext_game');
        apiSearchBlock.style.display = 'block';
        editionBlock.style.display = 'none';
        pagesBlock.style.display = 'none';
        languageBlock.style.display = 'block';
        lblCode.innerText = t('label_ean');
        document.getElementById('codeField').placeholder = t('placeholder_code');
        lblSubtitle.innerText = t('sub_game');
        lblAuthor.innerText = t('auth_game');
        lblPublisher.innerText = t('pub_game');
    } 
    else if (category === 'Volkskunst') {
        document.getElementById('t_h3_biblio').innerText = "1. " + t('h3_biblio_folk');
        document.getElementById('t_h3_extended').innerText = "2. " + t('h3_ext_folk');
        apiSearchBlock.style.display = 'none';
        editionBlock.style.display = 'none';
        pagesBlock.style.display = 'none';
        languageBlock.style.display = 'none';
        lblSubtitle.innerText = t('sub_folk');
        lblAuthor.innerText = t('auth_folk');
        lblPublisher.innerText = t('pub_folk');
        lblYear.innerText = t('year_folk');
    } 
    else {
        document.getElementById('t_h3_biblio').innerText = "1. " + t('h3_biblio_misc');
        document.getElementById('t_h3_extended').innerText = "2. " + t('h3_ext_misc');
        apiSearchBlock.style.display = 'none';
        editionBlock.style.display = 'none';
        pagesBlock.style.display = 'none';
        languageBlock.style.display = 'none';
        lblSubtitle.innerText = t('sub_misc');
        lblAuthor.innerText = t('auth_misc');
        lblPublisher.innerText = t('pub_misc');
    }

    const loanBlock = document.getElementById('loanBlock');
    if (document.getElementById('status').value === 'Verliehen') loanBlock.style.display = 'flex';
    else loanBlock.style.display = 'none';
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
                btn.innerText = t('btn_api_search') || "API Suche";
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

// ---- Bilder & Cropper ----
if(document.getElementById('imageInput')) {
    document.getElementById('imageInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
          document.getElementById('cropTarget').src = event.target.result;
          document.getElementById('cropModal').style.display = 'flex';
          history.pushState({ page: 'crop' }, null, location.href); 
          
          if (state.cropper) state.cropper.destroy();
          state.cropper = new Cropper(document.getElementById('cropTarget'), {
            viewMode: 2,
            autoCropArea: 1,
            responsive: true
          });
        };
        reader.readAsDataURL(file);
    });
}

function cancelCrop() {
    document.getElementById('cropModal').style.display = 'none';
    document.getElementById('imageInput').value = '';
    if (state.cropper) { state.cropper.destroy(); state.cropper = null; }
}

function applyCrop() {
    if (!state.cropper) return;
    const canvas = state.cropper.getCroppedCanvas({
        maxWidth: 800,
        maxHeight: 800,
        imageSmoothingQuality: 'high'
    });
    
    document.getElementById('preview').src = "";
    state.currentImageData = canvas.toDataURL('image/jpeg', 0.8);
    document.getElementById('preview').src = state.currentImageData;
    document.getElementById('preview').style.display = 'block';
    cancelCrop();
}

// ---- CRUD Operationen ----
async function saveItem() {
    const barcode = document.getElementById('barcode').value.trim();
    const category = document.getElementById('category').value;
    const externalCode = document.getElementById('codeField').value.trim();
    const title = document.getElementById('title').value.trim();

    if (!title && !barcode && !externalCode) { alert(t('alert_fill_fields')); return; }

    let existingDate = new Date().toISOString().split('T')[0];
    if (state.currentEditId) {
        const existingItem = state.db.find(item => item.id === state.currentEditId);
        if (existingItem && existingItem.date) existingDate = existingItem.date;
    }

    const activeChips = Array.from(document.querySelectorAll('.lang-chip.active')).map(c => c.getAttribute('data-val'));
    const selectedLanguages = activeChips.join(', ');

    const newItem = {
        id: state.currentEditId ? state.currentEditId : Date.now(), 
        barcode: barcode || "OHNE-ID",
        category: category,
        externalCode: externalCode || "",
        title: title || "Unbenanntes Objekt",
        subtitle: document.getElementById('subtitle').value.trim(),
        author: document.getElementById('author').value.trim(),
        publisher: document.getElementById('publisher').value.trim(),
        year: document.getElementById('year').value.trim(),
        edition: category === 'Buch' ? document.getElementById('edition').value.trim() : "",
        tags: document.getElementById('tags').value.trim(),
        genre: document.getElementById('genre').value.trim(),
        pages: category === 'Buch' ? document.getElementById('pages').value.trim() : "",
        language: selectedLanguages,
        description: document.getElementById('description').value.trim(),
        location: document.getElementById('location').value.trim(),
        shelf: document.getElementById('shelf').value.trim(),
        format: document.getElementById('format').value.trim(),
        status: document.getElementById('status').value,
        loanedTo: document.getElementById('status').value === 'Verliehen' ? document.getElementById('loanedTo').value.trim() : "",
        loanedDate: document.getElementById('status').value === 'Verliehen' ? document.getElementById('loanedDate').value : "",
        condition: document.getElementById('condition').value,
        estimatedValue: document.getElementById('estimatedValue').value.trim(),
        rating: getRating(),
        notes: document.getElementById('notes').value.trim(),
        date: existingDate
    };

    await DB.saveItemToDB(newItem, state.currentImageData);
    await DB.loadAllItemsFromDB();
    renderItems(true); 
    clearForm();
    document.getElementById('title').focus(); 
}

function clearForm() {
    const keepLocation = document.getElementById('keepLocation').checked;
    const savedLocation = document.getElementById('location').value;
    const savedShelf = document.getElementById('shelf').value;
    const currentCategory = document.getElementById('category').value;

    const fieldsToClear = ['barcode','codeField','title','subtitle','author','publisher','year','edition','tags','genre','pages','description','format','loanedTo','loanedDate','estimatedValue','notes'];
    fieldsToClear.forEach(id => document.getElementById(id).value = "");
    
    document.querySelectorAll('.lang-chip').forEach(c => c.classList.remove('active'));

    document.getElementById('status').value = "Vorhanden";
    document.getElementById('condition').value = "Sehr gut / Wie neu";
    clearRating();
    
    document.getElementById('imageInput').value = "";
    document.getElementById('preview').src = "";
    document.getElementById('preview').style.display = "none";
    state.currentImageData = "";
    state.currentEditId = null;
    
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.innerText = t('btn_save_entry');
    saveBtn.style.background = "var(--accent)";

    if (!keepLocation) {
      document.getElementById('location').value = "";
      document.getElementById('shelf').value = "";
    } else {
      document.getElementById('location').value = savedLocation;
      document.getElementById('shelf').value = savedShelf;
    }
    
    document.getElementById('category').value = currentCategory;
    updateDynamicFields();
}

async function editItem(id) {
    const item = state.db.find(i => i.id === id);
    if (!item) return;

    document.getElementById('category').value = item.category;
    updateDynamicFields(); 

    document.getElementById('barcode').value = item.barcode === "OHNE-ID" ? "" : item.barcode;
    document.getElementById('codeField').value = item.externalCode;
    document.getElementById('title').value = item.title;
    document.getElementById('subtitle').value = item.subtitle;
    document.getElementById('author').value = item.author;
    document.getElementById('publisher').value = item.publisher;
    document.getElementById('year').value = item.year;
    
    document.getElementById('edition').value = item.edition || "";
    document.getElementById('tags').value = item.tags || "";
    document.getElementById('genre').value = item.genre || "";
    document.getElementById('pages').value = item.pages || "";
    document.getElementById('description').value = item.description || "";
    
    document.querySelectorAll('.lang-chip').forEach(c => c.classList.remove('active'));
    if (item.language) {
        const langs = item.language.split(', ');
        document.querySelectorAll('.lang-chip').forEach(c => {
            if (langs.includes(c.getAttribute('data-val'))) {
                c.classList.add('active');
            }
        });
    }

    document.getElementById('location').value = item.location || "";
    document.getElementById('shelf').value = item.shelf || "";
    document.getElementById('format').value = item.format || "";
    document.getElementById('status').value = item.status || "Vorhanden";
    
    document.getElementById('loanedTo').value = item.loanedTo || "";
    document.getElementById('loanedDate').value = item.loanedDate || "";
    updateDynamicFields();

    document.getElementById('condition').value = item.condition || "Sehr gut / Wie neu";
    document.getElementById('estimatedValue').value = item.estimatedValue || "";
    setRating(item.rating || "");
    document.getElementById('notes').value = item.notes || "";

    const imgData = await DB.getImageFromDB(id);
    if (imgData) {
        state.currentImageData = imgData;
        document.getElementById('preview').src = state.currentImageData;
        document.getElementById('preview').style.display = 'block';
    } else {
        state.currentImageData = "";
        document.getElementById('preview').src = "";
        document.getElementById('preview').style.display = 'none';
    }

    state.currentEditId = id;
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.innerText = t('btn_update_entry');
    saveBtn.style.background = "#ff9800"; 
}

async function showViewCard(item) {
    state.itemInView = item;
    document.getElementById('viewTitle').innerText = item.title;
    document.getElementById('viewSubtitle').innerText = [item.subtitle, item.author].filter(Boolean).join(" | ");
    document.getElementById('viewCode').innerText = item.externalCode || item.barcode;
    document.getElementById('viewLocation').innerText = `${item.location} ${item.shelf ? '('+item.shelf+')' : ''}`;
    
    let statusText = item.status || "Vorhanden";
    if(statusText === 'Verliehen') {
        if(item.loanedTo) statusText += ` an ${item.loanedTo}`;
        if(item.loanedDate) statusText += ` (am ${item.loanedDate})`;
    }
    document.getElementById('viewStatus').innerText = statusText;
    document.getElementById('viewValue').innerText = item.estimatedValue ? `${item.estimatedValue} €` : '-';
    
    const imgEl = document.getElementById('viewImage');
    const imgData = await DB.getImageFromDB(item.id);
    if (imgData) {
        imgEl.src = imgData;
        imgEl.style.display = 'block';
        imgEl.onclick = () => {
          document.getElementById('lightboxImg').src = imgData;
          document.getElementById('lightbox').style.display = 'flex';
          history.pushState({ page: 'lightbox' }, null, location.href);
        };
    } else {
        imgEl.src = "";
        imgEl.style.display = 'none';
        imgEl.onclick = null;
    }

    let dHtml = "";
    const addRow = (label, val) => { if(val) dHtml += `<div><strong style="color:#fff;">${label}:</strong> ${val}</div>`; };
    
    let catTranslation = item.category === 'Buch' ? 'book' : item.category === 'Film' ? 'movie' : item.category === 'Spiel' ? 'game' : item.category === 'Volkskunst' ? 'folk' : 'misc';
    addRow("Kategorie", t('cat_' + catTranslation) || item.category);
    addRow(t('pub_book') || "Verlag/Studio", item.publisher);
    addRow(t('label_year'), item.year);
    addRow(t('label_edition'), item.edition);
    addRow(t('label_genre'), item.genre);
    addRow(t('label_tags'), item.tags);
    addRow(t('label_pages'), item.pages);
    addRow(t('label_language'), item.language);
    addRow(t('label_format'), item.format);
    addRow(t('label_condition'), item.condition);
    if(item.rating) addRow(t('label_rating'), `${'★'.repeat(item.rating)}${'☆'.repeat(5-item.rating)}`);
    addRow(t('label_notes'), item.notes);
    addRow("Erfasst am", item.date);
    
    if(item.description) {
        dHtml += `<div style="margin-top:8px;"><strong>${t('label_description') || 'Beschreibung:'}</strong><br>${item.description}</div>`;
    }
    
    document.getElementById('viewDetails').innerHTML = dHtml;

    const card = document.getElementById('viewItemCard');
    card.style.display = 'block';
    card.classList.remove('highlight-card');
    void card.offsetWidth;
    card.classList.add('highlight-card');
}

function viewItem(id) {
    const item = state.db.find(i => i.id === id);
    if (item) {
        setMode('view');
        showViewCard(item);
        window.scrollTo({ top: document.getElementById('viewItemCard').offsetTop - 20, behavior: 'smooth' });
    }
}

function editFromView() {
    if (state.itemInView) {
        setMode('edit');
        editItem(state.itemInView.id);
    }
}

async function deleteItem(id) {
    if (confirm(t('alert_confirm_delete') || "Wirklich löschen?")) {
        await DB.deleteItemFromDB(id);
        await DB.loadAllItemsFromDB();
        if(state.currentEditId === id) clearForm();
        renderItems(true);
    }
}

// ---- Rendering Liste ----
function renderItems(resetLimit = false) {
    if (resetLimit) state.currentRenderLimit = 50;
    const list = document.getElementById('itemList');
    const query = document.getElementById('search').value.toLowerCase();
    list.innerHTML = "";

    const filtered = state.db.filter(item => 
        item.title.toLowerCase().includes(query) || 
        (item.subtitle && item.subtitle.toLowerCase().includes(query)) ||
        (item.author && item.author.toLowerCase().includes(query)) ||
        (item.tags && item.tags.toLowerCase().includes(query)) ||
        item.barcode.toLowerCase().includes(query) ||
        (item.shelf && item.shelf.toLowerCase().includes(query)) ||
        (item.location && item.location.toLowerCase().includes(query)) || 
        item.category.toLowerCase().includes(query)
    );

    document.getElementById('count').innerText = filtered.length;
    const itemsToRender = filtered.slice(0, state.currentRenderLimit);

    itemsToRender.forEach(item => {
        const li = document.createElement('li');
        li.className = 'item-card';
        li.style.flexDirection = 'column';
        
        const imgId = `img-list-${item.id}`;
        const imgTag = `<img id="${imgId}" src="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" style="width:60px;height:60px;object-fit:cover;border-radius:4px;flex-shrink:0;background:#333;">`;
        
        DB.getImageFromDB(item.id).then(img => {
            const el = document.getElementById(imgId);
            if (el && img) el.src = img;
        });

        let specificInfo = item.author ? `<div class="item-author">${item.author}</div>` : '';
        let badge = item.status === 'Verliehen' ? `<span style="background:#d32f2f; padding:2px 6px; border-radius:4px; color:#fff; font-size:0.7em;">Verliehen an ${item.loanedTo}</span>` : '';
        let ratingBadge = item.rating ? `<span style="color:#ffc107;">${'★'.repeat(item.rating)}${'☆'.repeat(5-item.rating)}</span>` : '';
        let valueBadge = item.estimatedValue ? `| 💶 ${item.estimatedValue} €` : '';
        let catTranslation = item.category === 'Buch' ? 'book' : item.category === 'Film' ? 'movie' : item.category === 'Spiel' ? 'game' : item.category === 'Volkskunst' ? 'folk' : 'misc';

        li.innerHTML = `
            <div style="display: flex; gap: 12px; width: 100%;">
            ${imgTag}
            <div class="item-info">
                <div class="item-title">${item.title}</div>
                ${item.subtitle ? `<div class="item-subtitle">${item.subtitle}</div>` : ''}
                ${specificInfo}
                <div class="item-meta">
                <strong>[${t('cat_' + catTranslation)}]</strong> ID: ${item.barcode}<br>
                Ort: ${item.location} ${item.shelf ? '('+item.shelf+')':''} ${valueBadge} <br> ${ratingBadge} ${badge}
                </div>
            </div>
            </div>
            <div class="action-buttons" style="flex-direction: row; width: 100%; gap: 8px; margin-top: 8px; padding-top: 12px; border-top: 1px solid #333;">
            <button class="secondary" style="flex: 1; margin:0; padding:8px 0; font-size: 1.1em;" onclick="window.app.viewItem(${item.id});" title="Anzeigen">👁️</button>
            <button class="secondary" style="flex: 1; margin:0; padding:8px 0; font-size: 1.1em;" onclick="window.app.setMode('edit'); window.app.editItem(${item.id});" title="Bearbeiten">✏️</button>
            <button class="danger" style="flex: 1; margin:0; padding:8px 0; font-size: 1.1em;" onclick="window.app.deleteItem(${item.id})" title="Löschen">❌</button>
            </div>
        `;
        list.appendChild(li);
    });

    if (filtered.length > state.currentRenderLimit) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'secondary';
        loadMoreBtn.style.marginTop = '16px';
        loadMoreBtn.innerText = "Weitere Einträge laden...";
        loadMoreBtn.onclick = () => {
            state.currentRenderLimit += 50;
            renderItems(false);
        };
        list.appendChild(loadMoreBtn);
    }
}

// ---- Export / Import ----
async function exportJSON() {
    if (state.db.length === 0) { alert(t('alert_no_data')); return; }
    
    const exportBtn = document.getElementById('t_btn_json_export');
    const originalText = exportBtn.innerText;
    exportBtn.innerText = "⏳ Exportiere...";
    exportBtn.disabled = true;
    
    try {
        const exportData = [];
        for (const item of state.db) {
            const image = await DB.getImageFromDB(item.id);
            exportData.push({ ...item, image: image });
        }
        const jsonStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `sammlung_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch(err) {
        console.error(err);
        alert("Fehler beim Export!");
    } finally {
        exportBtn.innerText = originalText;
        exportBtn.disabled = false;
    }
}

function importJSON(event) {
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (Array.isArray(importedData)) {
                await DB.clearDBAndBulkAdd(importedData);
                alert(t('alert_import_success'));
            }
        } catch (err) { alert(t('alert_json_error')); }
    };
    reader.readAsText(event.target.files[0]);
}

function exportCSV() {
    if (state.db.length === 0) { alert(t('alert_no_data')); return; }
    let csv = "data:text/csv;charset=utf-8," + t('csv_header') + "\n";
    state.db.forEach(item => {
        csv += [item.category, item.barcode, item.externalCode, item.title, item.subtitle, item.author, item.publisher, item.year, (item.edition || ""), (item.tags || ""), (item.genre || ""), (item.pages || ""), (item.language || ""), item.location, item.shelf, (item.format || ""), (item.status || ""), (item.loanedTo || ""), (item.loanedDate || ""), item.condition, (item.rating || ""), (item.estimatedValue || ""), item.date, item.notes, (item.description || "")]
        .map(v => `"${(v||"").toString().replace(/"/g, '""')}"`).join(",") + "\n";
    });
    const a = document.createElement('a');
    a.href = encodeURI(csv);
    a.download = `sammlung_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
}

// ---- Event Listener & Eingaben ----
document.getElementById('quickScan').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        this.blur();
        const val = this.value.trim();
        if (!val) return;

        const valUpper = val.toUpperCase();
        // Erkennt R14, F03, R14F03, REG-1, FACH-3 etc.
        const isLocation = (/^R\d+/i.test(val) || /^F\d+/i.test(val) || /^REG/i.test(val) || /^FACH/i.test(val) || valUpper.includes('F')) && !/^\d+$/.test(val);

        if (isLocation) {
            if (state.currentAppMode === 'edit') {
                if (valUpper.includes('F') && valUpper.startsWith('R')) {
                    const parts = valUpper.split('F');
                    document.getElementById('location').value = parts[0]; 
                    document.getElementById('shelf').value = valUpper; 
                } else if (valUpper.startsWith('R') || valUpper.startsWith('REG')) {
                    document.getElementById('location').value = valUpper;
                } else {
                    document.getElementById('shelf').value = valUpper;
                }
            }
            
            const searchInput = document.getElementById('search');
            searchInput.value = valUpper;
            renderItems(true);
            
            this.value = "";
            this.placeholder = "Ort geladen! Zeige Bestand...";
            document.getElementById('t_section_inventory').scrollIntoView({ behavior: 'smooth' });
            
            setTimeout(() => { this.placeholder = state.currentAppMode === 'view' ? t('placeholder_quickscan_view') : t('placeholder_quickscan'); }, 4000);
            return;
        }

        const existingItem = state.db.find(item => item.barcode === val || item.externalCode === val);
        if (state.currentAppMode === 'view') {
            if (existingItem) {
                showViewCard(existingItem);
                this.value = "";
            } else {
                if (confirm(t('confirm_switch_to_edit') || "Code nicht gefunden! Zum Erfassen wechseln?")) {
                    setMode('edit');
                    clearForm();
                    const isEanIsbn = /^\d{8,14}$/.test(val.replace(/[- ]/g, ""));
                    if (isEanIsbn) {
                        document.getElementById('codeField').value = val;
                        triggerApiSearch(); 
                    } else {
                        document.getElementById('barcode').value = val;
                    }
                    this.value = "";
                    window.scrollTo({ top: document.getElementById('mainFormCard').offsetTop - 20, behavior: 'smooth' });
                } else {
                    this.value = "";
                    document.getElementById('quickScan').focus();
                }
            }
        } else {
            if (existingItem) {
                editItem(existingItem.id);
                this.value = "";
                const formCard = document.getElementById('mainFormCard');
                formCard.classList.remove('highlight-card');
                void formCard.offsetWidth;
                formCard.classList.add('highlight-card');
                document.getElementById('search').value = "";
                renderItems(true);
            } else {
                const isFormDirty = document.getElementById('title').value.trim() !== '' || document.getElementById('author').value.trim() !== '';
                if (!isFormDirty) {
                    clearForm();
                }
                
                const cleanVal = val.replace(/[- ]/g, "");
                const isEanIsbn = (cleanVal.length === 13 || cleanVal.length === 12 || cleanVal.length === 8 || (cleanVal.length === 10 && /^\d{9}[\dX]$/i.test(cleanVal)));
                
                if (isEanIsbn) {
                    document.getElementById('codeField').value = val;
                    triggerApiSearch(); 
                } else {
                    document.getElementById('barcode').value = val;
                }
                this.value = "";
                window.scrollTo({ top: document.getElementById('mainFormCard').offsetTop - 20, behavior: 'smooth' });
            }
        }
    }
});

// Barcode nicht mehr ans Suchfeld übergeben, sondern zum nächsten logischen Feld
document.getElementById('barcode').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        this.blur();
        document.getElementById('title').focus();
    }
});

document.getElementById('codeField').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        this.blur();
        triggerApiSearch();
    }
});

// ---- History API (Zurück-Button) ----
window.addEventListener('popstate', function (event) {
    const cropModal = document.getElementById('cropModal');
    const lightbox = document.getElementById('lightbox');

    if (cropModal.style.display === 'flex') {
        cancelCrop();
        history.pushState({ page: 'main' }, null, location.href); 
        return;
    }

    if (lightbox.style.display === 'flex') {
        lightbox.style.display = 'none';
        history.pushState({ page: 'main' }, null, location.href);
        return;
    }

    if (state.currentAppMode === 'edit') {
        const isDirty = document.getElementById('title').value.trim() !== '' || document.getElementById('barcode').value.trim() !== '';
        if (isDirty) {
            if (confirm("⚠️ Achtung!\n\nDu hast ungespeicherte Daten im Formular.\nWillst du die Eingabe wirklich abbrechen?")) {
                clearForm();
                history.pushState({ page: 'main' }, null, location.href);
            } else {
                history.pushState({ page: 'main' }, null, location.href);
            }
            return;
        }
    }
    history.pushState({ page: 'main' }, null, location.href);
});

// ---- Globale Funktionen ans HTML binden ----
window.app = {
    changeLanguage, toggleApiModal, saveApiKeys, setMode, updateDynamicFields, toggleLoanBlock,
    fetchCodeData: triggerApiSearch, renderItems, viewItem, editItem, editFromView, deleteItem,
    saveItem, cancelCrop, applyCrop, exportJSON, importJSON, exportCSV, clearRating
};

// ---- App Start ----
loadTranslations().then(() => {
    initLanguageChips();
    DB.initDB(() => renderItems(true));
});
