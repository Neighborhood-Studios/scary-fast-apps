import { atom, selectorFamily } from 'recoil';

type TablesConfig = Record<
    string,
    {
        itemsOnPage: number;
        visibleColumns: string[] | null;
    }
>;
const DEFAULT_ITEMS_ON_PAGE = 5;
const DEFAULT_TABLE_CONFIG = {
    itemsOnPage: DEFAULT_ITEMS_ON_PAGE,
    visibleColumns: null,
};
const tablesConfigKey = 'tables-config';

export const showTableConfigAtom = atom({
    key: 'showTableConfigAtom',
    default: false,
});

export const dataTablesConfigAtom = atom<TablesConfig>({
    key: 'dataTablesConfigAtom',
    default: {},
    effects: [
        function ({ setSelf, trigger, onSet }) {
            if (trigger === 'get') {
                const storedValue = getStoredValue<TablesConfig>(
                    tablesConfigKey,
                    {}
                );
                setSelf(storedValue);
            }

            onSet((newValue) => {
                window.localStorage.setItem(
                    tablesConfigKey,
                    JSON.stringify(newValue)
                );
            });

            const storageHandler = ({ key, newValue }: StorageEvent) => {
                if (key !== tablesConfigKey) return;
                try {
                    const value = newValue && JSON.parse(newValue);
                    value && setSelf(value);
                } catch (e) {
                    //noop
                }
            };
            window.addEventListener('storage', storageHandler);
            return () => window.removeEventListener('storage', storageHandler);
        },
    ],
});

export const tableConfigSelector = selectorFamily<TablesConfig[string], string>(
    {
        key: 'tableConfigSelector',
        get:
            (tableName) =>
            ({ get }) =>
                get(dataTablesConfigAtom)[tableName] ?? DEFAULT_TABLE_CONFIG,
        set:
            (tableName) =>
            ({ set }, data) => {
                set(dataTablesConfigAtom, (tablesConfig) => ({
                    ...tablesConfig,
                    [tableName]: Object.assign(
                        {},
                        tablesConfig[tableName] ?? DEFAULT_TABLE_CONFIG,
                        data
                    ),
                }));
            },
    }
);

function getStoredValue<T>(key: string, defaultValue: T): T {
    let storedValue;
    try {
        const item = window.localStorage.getItem(key);

        if (item === null) {
            window.localStorage.setItem(key, JSON.stringify(defaultValue));
            storedValue = defaultValue;
        } else {
            storedValue = JSON.parse(item);
        }
    } catch (error) {
        storedValue = defaultValue;
    }
    return storedValue;
}
