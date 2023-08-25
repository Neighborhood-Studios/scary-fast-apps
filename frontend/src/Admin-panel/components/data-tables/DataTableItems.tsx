import type { FC, MouseEventHandler } from 'react';
import type { SchemaData } from '../../pages/DataTables/DataTables.tsx';
//
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { gql, useLazyQuery } from '@apollo/client';
import { get, isEmpty } from 'lodash';

import {
    showTableConfigAtom,
    tableConfigSelector,
} from 'Recoil/data-tables.ts';
import {
    generateQueryForModel,
    getCanDelete,
    getCanEdit,
    getFieldsForModel,
    getModelPrimaryKeys,
    sortColumns,
} from '../../pages/DataTables/utils.ts';
import Loader from '../../common/Loader';
import { DataRow } from './DataRow.tsx';
import { Dropdown } from '../Dropdown.tsx';
import { ConfigPopup } from './ConfigPopup.tsx';
import { Paginator } from '../paginator';
import { usePage } from '../../hooks/usePage.ts';
import { useLocationState } from '../../hooks/useLocationState.ts';
import { FilterPopup } from './FilterPopup.tsx';

import { CogSVG } from '../../images/icon';
import { OrderBySVG } from '../../images/icon';
import { OrderASCSVG } from '../../images/icon';
import { OrderDESCSVG } from '../../images/icon';
import { FilterSVG } from '../../images/icon';
import { FilterActiveSVG } from '../../images/icon';
import { showToast } from '../../utils.ts';
import { ErrorMsg } from '../alerts/ErrorMsg.tsx';

const ORDER_DIR = ['asc', 'desc'] as const;
type OrderDirType = (typeof ORDER_DIR)[number];

export const TableItems: FC<{
    tableName: string;
    schemaData: SchemaData;
    searchString: string;
}> = ({ tableName, schemaData, searchString }) => {
    const { pageSize, visibleColumns } = useRecoilValue(
        tableConfigSelector(tableName ?? '')
    );
    const [page, setPage] = usePage(tableName);
    const [locationState, , updateLocationState] = useLocationState<{
        orderBy: Record<string, OrderDirType>;
        filterData: FilterItemData[];
        key?: string;
    }>(tableName);

    const [orderBy, setOrderBy] = useState<Record<string, OrderDirType>>(
        locationState.orderBy ?? {}
    );
    const [tableData, setTableData] = useState<Record<string, object>[]>();
    const [showConfig, setShowConfig] = useRecoilState(showTableConfigAtom);
    const configRef = useRef<HTMLDivElement>(null);

    const [showFilter, setShowFilter] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);
    const [filterData, setFilterData] = useState<FilterItemData[]>(
        locationState.filterData ?? []
    );
    const filterActive = !isEmpty(filterData);

    const { queryString, queryName, aggregationQueryName, columns } =
        generateQueryForModel(
            schemaData,
            tableName,
            orderBy,
            filterData,
            searchString
        );

    const pks = getModelPrimaryKeys(schemaData, tableName || '');
    const modelFields = getFieldsForModel(schemaData, tableName || '');
    const query = useMemo(() => gql(queryString), [queryString]);
    const [request, { data, loading, error, refetch }] = useLazyQuery<{
        [key: string]: Record<string, object>[];
    }>(query);

    useEffect(() => {
        if (page) {
            request({
                variables: { limit: pageSize, offset: (page - 1) * pageSize },
            }).catch((error) => {
                showToast(
                    tableName,
                    <ErrorMsg title="Request Error">{error.message}</ErrorMsg>,
                    'error',
                    false
                );
            });
        }
    }, [tableName, page, pageSize, request]);

    useEffect(() => {
        if (data?.[queryName]) {
            setTableData(data[queryName]);
        }
    }, [data, queryName]);

    useEffect(() => {
        if (error) {
            setTableData(undefined);
        }
    }, [error]);

    const sortedColumns = sortColumns(columns, pks);
    const enabledColumns = visibleColumns
        ? sortedColumns.filter((colName) => visibleColumns.includes(colName))
        : sortedColumns;

    const canDelete = getCanDelete(schemaData, tableName);
    const canEdit = getCanEdit(schemaData, tableName);

    const count: number | undefined =
        aggregationQueryName &&
        get(data, [aggregationQueryName, 'aggregate', 'count']);

    const sortByColumn =
        (colName: string): MouseEventHandler =>
        () =>
            setOrderBy((orderBy) => {
                const newDirection =
                    ORDER_DIR[ORDER_DIR.indexOf(orderBy[colName]) + 1];
                return newDirection ? { [colName]: newDirection } : {};
            });

    useEffect(() => {
        updateLocationState({ orderBy });
    }, [orderBy, updateLocationState]);

    useEffect(() => {
        setPage(1);
        updateLocationState({ filterData });
    }, [filterData, setPage, updateLocationState]);

    useLayoutEffect(() => {
        if (tableName !== locationState.key) {
            setOrderBy({});
        }
    }, [tableName, locationState.key]);
    return (
        <>
            <div className="max-w-full relative">
                {loading && (
                    <div className="absolute top-0 left-0 w-full h-full opacity-50">
                        <Loader local />
                    </div>
                )}
                {error && (
                    <div className="m-5 text-center text-xl">
                        {error.message}
                    </div>
                )}
                {tableData && (
                    <div className="overflow-x-auto">
                        <table className="w-full table-auto">
                            <thead>
                                <tr className="bg-gray-2 text-left dark:bg-meta-4">
                                    <th className="dark:text-white p-4 align-middle leading-[0] w-0">
                                        <div className="whitespace-nowrap flex flex-row gap-1 justify-between">
                                            <Dropdown
                                                triggerEl={
                                                    <CogSVG className="hover:text-primary" />
                                                }
                                                initialState={showConfig}
                                                onStateChange={setShowConfig}
                                                dropDownRef={configRef}
                                            />
                                            <Dropdown
                                                triggerEl={
                                                    filterActive ? (
                                                        <FilterActiveSVG className="text-primary w-[1.25em] h-[1.25em]" />
                                                    ) : (
                                                        <FilterSVG className="hover:text-primary w-[1.25em] h-[1.25em]" />
                                                    )
                                                }
                                                initialState={showFilter}
                                                onStateChange={setShowFilter}
                                                dropDownRef={filterRef}
                                            />
                                        </div>
                                    </th>
                                    {enabledColumns.map((colName) => (
                                        <th
                                            className="min-w-[150px] py-4 px-4 font-medium text-black dark:text-white xl:pl-11"
                                            key={colName}
                                            title={
                                                modelFields[colName].description
                                            }
                                        >
                                            <div
                                                className="flex flex-row flex-nowrap justify-between items-center cursor-pointer"
                                                onClick={sortByColumn(colName)}
                                            >
                                                {colName}
                                                {getSortIcon(orderBy, colName)}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {tableData.length ? (
                                    tableData.map((dataRow) => (
                                        <DataRow
                                            key={pks
                                                .map((pk) => dataRow[pk])
                                                .join('-')}
                                            tableName={tableName}
                                            rowData={dataRow}
                                            columns={enabledColumns}
                                            primaryKeys={pks}
                                            canEdit={canEdit}
                                            canDelete={canDelete}
                                            refetch={refetch}
                                        />
                                    ))
                                ) : (
                                    <tr>
                                        <td
                                            className="p-5 text-center text-xl"
                                            colSpan={1 + enabledColumns.length}
                                        >
                                            <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2">
                                                no data
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {!!count && (
                <Paginator
                    count={count}
                    limit={pageSize}
                    currentPage={page}
                    goToPage={setPage}
                />
            )}
            <div
                className={`
                    absolute w-[80%]
                    left-1/2 -translate-x-1/2
                    top-30
                    ${showConfig ? 'block' : 'hidden'}
                `}
            >
                <ConfigPopup
                    ref={configRef}
                    tableName={tableName}
                    availableColumns={sortedColumns}
                    hasPagination={!!aggregationQueryName}
                    onPageSizeChange={() => setPage(1)}
                />
            </div>
            <div
                className={`
                    absolute w-[80%]
                    left-1/2 -translate-x-1/2
                    top-30
                    ${showFilter ? 'block' : 'hidden'}
                `}
            >
                <FilterPopup
                    ref={filterRef}
                    tableName={tableName}
                    currentConfig={filterData}
                    onFilterChange={setFilterData}
                    close={() => setShowFilter(false)}
                />
            </div>
        </>
    );
};

function getSortIcon(sortBy: Record<string, OrderDirType>, colName: string) {
    switch (sortBy[colName]) {
        case 'asc':
            return <OrderASCSVG />;
        case 'desc':
            return <OrderDESCSVG />;
        default:
            return <OrderBySVG />;
    }
}
