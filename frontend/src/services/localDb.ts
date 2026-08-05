export interface TokenRecord {
  id: string;
  meterNumber: string;
  tokenCode: string;
  amountKes: number;
  unitsKwh: number;
  source: 'MPESA' | 'TRANSFER' | 'COMMUNITY';
  createdAt: string;
}

const DB_NAME = 'KPLCConsumerVault';
const STORE_NAME = 'tokens';
const DB_VERSION = 1;

export const openVaultDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const saveTokenLocal = async (token: TokenRecord): Promise<void> => {
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(token);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getCachedTokens = async (): Promise<TokenRecord[]> => {
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result.reverse());
    request.onerror = () => reject(request.error);
  });
};