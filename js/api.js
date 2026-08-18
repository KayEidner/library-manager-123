import { state } from './config.js';

function fillIfEmpty(id, val) {
    const el = document.getElementById(id);
    if (el && !el.value && val && val !== "N/A") {
        el.value = val;
    }
}

export async function fetchCodeData(code, title, category, uiCallback) {
    const cleanCode = code.replace(/[- ]/g, "");
    
    if (cleanCode.length >= 10 && (cleanCode.startsWith('978') || cleanCode.startsWith('979'))) {
        document.getElementById('category').value = 'Buch';
        category = 'Buch';
        uiCallback.updateDynamicFields();
    }

    uiCallback.setLoadingState(true);

    try {
        const isNumeric = /^\d{8,14}$/.test(cleanCode);
        
        if (category === 'Buch') {
            await fetchBook(cleanCode, title, uiCallback);
        } else if (category === 'Film') {
            await fetchMovie(cleanCode, title, uiCallback);
        } else if (category === 'Spiel') {
            await fetchGame(cleanCode, title, uiCallback);
        } else if (isNumeric) {
            await fetchMisc(cleanCode, uiCallback);
        }
    } catch (e) {
        console.error("API Fehler:", e);
    } finally {
        uiCallback.setLoadingState(false, cleanCode, title);
    }
}

async function fetchBook(cleanCode, title, uiCallback) {
    let found = false;
    try {
        uiCallback.updateButtonText("⏳ Google Books...");
        let gbQuery = cleanCode ? `isbn:${cleanCode}` : `intitle:${encodeURIComponent(title)}`;
        const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${gbQuery}`);
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            const book = data.items[0].volumeInfo;
            fillIfEmpty('title', book.title);
            fillIfEmpty('subtitle', book.subtitle);
            if (book.authors) fillIfEmpty('author', book.authors.join(", "));
            if (book.publisher) fillIfEmpty('publisher', book.publisher);
            if (book.publishedDate) fillIfEmpty('year', book.publishedDate.match(/\d{4}/)?.[0] || book.publishedDate);
            if (book.pageCount) fillIfEmpty('pages', book.pageCount);
            if (book.description) fillIfEmpty('description', book.description);
            if (book.imageLinks?.thumbnail && !state.currentImageData) {
                uiCallback.setImage(book.imageLinks.thumbnail.replace('http:', 'https:'));
            }
            found = true;
        }
    } catch (err) { console.warn("Google Books Fehler:", err); }

    if (!found && cleanCode) {
        try {
            uiCallback.updateButtonText("⏳ OpenLibrary...");
            const response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${cleanCode}&format=json&jscmd=data`);
            const data = await response.json();
            const bookKey = `ISBN:${cleanCode}`;
            
            if (data && data[bookKey]) {
                const book = data[bookKey];
                fillIfEmpty('title', book.title);
                fillIfEmpty('subtitle', book.subtitle);
                if (book.authors) fillIfEmpty('author', book.authors.map(a => a.name).join(", "));
                if (book.publishers) fillIfEmpty('publisher', book.publishers.map(p => p.name).join(", "));
                if (book.publish_date) fillIfEmpty('year', book.publish_date.match(/\d{4}/)?.[0] || book.publish_date);
                if (book.number_of_pages) fillIfEmpty('pages', book.number_of_pages);
                if (book.cover?.medium && !state.currentImageData) {
                    uiCallback.setImage(book.cover.medium);
                }
                found = true;
            }
        } catch (err) { console.warn("OpenLibrary Fehler:", err); }
    }
    if (!found) alert("Leider keine Daten zu dieser ISBN gefunden.");
}

async function fetchMovie(cleanCode, title, uiCallback) {
    if (!state.apiKeys.omdb) return uiCallback.openSettings();
    let searchTitle = title;
    
    if (cleanCode && !searchTitle && /^\d+$/.test(cleanCode)) {
        uiCallback.updateButtonText("⏳ EAN auflösen...");
        try {
            const upcRes = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${cleanCode}`);
            if(upcRes.status === 429) return alert("Limit für Barcode-Abfragen erreicht. Bitte manuell eingeben.");
            const upcData = await upcRes.json();
            if(upcData.items && upcData.items.length > 0) {
                searchTitle = upcData.items[0].title.replace(/dvd|blu-ray|blu ray/ig, '').split('-')[0].split('(')[0].trim();
                fillIfEmpty('title', searchTitle);
            } else {
                return alert("EAN nicht gefunden. Bitte Filmtitel manuell eingeben.");
            }
        } catch(e) { console.warn("EAN to Title failed", e); }
    }

    uiCallback.updateButtonText("⏳ OMDb...");
    const queryParams = (cleanCode && cleanCode.startsWith('tt')) ? `i=${cleanCode}` : `s=${encodeURIComponent(searchTitle || cleanCode)}`;
    const searchRes = await fetch(`https://www.omdbapi.com/?${queryParams}&apikey=${state.apiKeys.omdb}`);
    const searchData = await searchRes.json();
    
    let imdbId = (searchData.Response === "True" && searchData.Search) ? searchData.Search[0].imdbID : (cleanCode.startsWith('tt') ? cleanCode : null);
    
    if (imdbId) {
        const detailRes = await fetch(`https://www.omdbapi.com/?i=${imdbId}&apikey=${state.apiKeys.omdb}`);
        const data = await detailRes.json();
        if (data.Response === "True") {
            fillIfEmpty('title', data.Title);
            fillIfEmpty('genre', data.Genre);
            fillIfEmpty('author', data.Director);
            fillIfEmpty('publisher', data.Production);
            fillIfEmpty('year', data.Year);
            fillIfEmpty('description', data.Plot);
            if (data.Poster && data.Poster !== "N/A" && !state.currentImageData) {
                uiCallback.setImage(data.Poster);
            }
        }
    }
}

async function fetchGame(cleanCode, title, uiCallback) {
    let searchTitle = title;
    if (cleanCode && !searchTitle && /^\d+$/.test(cleanCode)) {
        uiCallback.updateButtonText("⏳ EAN -> Titel...");
        try {
            const upcRes = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${cleanCode}`);
            if(upcRes.status === 429) return alert("Limit erreicht. Bitte manuell eingeben.");
            const upcData = await upcRes.json();
            if(upcData.items && upcData.items.length > 0) {
                searchTitle = upcData.items[0].title;
                fillIfEmpty('title', searchTitle);
            } else {
                return alert("EAN nicht gefunden.");
            }
        } catch(e) { console.warn("EAN failed", e); }
    }

    if (searchTitle) {
        if (state.apiKeys.igdb_client && state.apiKeys.igdb_token) {
            uiCallback.updateButtonText("⏳ IGDB...");
            try {
                const proxyUrl = "https://corsproxy.io/?url=" + encodeURIComponent("https://api.igdb.com/v4/games");
                const body = `search "${searchTitle}"; fields name,genres.name,platforms.name,involved_companies.company.name,first_release_date,summary,cover.image_id; limit 1;`;
                const response = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: { 'Client-ID': state.apiKeys.igdb_client, 'Authorization': 'Bearer ' + state.apiKeys.igdb_token, 'Content-Type': 'text/plain' },
                    body: body
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.length > 0) {
                        const game = data[0];
                        fillIfEmpty('title', game.name);
                        if(game.summary) fillIfEmpty('description', game.summary);
                        if(game.first_release_date) fillIfEmpty('year', new Date(game.first_release_date * 1000).getFullYear());
                        if(game.genres) fillIfEmpty('genre', game.genres.map(g => g.name).join(', '));
                        if(game.platforms) fillIfEmpty('subtitle', game.platforms.map(p => p.name).join(', '));
                        if(game.involved_companies) fillIfEmpty('author', game.involved_companies.map(c => c.company.name).join(', '));
                        if(game.cover?.image_id && !state.currentImageData) {
                            uiCallback.setImage(`https://images.igdb.com/igdb/image/upload/t_cover_big/${game.cover.image_id}.jpg`);
                        }
                    } else alert("Spiel in IGDB nicht gefunden.");
                } else alert("IGDB API Fehler. Stimmen Client-ID und Token?");
            } catch(e) { console.error("IGDB Fehler:", e); }
        } else alert("Bitte IGDB Client-ID und Token eintragen!");
    }
}

async function fetchMisc(cleanCode, uiCallback) {
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${cleanCode}`);
    if(res.status === 429) return alert("Limit für UPCitemdb erreicht.");
    const data = await res.json();
    if (data && data.items && data.items.length > 0) {
        const item = data.items[0];
        fillIfEmpty('title', item.title);
        if (item.brand) fillIfEmpty('publisher', item.brand);
        fillIfEmpty('description', item.description);
        if (item.images?.length > 0 && !state.currentImageData) {
            uiCallback.setImage(item.images[0]);
        }
    }
}
