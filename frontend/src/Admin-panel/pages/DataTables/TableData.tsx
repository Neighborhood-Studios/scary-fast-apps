import type { FC } from 'react';
import type { OutletContextType } from './DataTables.tsx';
//
import { useCallback } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
//
import { getCanInsert } from './utils.ts';
import { TableItems } from '../../components/data-tables/DataTableItems.tsx';
import { useLocationState } from '../../hooks/useLocationState.ts';
import { Search } from '../../components/Search.tsx';

type TableDataProps = object;

export const TableData: FC<TableDataProps> = () => {
    const { name } = useParams<{ name: string }>();
    const schemaData = useOutletContext<OutletContextType>();

    const canInsert = getCanInsert(schemaData, name);
    const [locationState, , updateLocationState] = useLocationState<{
        searchValue: string;
    }>(name);
    const onSearchInput = useCallback(
        (value: string) => updateLocationState({ searchValue: value }),
        [updateLocationState]
    );

    return name ? (
        <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
            <div className="mb-6 flex flex-row items-center">
                <h4 className="shrink-0 text-xl font-semibold text-black dark:text-white ">
                    {name} table
                </h4>
                {canInsert && (
                    <Link
                        to="new"
                        className="ml-3 shrink-0 text-sm inline-flex items-center justify-center rounded-full bg-primary py-1 px-2 text-center font-medium text-white hover:bg-opacity-90 lg:px-1 xl:px-2"
                    >
                        + Add Item
                    </Link>
                )}
                <span className="ml-auto" />
                <Search
                    initialValue={locationState.searchValue}
                    onChange={onSearchInput}
                />
            </div>
            <TableItems
                key={name}
                tableName={name}
                schemaData={schemaData}
                searchString={locationState.searchValue}
            />
        </div>
    ) : null;
};
