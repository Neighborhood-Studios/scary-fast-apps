import type {
    FC,
    ReactElement,
    MouseEventHandler,
    PropsWithChildren,
} from 'react';
import { NavLink } from 'react-router-dom';

type SidebarLinkItemProps = {
    to: string;
    icon: ReactElement;
    end?: boolean;
    onClick?: MouseEventHandler;
};
export const SidebarLinkItem: FC<PropsWithChildren<SidebarLinkItemProps>> = ({
    to,
    icon,
    onClick,
    end = false,
    children,
}) => {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `group relative flex items-center gap-2.5 rounded-sm py-2 px-4 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4 ${
                    isActive && 'bg-graydark dark:bg-meta-4'
                }`
            }
            end={end}
            onClick={onClick}
        >
            {icon}
            {children}
        </NavLink>
    );
};
