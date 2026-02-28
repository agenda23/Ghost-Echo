import { DB_CONFIG } from './constants';

export interface Reply {
    id: string;
    conversation_id: string;
    user_handle: string;
    full_text: string;
    reply_count: number;
    favorite_count: number;
    timestamp: string;
}

class GhostEchoDB {
    private db: IDBDatabase | null = null;

    async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_CONFIG.NAME, DB_CONFIG.VERSION);

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(DB_CONFIG.STORES.REPLIES)) {
                    db.createObjectStore(DB_CONFIG.STORES.REPLIES, { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                this.db = (event.target as IDBOpenDBRequest).result;
                resolve();
            };

            request.onerror = () => reject(request.error);
        });
    }

    async saveReply(reply: Reply): Promise<void> {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(DB_CONFIG.STORES.REPLIES, 'readwrite');
            const store = transaction.objectStore(DB_CONFIG.STORES.REPLIES);
            const request = store.put(reply);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getAllReplies(): Promise<Reply[]> {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(DB_CONFIG.STORES.REPLIES, 'readonly');
            const store = transaction.objectStore(DB_CONFIG.STORES.REPLIES);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async clearAllReplies(): Promise<void> {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(DB_CONFIG.STORES.REPLIES, 'readwrite');
            const store = transaction.objectStore(DB_CONFIG.STORES.REPLIES);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

export const db = new GhostEchoDB();
