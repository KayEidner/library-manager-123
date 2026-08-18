import { state } from './config.js';

let indexedDB_db;
const dbName = "SammlungsManagerDB";
const storeName = "items";

export function initDB(onSuccess) {
  const request = indexedDB.open(dbName, 4);
  request.onerror = event => console.error("Database error:", event.target.error);
  request.onsuccess = event => {
    indexedDB_db = event.target.result;
    loadAllItemsFromDB().then(onSuccess);
  };
  request.onupgradeneeded = event => {
    const database = event.target.result;
    if (!database.objectStoreNames.contains(storeName)) {
      database.createObjectStore(storeName, { keyPath: "id" });
    }
    if (!database.objectStoreNames.contains("images")) {
      database.createObjectStore("images", { keyPath: "id" });
    }
  };
}

export function getImageFromDB(id) {
  return new Promise((resolve) => {
    if (!indexedDB_db || !indexedDB_db.objectStoreNames.contains("images")) return resolve("");
    const transaction = indexedDB_db.transaction("images", "readonly");
    const store = transaction.objectStore("images");
    const request = store.get(id);
    request.onsuccess = e => resolve(e.target.result ? e.target.result.image : "");
    request.onerror = () => resolve("");
  });
}

export function loadAllItemsFromDB() {
  return new Promise((resolve) => {
    if (!indexedDB_db) return resolve([]);
    const transaction = indexedDB_db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = event => {
      state.db = event.target.result.sort((a, b) => b.id - a.id);
      resolve(state.db);
    };
  });
}

export function saveItemToDB(item, imageData) {
  return new Promise((resolve, reject) => {
    const transaction = indexedDB_db.transaction([storeName, "images"], "readwrite");
    const store = transaction.objectStore(storeName);
    const imagesStore = transaction.objectStore("images");
    
    const itemCopy = { ...item };
    delete itemCopy.image; 
    store.put(itemCopy);
    
    if (imageData) imagesStore.put({ id: item.id, image: imageData });
    else imagesStore.delete(item.id);
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = e => reject(e);
  });
}

export function deleteItemFromDB(id) {
  return new Promise((resolve, reject) => {
    const transaction = indexedDB_db.transaction([storeName, "images"], "readwrite");
    transaction.objectStore(storeName).delete(id);
    transaction.objectStore("images").delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = e => reject(e);
  });
}

export function clearDBAndBulkAdd(newItems) {
  return new Promise((resolve, reject) => {
    const transaction = indexedDB_db.transaction([storeName, "images"], "readwrite");
    const store = transaction.objectStore(storeName);
    const imagesStore = transaction.objectStore("images");
    
    store.clear();
    imagesStore.clear();
    
    newItems.forEach(item => {
      const itemCopy = { ...item };
      const img = itemCopy.image;
      delete itemCopy.image;
      store.put(itemCopy);
      if (img) imagesStore.put({ id: item.id, image: img });
    });
    
    transaction.oncomplete = () => loadAllItemsFromDB().then(resolve);
    transaction.onerror = e => reject(e);
  });
}
