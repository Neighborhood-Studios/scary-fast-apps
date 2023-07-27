import type { FC, MouseEventHandler } from 'react';
//
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { gql, useLazyQuery } from '@apollo/client';
import { get } from 'lodash';

import {
    showTableConfigAtom,
    tableConfigSelector,
} from 'Recoil/data-tables.ts';
import type { OutletContextType } from './DataTables.tsx';
import {
    generateQueryForModel,
    getCanDelete,
    getCanEdit,
    getCanInsert,
    getFieldsForModel,
    getModelPrimaryKeys,
    sortColumns,
} from './utils.ts';
import Loader from '../../common/Loader';
import { DataRow } from '../../components/data-tables/DataRow.tsx';
import { ReactComponent as CogSVG } from '../../images/icon/icon-settings.svg';
import { Dropdown } from '../../components/Dropdown.tsx';
import { ConfigPopup } from '../../components/data-tables/ConfigPopup.tsx';
import { Paginator } from '../../components/paginator';
import { usePage } from '../../hooks/usePage.ts';

import { ReactComponent as OrderBySVG } from '../../images/icon/icon-order-by.svg';
import { ReactComponent as OrderASCSVG } from '../../images/icon/icon-order-by-asc.svg';
import { ReactComponent as OrderDESCSVG } from '../../images/icon/icon-order-by-desc.svg';
import { useLocationState } from '../../hooks/useLocationState.ts';

type TableDataProps = object;
const ORDER_DIR = ['asc', 'desc'] as const;
type OrderDirType = (typeof ORDER_DIR)[number];

export const TableData: FC<TableDataProps> = () => {
    const { name } = useParams<{ name: string }>();
    const schemaData = useOutletContext<OutletContextType>();
    const { pageSize, visibleColumns } = useRecoilValue(
        tableConfigSelector(name ?? '')
    );
    const [page, setPage] = usePage();
    const [locationState, , updateLocationState] = useLocationState<{
        orderBy: Record<string, OrderDirType>;
        key?: string;
    }>(name);

    const [orderBy, setOrderBy] = useState<Record<string, OrderDirType>>(
        locationState.orderBy ?? {}
    );

    const [showConfig, setShowConfig] = useRecoilState(showTableConfigAtom);
    const configRef = useRef<HTMLDivElement>(null);

    const { queryString, queryName, aggregationQueryName, columns } =
        generateQueryForModel(schemaData, name, orderBy);

    const pks = getModelPrimaryKeys(schemaData, name || '');
    const modelFields = getFieldsForModel(schemaData, name || '');
    const query = useMemo(() => gql(queryString), [queryString]);
    const [request, { data, loading, refetch }] = useLazyQuery<{
        [key: string]: Record<string, object>[];
    }>(query);
    const queryData = data?.[queryName];

    useEffect(() => {
        if (page) {
            request({
                variables: { limit: pageSize, offset: (page - 1) * pageSize },
            });
        }
    }, [page, pageSize, request]);

    const sortedColumns = sortColumns(columns, pks);
    const enabledColumns = visibleColumns
        ? sortedColumns.filter((colName) => visibleColumns.includes(colName))
        : sortedColumns;

    const canDelete = getCanDelete(schemaData, name);
    const canEdit = getCanEdit(schemaData, name);
    const canInsert = getCanInsert(schemaData, name);

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

    useLayoutEffect(() => {
        if (name !== locationState.key) {
            setOrderBy({});
        }
    }, [name, locationState.key]);

    return name ? (
        <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
            <h4 className="mb-6 text-xl font-semibold text-black dark:text-white flex flex-row align-middle">
                {name} table
                {canInsert && (
                    <Link
                        to="new"
                        className="ml-3 text-sm inline-flex items-center justify-center rounded-full bg-primary py-1 px-2 text-center font-medium text-white hover:bg-opacity-90 lg:px-1 xl:px-2"
                    >
                        + Add Item
                    </Link>
                )}
            </h4>

            {loading ? (
                <Loader local />
            ) : (
                queryData && (
                    <>
                        <div className="max-w-full overflow-x-auto">
                            <table className="w-full table-auto">
                                <thead>
                                    <tr className="bg-gray-2 text-left dark:bg-meta-4">
                                        <th className="dark:text-white p-4 align-middle leading-[0] w-0">
                                            <Dropdown
                                                triggerEl={<CogSVG />}
                                                initialState={showConfig}
                                                onStateChange={setShowConfig}
                                                dropDownRef={configRef}
                                            />
                                        </th>
                                        {enabledColumns.map((colName) => (
                                            <th
                                                className="min-w-[150px] py-4 px-4 font-medium text-black dark:text-white xl:pl-11"
                                                key={colName}
                                                title={
                                                    modelFields[colName]
                                                        .description
                                                }
                                                onClick={sortByColumn(colName)}
                                            >
                                                <div className="flex flex-row flex-nowrap justify-between items-center cursor-pointer">
                                                    {colName}
                                                    {getSortIcon(
                                                        orderBy,
                                                        colName
                                                    )}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {queryData.map((dataRow) => (
                                        <DataRow
                                            key={pks
                                                .map((pk) => dataRow[pk])
                                                .join('-')}
                                            tableName={name}
                                            rowData={dataRow}
                                            columns={enabledColumns}
                                            primaryKeys={pks}
                                            canEdit={canEdit}
                                            canDelete={canDelete}
                                            refetch={refetch}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {count && (
                            <Paginator
                                count={count}
                                limit={pageSize}
                                currentPage={page}
                                goToPage={setPage}
                            />
                        )}
                    </>
                )
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
                    tableName={name}
                    availableColumns={sortedColumns}
                    hasPagination={!!aggregationQueryName}
                    onPageSizeChange={() => setPage(1)}
                />
            </div>
        </div>
    ) : null;
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
