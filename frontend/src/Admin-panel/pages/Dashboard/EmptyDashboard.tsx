import type { FC } from 'react';

type EmptyDashboardProps = object;
export const EmptyDashboard: FC<EmptyDashboardProps> = () => {
    return (
        <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
            <h4>Dashboard</h4>
        </div>
    );
};
