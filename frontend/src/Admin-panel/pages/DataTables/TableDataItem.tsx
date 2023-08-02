import type { FC } from 'react';
import { useMemo } from 'react';
import { Navigate, useOutletContext, useParams } from 'react-router-dom';
import { gql, useQuery } from '@apollo/client';
import { startCase } from 'lodash';
//
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
import Breadcrumb from '../../components/Breadcrumb.tsx';
import { getDataModelPath, getTablesPath } from '../../routes.tsx';

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

    const pageName = canEdit ? 'Edit item' : 'View item';
    return (
        <div>
            <Breadcrumb
                pageName={pageName}
                path={[
                    {
                        label: 'Data Tables',
                        to: getTablesPath(),
                    },
                    { label: startCase(name), to: getDataModelPath(name) },
                ]}
                hasBack
            />

            <div className="flex flex-col gap-9">
                <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
                    <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
                        <h3 className="font-medium text-black dark:text-white">
                            {canEdit ? 'Edit' : 'View'} <i>{name}</i> item
                        </h3>
                    </div>
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
