export const state = {
    db: [],
    apiKeys: JSON.parse(localStorage.getItem('my_api_keys')) || { omdb: '', igdb_client: '', igdb_token: '' },
    currentLang: localStorage.getItem('app_lang') || 'de',
    currentAppMode: 'edit',
    itemInView: null,
    cropper: null,
    currentImageData: "",
    currentEditId: null,
    currentRenderLimit: 50,
    translations: {}
};
