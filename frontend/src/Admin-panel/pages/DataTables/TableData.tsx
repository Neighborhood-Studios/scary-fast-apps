import type { FC } from 'react';
//
import { useMemo } from 'react';
import type { OutletContextType } from './DataTables.tsx';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { gql, useQuery } from '@apollo/client';

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

type TableDataProps = object;
export const TableData: FC<TableDataProps> = () => {
    const { name } = useParams<{ name: string }>();
    const schemaData = useOutletContext<OutletContextType>();
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
                                    {canEdit || canDelete ? <th></th> : null}
                                    {sortedColumns.map((colName) => (
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
                                        columns={sortedColumns}
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
        </div>
    ) : null;
};
