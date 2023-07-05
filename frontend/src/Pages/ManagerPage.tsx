import type { FC } from 'react';
import { useManagerData } from 'api/manager_data.ts';

type ManagerPageProps = object;
export const ManagerPage: FC<ManagerPageProps> = () => {
    const { loading, data, error } = useManagerData();
    if (loading) return <>Loading</>;
    if (data) return <pre>{JSON.stringify(Object(data), null, '  ')}</pre>;
    if (error) return <>{JSON.stringify(error)}</>;
    return null;
};
