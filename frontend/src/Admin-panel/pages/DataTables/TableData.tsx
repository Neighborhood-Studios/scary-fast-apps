import type { FC } from 'react';
import type { OutletContextType } from './DataTables.tsx';

import { useMemo } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { gql, useMutation, useQuery } from '@apollo/client';

import {
    generateDeleteMutation,
    generateQueryForModel,
    getCanDelete,
    getCanEdit,
    getCanInsert,
    getFieldsForModel,
    getModelPrimaryKeys,
    pkDelimiter,
    sortColumns,
} from './utils.ts';
import Loader from '../../common/Loader';
import { ReactComponent as EditSVG } from '../../images/actions/edit.svg';
import { ReactComponent as DeleteSVG } from '../../images/actions/delete.svg';

type TableDataProps = object;
export const TableData: FC<TableDataProps> = () => {
    const { name } = useParams<{ name: string }>();
    const schemaData = useOutletContext<OutletContextType>();
    const { queryString, queryName, columns } = generateQueryForModel(
        schemaData,
        name
    );
    const {
        mutationString: mutationDeleteString,
        // mutationName,
        args: deleteArgs,
    } = generateDeleteMutation(schemaData, name);
    const pks = getModelPrimaryKeys(schemaData, name || '');
    const modelFields = getFieldsForModel(schemaData, name || '');
    const query = useMemo(() => gql(queryString), [queryString]);
    const deleteMutation = useMemo(
        () => gql(mutationDeleteString),
        [mutationDeleteString]
    );
    const { data, loading, refetch } = useQuery(query);
    const [deleteItem] = useMutation(deleteMutation);

    const sortedColumns = sortColumns(columns, pks);
    const queryData = data?.[queryName];

    const canDelete = getCanDelete(schemaData, name || '');
    const canEdit = getCanEdit(schemaData, name || '');
    const canInsert = getCanInsert(schemaData, name || '');

    const onDeleteItem = (data: any) => () => {
        const confirmResult = confirm('delete item?');
        if (confirmResult) {
            const variables = deleteArgs.reduce(
                (variables, { name, varName }) =>
                    Object.assign(variables, { [varName]: data[name] }),
                {}
            );
            deleteItem({ variables })
                .then(() => refetch())
                .catch(console.warn.bind(console, 'gql delete error'));
        }
    };
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
                                    <th></th>
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
                                {queryData.map(
                                    (dataRow: { [key: string]: unknown }) => (
                                        <tr
                                            key={pks
                                                .map((pk) => dataRow[pk])
                                                .join('-')}
                                        >
                                            <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                                                <div className="flex flex-row flex-nowrap gap-2 align-middle">
                                                    {canDelete && (
                                                        <button
                                                            title="delete row"
                                                            className="hover:text-primary"
                                                            onClick={onDeleteItem(
                                                                dataRow
                                                            )}
                                                        >
                                                            <DeleteSVG />
                                                        </button>
                                                    )}
                                                    {canEdit && (
                                                        <Link
                                                            title="edit row"
                                                            className="leading-[0px]"
                                                            to={pks
                                                                .map(
                                                                    (pk) =>
                                                                        dataRow[
                                                                            pk
                                                                        ]
                                                                )
                                                                .join(
                                                                    pkDelimiter
                                                                )}
                                                        >
                                                            <button className="hover:text-primary">
                                                                <EditSVG />
                                                            </button>
                                                        </Link>
                                                    )}
                                                </div>
                                            </td>
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
