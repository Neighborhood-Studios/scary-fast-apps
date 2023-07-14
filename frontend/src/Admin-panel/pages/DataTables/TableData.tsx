import type { FC } from 'react';
import type { OutletContextType } from './DataTables.tsx';

import { useMemo } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { gql, useQuery } from '@apollo/client';

import {
    generateQueryForModel,
    getFieldsForModel,
    getModelPrimaryKeys,
    sortColumns,
} from './utils.ts';
import Loader from '../../common/Loader';

type TableDataProps = object;
export const TableData: FC<TableDataProps> = () => {
    const { name } = useParams<{ name: string }>();
    const schemaData = useOutletContext<OutletContextType>();
    const { queryString, columns } = generateQueryForModel(schemaData, name);
    const pks = getModelPrimaryKeys(schemaData, name || '');
    const modelFields = getFieldsForModel(schemaData, name || '');
    const query = useMemo(() => gql(queryString), [queryString]);
    const { data, loading } = useQuery(query);

    const sortedColumns = sortColumns(columns, pks);

    return name ? (
        <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
            <h4 className="mb-6 text-xl font-semibold text-black dark:text-white">
                {name} table
            </h4>

            {loading ? (
                <Loader />
            ) : (
                data && (
                    <div className="max-w-full overflow-x-auto">
                        <table className="w-full table-auto">
                            <thead>
                                <tr className="bg-gray-2 text-left dark:bg-meta-4">
                                    {sortedColumns.map((colName) => (
                                        <th
                                            className="min-w-[220px] py-4 px-4 font-medium text-black dark:text-white xl:pl-11"
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
                                {data[name].map(
                                    (dataRow: { [key: string]: unknown }) => (
                                        <tr
                                            key={pks
                                                .map((pk) => dataRow[pk])
                                                .join('-')}
                                        >
                                            {sortedColumns.map((colName) => (
                                                <td
                                                    className="border-b border-[#eee] py-5 px-4 dark:border-strokedark"
                                                    key={colName}
                                                >
                                                    <p className="text-black dark:text-white">
                                                        {renderColumnValue(
                                                            modelFields[
                                                                colName
                                                            ],
                                                            dataRow[colName]
                                                        )}
                                                    </p>
                                                </td>
                                            ))}
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )
            )}
        </div>
    ) : null;
};

function renderColumnValue(
    colData: ReturnType<typeof getFieldsForModel>[string],
    value: string | number | boolean | unknown
) {
    switch (colData.type) {
        case 'timestamptz':
            return new Date(String(value)).toLocaleString();
        case 'Boolean':
        case 'Int':
        case 'String':
        default:
            return String(value);
    }
}
