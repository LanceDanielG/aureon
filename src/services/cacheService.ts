
interface CacheItem<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

const CACHE_PREFIX = 'ledgerlink_cache_';
const DEFAULT_TTL = 1000 * 60 * 5; // 5 minutes

export const cacheService = {
    set<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL): void {
        try {
            const now = Date.now();
            const item: CacheItem<T> = {
                data,
                timestamp: now,
                expiresAt: now + ttlMs
            };
            localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(item));
        } catch (error) {
            console.error('Error setting cache:', error);
        }
    },

    get<T>(key: string): T | null {
        try {
            const itemStr = localStorage.getItem(CACHE_PREFIX + key);
            if (!itemStr) return null;

            const item: CacheItem<T> = JSON.parse(itemStr);
            const now = Date.now();

            if (now > item.expiresAt) {
                this.invalidate(key);
                return null;
            }

            return item.data;
        } catch (error) {
            console.error('Error getting cache:', error);
            return null;
        }
    },

    invalidate(key: string): void {
        try {
            localStorage.removeItem(CACHE_PREFIX + key);
        } catch (error) {
            console.error('Error invalidating cache:', error);
        }
    },

    invalidateAll(): void {
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith(CACHE_PREFIX)) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.error('Error clearing cache:', error);
        }
    },

    isStale(key: string): boolean {
        try {
            const itemStr = localStorage.getItem(CACHE_PREFIX + key);
            if (!itemStr) return true;

            const item: CacheItem<unknown> = JSON.parse(itemStr);
            return Date.now() > item.expiresAt;
        } catch {
            return true;
        }
    }
};
