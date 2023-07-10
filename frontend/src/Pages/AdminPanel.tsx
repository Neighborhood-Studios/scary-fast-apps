import type { FC } from 'react';

type AdminPanelProps = object;
export const AdminPanel: FC<AdminPanelProps> = () => {
    return (
        <>
            this is an Admin panel. It should be available for 'manager' role
            only
        </>
    );
};
