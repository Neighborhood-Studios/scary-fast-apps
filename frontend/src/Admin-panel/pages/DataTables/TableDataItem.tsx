import type { FC } from 'react';

import { useMemo } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { gql, useQuery } from '@apollo/client';
import {
    generateQueryByPk,
    getEditableFieldsForModel,
    getFieldsForModel,
    getModelPrimaryKeys,
    getSelectableFields,
    pkDelimiter,
    sortColumns,
} from './utils.ts';
import { OutletContextType } from './DataTables.tsx';
import Loader from '../../common/Loader';
import { InputDefault } from '../../components/forms/Inputs.tsx';

type ModelDataItemProps = object;
export const TableDataItem: FC<ModelDataItemProps> = () => {
    const schemaData = useOutletContext<OutletContextType>();
    const { name, pks } = useParams<{ name: string; pks: string }>();
    const pkValues = pks?.split(pkDelimiter) ?? [];
    const pkKeys = getModelPrimaryKeys(schemaData, name || '');

    const pkMap = pkKeys.reduce(
        (pks, pkName, idx) => Object.assign(pks, { [pkName]: pkValues[idx] }),
        {}
    );
    const { queryString, queryName } = generateQueryByPk(
        schemaData,
        name,
        pkMap
    );

    const query = useMemo(() => gql(queryString), [queryString]);
    const { data, loading } = useQuery(query);
    const queryData = data?.[queryName];

    const modelFields = getFieldsForModel(schemaData, name || '');
    const selectableColumns = getSelectableFields(schemaData, name || '');
    const editableColumns = getEditableFieldsForModel(schemaData, name || '');

    if (loading) return <Loader />;
    if (!queryData) return <>'error'</>;

    return (
        <div className="flex flex-col gap-9">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
                    <h3 className="font-medium text-black dark:text-white">
                        {name} item
                    </h3>
                </div>
                <form action="">
                    <div className="p-6.5">
                        {sortColumns(selectableColumns, pkKeys).map(
                            (colName) => (
                                <div className="mb-4.5" key={colName}>
                                    <InputDefault
                                        label={colName}
                                        name={colName}
                                        defaultValue={queryData[colName]}
                                        disabled={
                                            !editableColumns.includes(colName)
                                        }
                                        required={
                                            editableColumns.includes(colName) &&
                                            !modelFields[colName].nullable
                                        }
                                    />
                                </div>
                            )
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};
