import { atom } from 'recoil';

const pinnedTablesStorageKey = 'pinned';
export const pinnedTables = atom<string[]>({
    key: 'pinnedTables',
    default: [],
    effects: [
        function ({ setSelf, trigger, onSet }) {
            if (trigger === 'get') {
                try {
                    const item = window.localStorage.getItem(
                        pinnedTablesStorageKey
                    );
                    const value = JSON.parse(item || '[]');
                    setSelf(value);
                } catch (error) {
                    //noop
                }
            }

            onSet((newValue) => {
                window.localStorage.setItem(
                    pinnedTablesStorageKey,
                    JSON.stringify(newValue)
                );
            });
            const storageHandler = ({ key, newValue }: StorageEvent) => {
                if (key !== pinnedTablesStorageKey) return;
                try {
                    const value = JSON.parse(newValue || '[]');
                    setSelf(value);
                } catch (e) {
                    //noop
                }
            };
            window.addEventListener('storage', storageHandler);
            return () => window.removeEventListener('storage', storageHandler);
        },
    ],
});
