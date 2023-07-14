import type { FC } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import { IntrospectionType } from 'graphql/utilities';

type ModelDataItemProps = object;
export const TableDataItem: FC<ModelDataItemProps> = () => {
    const rootModels = useOutletContext<IntrospectionType[]>();
    const { name, id } = useParams<{ name: string; id: string }>();

    return <pre>{JSON.stringify({ id, name, rootModels }, null, '  ')}</pre>;
};
