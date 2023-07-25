import type { FC, ReactElement, RefObject } from 'react';

import { useEffect, useRef, useState } from 'react';

type DropdownProps = {
    triggerEl: ReactElement;
    popup?: ReactElement;
    popupClass?: string;
    onStateChange?(state: boolean): void;
    dropDownRef?: RefObject<HTMLDivElement>;
};
export const Dropdown: FC<DropdownProps> = ({
    triggerEl,
    popup,
    popupClass,
    onStateChange,
    dropDownRef,
}) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const triggerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(dropDownRef?.current ?? null);

    // close on click outside
    useEffect(() => {
        const clickHandler = ({ target }: MouseEvent) => {
            if (!dropdownRef.current) return;
            if (
                !dropdownOpen ||
                dropdownRef.current.contains(target as HTMLElement) ||
                triggerRef.current?.contains(target as HTMLElement)
            )
                return;
            setDropdownOpen(false);
        };
        document.addEventListener('click', clickHandler);
        return () => document.removeEventListener('click', clickHandler);
    });

    // close if the esc key is pressed
    useEffect(() => {
        const keyHandler = ({ key }: KeyboardEvent) => {
            if (!dropdownOpen || key !== 'Escape') return;
            setDropdownOpen(false);
        };
        document.addEventListener('keydown', keyHandler);
        return () => document.removeEventListener('keydown', keyHandler);
    });

    useEffect(() => {
        onStateChange?.(dropdownOpen);
    }, [dropdownOpen, onStateChange]);

    const toggleDropOpen = () => setDropdownOpen((open) => !open);
    return (
        <div className="relative inline-block">
            <div
                ref={triggerRef}
                className="cursor-pointer"
                onClick={toggleDropOpen}
            >
                {triggerEl}
            </div>
            {popup && (
                <div
                    ref={dropdownRef}
                    className={`absolute mt-2.5 p-3 rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark
                    leading-normal
                    ${popupClass == null ? '' : popupClass}
                 ${dropdownOpen ? 'block' : 'hidden'}`}
                >
                    {popup}
                </div>
            )}
        </div>
    );
};
