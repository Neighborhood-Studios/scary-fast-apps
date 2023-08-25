import { ReactElement, useState } from 'react';
import { SidebarLinkItem } from './SidebarLinkItem.tsx';
import { DropdownSVGSVG } from '../../images/icon';
import { NavLink } from 'react-router-dom';

interface SidebarLinkGroupProps {
    activeCondition: boolean;
    menuItem: {
        label: string;
        to: string;
        icon: ReactElement;
        end?: boolean;
        clickable?: boolean;
    };
    submenu: {
        to: string;
        label: string;
    }[];
}

const SidebarLinkGroup = ({
    activeCondition,
    menuItem,
    submenu,
}: SidebarLinkGroupProps) => {
    const [open, setOpen] = useState<boolean>(activeCondition);

    const handleClick = () => {
        setOpen(!open);
    };
    const { label, clickable, ...menuItemProps } = menuItem;

    return (
        <li>
            <SidebarLinkItem
                {...menuItemProps}
                onClick={(e) => {
                    if (!clickable) e.preventDefault();
                    handleClick();
                }}
            >
                {label}
                <DropdownSVGSVG
                    className={`absolute right-4 top-1/2 -translate-y-1/2 fill-current ${
                        open && 'rotate-180'
                    }`}
                />
            </SidebarLinkItem>
            <div
                className={`translate transform overflow-hidden ${
                    !open && 'hidden'
                }`}
            >
                <ul className="mt-4 mb-5.5 flex flex-col gap-2.5 pl-6">
                    {submenu.map((subItem) => (
                        <li key={subItem.label}>
                            <NavLink
                                to={subItem.to}
                                className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md px-4 font-medium text-bodydark2 duration-300 ease-in-out hover:text-white ' +
                                    (isActive && '!text-white')
                                }
                            >
                                {subItem.label}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </div>
        </li>
    );
};

export default SidebarLinkGroup;
