import type { FC } from 'react';
//
import { useMemo, useRef } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { gql, useQuery } from '@apollo/client';

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

type TableDataProps = object;
export const TableData: FC<TableDataProps> = () => {
    const { name } = useParams<{ name: string }>();
    const schemaData = useOutletContext<OutletContextType>();
    const { /* itemsOnPage,*/ visibleColumns } = useRecoilValue(
        tableConfigSelector(name ?? '')
    );
    const [showConfig, setShowConfig] = useRecoilState(showTableConfigAtom);
    const configRef = useRef<HTMLDivElement>(null);

    const { queryString, queryName, columns } = generateQueryForModel(
        schemaData,
        name
    );
    const pks = getModelPrimaryKeys(schemaData, name || '');
    const modelFields = getFieldsForModel(schemaData, name || '');
    const query = useMemo(() => gql(queryString), [queryString]);
    const { data, loading, refetch } = useQuery<{
        [key: string]: Record<string, object>[];
    }>(query);

    const sortedColumns = sortColumns(columns, pks);
    const enabledColumns = visibleColumns
        ? sortedColumns.filter((colName) => visibleColumns.includes(colName))
        : sortedColumns;

    const canDelete = getCanDelete(schemaData, name);
    const canEdit = getCanEdit(schemaData, name);
    const canInsert = getCanInsert(schemaData, name);

    const queryData = data?.[queryName];

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
                <Loader />
            ) : (
                queryData && (
                    <div className="max-w-full overflow-x-auto">
                        <table className="w-full table-auto">
                            <thead>
                                <tr className="bg-gray-2 text-left dark:bg-meta-4">
                                    <th className="dark:text-white p-4 align-middle leading-[0] w-0">
                                        <Dropdown
                                            triggerEl={<CogSVG />}
                                            onStateChange={setShowConfig}
                                            dropDownRef={configRef}
                                        />
                                    </th>
                                    {enabledColumns.map((colName) => (
                                        <th
                                            className="min-w-[150px] py-4 px-4 font-medium text-black dark:text-white xl:pl-11"
                                            key={colName}
                                            title={
                                                modelFields[colName].description
                                            }
                                        >
                                            {colName}
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
                )
            )}
            <div
                className={`
                    absolute w-[80%] h-[80%]
                    left-1/2 -translate-x-1/2
                    top-1/2 -translate-y-1/2
                    ${showConfig ? 'block' : 'hidden'}
                `}
            >
                <ConfigPopup
                    ref={configRef}
                    tableName={name}
                    availableColumns={sortedColumns}
                />
            </div>
        </div>
    ) : null;
};
