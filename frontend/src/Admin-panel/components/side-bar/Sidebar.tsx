import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useRecoilValue } from 'recoil';

import { pinnedTables } from 'Recoil/sidebar.ts';
import Logo from '../../images/logo/logo.svg';
import SidebarLinkGroup from './SidebarLinkGroup.tsx';
import { ADMIN_ROTES, getDataModelPath } from '../../routes.tsx';
import { SidebarLinkItem } from './SidebarLinkItem.tsx';

// import { ReactComponent as ChartsSVG } from '../../images/sidebar/chart.svg';
import { ReactComponent as DashboardSVGSVG } from '../../images/sidebar/dashboard.svg';
import { ReactComponent as TablesSVG } from '../../images/sidebar/tables.svg';
// import { ReactComponent as ElementsSVG } from '../../images/sidebar/elements.svg';
// import { ReactComponent as FormsSVG } from '../../images/sidebar/forms.svg';
// import { ReactComponent as ProfileSVG } from '../../images/sidebar/profile.svg';
import { ReactComponent as SettingsSVG } from '../../images/sidebar/settings.svg';
// import { ReactComponent as CalendsrSVG } from '../../images/sidebar/calendsr.svg';

interface SidebarProps {
    sidebarOpen: boolean;
    setSidebarOpen: (arg: boolean) => void;
}

const Sidebar = ({ sidebarOpen, setSidebarOpen }: SidebarProps) => {
    const location = useLocation();
    const { pathname } = location;

    const trigger = useRef<HTMLButtonElement>(null);
    const sidebar = useRef<HTMLElement>(null);

    const storedSidebarExpanded = localStorage.getItem('sidebar-expanded');
    const [sidebarExpanded] = useState(
        storedSidebarExpanded === null
            ? false
            : storedSidebarExpanded === 'true'
    );

    const pinned = useRecoilValue(pinnedTables);

    // close on click outside
    useEffect(() => {
        const clickHandler = ({ target }: MouseEvent) => {
            if (!sidebar.current || !trigger.current) return;
            if (
                !sidebarOpen ||
                sidebar.current.contains(target as HTMLElement) ||
                trigger.current.contains(target as HTMLElement)
            )
                return;
            setSidebarOpen(false);
        };
        document.addEventListener('click', clickHandler);
        return () => document.removeEventListener('click', clickHandler);
    });

    // close if the esc key is pressed
    useEffect(() => {
        const keyHandler = ({ keyCode }: KeyboardEvent) => {
            if (!sidebarOpen || keyCode !== 27) return;
            setSidebarOpen(false);
        };
        document.addEventListener('keydown', keyHandler);
        return () => document.removeEventListener('keydown', keyHandler);
    });

    useEffect(() => {
        localStorage.setItem('sidebar-expanded', sidebarExpanded.toString());
        if (sidebarExpanded) {
            document.querySelector('body')?.classList.add('sidebar-expanded');
        } else {
            document
                .querySelector('body')
                ?.classList.remove('sidebar-expanded');
        }
    }, [sidebarExpanded]);
    return (
        <aside
            ref={sidebar}
            className={`absolute left-0 top-0 z-9999 flex h-screen w-72.5 flex-col overflow-y-hidden bg-black duration-300 ease-linear dark:bg-boxdark lg:static lg:translate-x-0 ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
            {/* <!-- SIDEBAR HEADER --> */}
            <div className="flex items-center justify-between gap-2 px-6 py-5.5 lg:py-6.5">
                <NavLink to="">
                    <img src={Logo} alt="Logo" />
                </NavLink>

                <button
                    ref={trigger}
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    aria-controls="sidebar"
                    aria-expanded={sidebarOpen}
                    className="block lg:hidden"
                >
                    <svg
                        className="fill-current"
                        width="20"
                        height="18"
                        viewBox="0 0 20 18"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M19 8.175H2.98748L9.36248 1.6875C9.69998 1.35 9.69998 0.825 9.36248 0.4875C9.02498 0.15 8.49998 0.15 8.16248 0.4875L0.399976 8.3625C0.0624756 8.7 0.0624756 9.225 0.399976 9.5625L8.16248 17.4375C8.31248 17.5875 8.53748 17.7 8.76248 17.7C8.98748 17.7 9.17498 17.625 9.36248 17.475C9.69998 17.1375 9.69998 16.6125 9.36248 16.275L3.02498 9.8625H19C19.45 9.8625 19.825 9.4875 19.825 9.0375C19.825 8.55 19.45 8.175 19 8.175Z"
                            fill=""
                        />
                    </svg>
                </button>
            </div>
            {/* <!-- SIDEBAR HEADER --> */}

            <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
                {/* <!-- Sidebar Menu --> */}
                <nav className="mt-5 py-4 px-4 lg:mt-9 lg:px-6">
                    {/* <!-- Menu Group --> */}
                    <div>
                        <h3 className="mb-4 ml-4 text-sm font-semibold text-bodydark2">
                            MENU
                        </h3>

                        <ul className="mb-6 flex flex-col gap-1.5">
                            {/* <!-- Menu Item Dashboard --> */}
                            <li>
                                <SidebarLinkItem
                                    to=""
                                    icon={<DashboardSVGSVG />}
                                    end
                                >
                                    Dashboard
                                </SidebarLinkItem>
                            </li>
                            {/* <!-- Menu Item Dashboard --> */}

                            {/* <!-- Menu Item DataTables --> */}
                            {pinned.length ? (
                                <SidebarLinkGroup
                                    activeCondition={pathname.includes(
                                        ADMIN_ROTES.DATA_TABLES
                                    )}
                                    menuItem={{
                                        label: 'DataTables',
                                        to: ADMIN_ROTES.DATA_TABLES,
                                        icon: <TablesSVG />,
                                        clickable: true,
                                    }}
                                    submenu={pinned.map((tableName) => ({
                                        label: tableName,
                                        to: getDataModelPath(tableName),
                                    }))}
                                />
                            ) : (
                                <li>
                                    <SidebarLinkItem
                                        to={ADMIN_ROTES.DATA_TABLES}
                                        icon={<TablesSVG />}
                                    >
                                        DataTables
                                    </SidebarLinkItem>
                                </li>
                            )}
                            {/* <!-- Menu Item DataTables --> */}

                            {/* <!-- Menu Item Calendar --> */}
                            {/*
                            <li>
                                <SidebarLinkItem
                                    to={ADMIN_ROTES.CALENDAR}
                                    icon={<CalendsrSVG />}
                                >
                                    Calendar
                                </SidebarLinkItem>
                            </li>
*/}
                            {/* <!-- Menu Item Calendar --> */}

                            {/* <!-- Menu Item Profile --> */}
                            {/*
                            <li>
                                <SidebarLinkItem
                                    to={ADMIN_ROTES.PROFILE}
                                    icon={<ProfileSVG />}
                                >
                                    Profile
                                </SidebarLinkItem>
                            </li>
*/}
                            {/* <!-- Menu Item Profile --> */}

                            {/* <!-- Menu Item Forms --> */}
                            {/*
                            <SidebarLinkGroup
                                activeCondition={pathname.includes('forms/')}
                                menuItem={{
                                    label: 'Forms',
                                    to: ADMIN_ROTES.FORMS,
                                    icon: <FormsSVG />,
                                }}
                                submenu={[
                                    {
                                        label: 'Form Elements',
                                        to: ADMIN_ROTES.FORMS_ELEMENTS,
                                    },
                                    {
                                        label: 'Form Layout',
                                        to: ADMIN_ROTES.FORMS_LAYOUT,
                                    },
                                ]}
                            />
*/}
                            {/* <!-- Menu Item Forms --> */}

                            {/* <!-- Menu Item Tables --> */}
                            {/*
                            <li>
                                <SidebarLinkItem
                                    to={ADMIN_ROTES.TABLES}
                                    icon={<TablesSVG />}
                                >
                                    Tables
                                </SidebarLinkItem>
                            </li>
*/}
                            {/* <!-- Menu Item Tables --> */}

                            {/* <!-- Menu Item Settings --> */}

                            <li>
                                <SidebarLinkItem
                                    to={ADMIN_ROTES.SETTINGS}
                                    icon={<SettingsSVG />}
                                >
                                    Settings
                                </SidebarLinkItem>
                            </li>

                            {/* <!-- Menu Item Settings --> */}
                        </ul>
                    </div>

                    {/* <!-- Others Group --> */}
                    {/*
                    <div>
                        <h3 className="mb-4 ml-4 text-sm font-semibold text-bodydark2">
                            OTHERS
                        </h3>

                        <ul className="mb-6 flex flex-col gap-1.5">
                             <!-- Menu Item Chart -->
                            <li>
                                <SidebarLinkItem
                                    to={ADMIN_ROTES.CHART}
                                    icon={<ChartsSVG />}
                                >
                                    Chart
                                </SidebarLinkItem>
                            </li>
                             <!-- Menu Item Chart -->

                             <!-- Menu Item Ui Elements -->
                            <SidebarLinkGroup
                                activeCondition={pathname.includes(
                                    '/' + ADMIN_ROTES.UI
                                )}
                                menuItem={{
                                    label: 'UI Elements',
                                    to: ADMIN_ROTES.UI,
                                    icon: <ElementsSVG />,
                                }}
                                submenu={[
                                    {
                                        label: 'Alerts',
                                        to: ADMIN_ROTES.UI_ALERTS,
                                    },
                                    {
                                        label: 'Buttons',
                                        to: ADMIN_ROTES.UI_BUTTONS,
                                    },
                                ]}
                            ></SidebarLinkGroup>
                             <!-- Menu Item Ui Elements -->
                        </ul>
                    </div>
*/}
                </nav>
                {/* <!-- Sidebar Menu --> */}
            </div>
        </aside>
    );
};

export default Sidebar;
