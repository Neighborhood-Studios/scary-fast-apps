import type { FC } from 'react';
import { useMemo } from 'react';
import { Navigate, useOutletContext, useParams } from 'react-router-dom';
import { gql, useQuery } from '@apollo/client';
import {
    generateQueryByPk,
    getCanEdit,
    getModelPrimaryKeys,
    pkDelimiter,
} from './utils.ts';
import { OutletContextType } from './DataTables.tsx';
import Loader from '../../common/Loader';
import { UpdateForm } from '../../components/data-tables/UpdateForm.tsx';
import { ViewItem } from '../../components/data-tables/ViewItem.tsx';

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

    const canEdit = getCanEdit(schemaData, name);

    if (!name || !pks) return <Navigate to={'../'} replace />;
    if (loading) return <Loader />;
    if (!queryData) return <>'error'</>;
    return (
        <div className="flex flex-col gap-9">
            <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
                <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
                    <h3 className="font-medium text-black dark:text-white">
                        {name} item
                    </h3>
                    {canEdit ? (
                        <UpdateForm tableName={name} initialData={queryData} />
                    ) : (
                        <ViewItem
                            data={queryData}
                            tableName={name}
                            pkKeys={pkKeys}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};
