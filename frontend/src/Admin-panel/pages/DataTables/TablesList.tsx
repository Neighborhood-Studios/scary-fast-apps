import type { FC } from 'react';
import { generatePath, Link, useOutletContext } from 'react-router-dom';
import { useRecoilState } from 'recoil';

import { pinnedTables } from 'Recoil/sidebar.ts';
//
import { getTables } from './utils.ts';
import { OutletContextType } from './DataTables.tsx';
import { ADMIN_ROTES } from '../../routes.tsx';
import Breadcrumb from '../../components/Breadcrumb.tsx';
import { ViewSVG, PinSVG, PinActiveSVG } from '../../images/actions';

type DataTablesProps = object;
export const TablesList: FC<DataTablesProps> = () => {
    const schemaData = useOutletContext<OutletContextType>();
    const [pinned, setPinned] = useRecoilState(pinnedTables);
    const tables = getTables(schemaData);

    const pinTable = (name: string) => () => {
        setPinned(pinned.concat(name));
    };
    const unpinTable = (name: string) => () => {
        setPinned(pinned.filter((pinnedName) => pinnedName !== name));
    };
    return (
        <div>
            <Breadcrumb pageName={'Data Tables'} />

            <div className="rounded-sm border border-stroke bg-white px-5 pt-6 pb-2.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
                <div className="max-w-full overflow-x-auto">
                    <table className="w-full table-auto">
                        <thead>
                            <tr className="bg-gray-2 text-left dark:bg-meta-4">
                                <th className="min-w-[220px] py-4 px-4 font-medium text-black dark:text-white xl:pl-11">
                                    Model name
                                </th>
                                <th className="min-w-[150px] py-4 px-4 font-medium text-black dark:text-white">
                                    Description
                                </th>
                                <th className="py-4 px-4 font-medium text-black dark:text-white">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {tables.map((table) => (
                                <tr key={table.name}>
                                    <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                                        <Link
                                            className="font-medium text-black dark:text-white"
                                            to={generatePath(
                                                ADMIN_ROTES.DATA_TABLE_DATA,
                                                { name: table.name }
                                            )}
                                        >
                                            {table.name}
                                        </Link>
                                    </td>
                                    <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                                        <p className="text-black dark:text-white">
                                            {table.description}
                                        </p>
                                    </td>
                                    <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                                        <div className="flex items-center space-x-3.5">
                                            <Link
                                                to={generatePath(
                                                    ADMIN_ROTES.DATA_TABLE_DATA,
                                                    { name: table.name }
                                                )}
                                            >
                                                <ViewSVG />
                                            </Link>
                                            <button className="hover:text-primary">
                                                {pinned.includes(table.name) ? (
                                                    <PinActiveSVG
                                                        onClick={unpinTable(
                                                            table.name
                                                        )}
                                                    />
                                                ) : (
                                                    <PinSVG
                                                        onClick={pinTable(
                                                            table.name
                                                        )}
                                                    />
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
