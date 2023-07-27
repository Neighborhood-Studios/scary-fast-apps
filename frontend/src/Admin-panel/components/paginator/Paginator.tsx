// import type { Primitive } from 'common_types';

import React, { MouseEventHandler, PropsWithChildren, useMemo } from 'react';
import { Link, Path } from 'react-router-dom';

import { ReactComponent as ArDown } from '../../images/icon/icon-arrow-down.svg';
// import { toQuerySearchString } from 'Helpers/utils';

import {
    ActivePage,
    PaginationControl,
    PaginationItem,
    PaginationWrapper,
} from './elements';

const VISIBLE_PAGES = 3;

type Props = {
    count: number;
    limit: number;
    currentPage: number;
    goToPage(page: number): void;
};

const Paginator: React.FC<Props> = ({
    count,
    limit,
    goToPage,
    currentPage,
}) => {
    // const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.ceil(count / limit);

    const toPage = (page: number) => ({
        // ...location,
        search: toQuerySearchString({ page: page }),
    });

    const pages = useMemo(
        () =>
            totalPages &&
            Array.from(
                new Array(Math.min(2 + VISIBLE_PAGES + 2, totalPages))
            ).map(calculatePage(totalPages, currentPage)),

        [totalPages, currentPage]
    );
    if (isNaN(count) || isNaN(currentPage) || isNaN(limit) || totalPages <= 1) {
        return null;
    }

    const onClick =
        (page: number): MouseEventHandler =>
        (e) => {
            e.preventDefault();
            goToPage(page);
        };
    return (
        <PaginationWrapper>
            <PageItem
                to={toPage(currentPage - 1)}
                isActive={currentPage > 1}
                onClick={onClick(currentPage - 1)}
                className={'h-fit'}
            >
                <PaginationControl>
                    <ArDown style={{ transform: 'rotate(90deg)' }} />
                </PaginationControl>
            </PageItem>

            {pages &&
                pages.map((page) => (
                    <PageItem
                        isActive={page !== currentPage}
                        to={typeof page === 'number' ? toPage(page) : undefined}
                        key={page}
                        onClick={onClick(+page)}
                    >
                        {page === currentPage ? (
                            <ActivePage>{page}</ActivePage>
                        ) : (
                            <PaginationItem>
                                {+page ? page : '...'}
                            </PaginationItem>
                        )}
                    </PageItem>
                ))}

            <PageItem
                to={toPage(currentPage + 1)}
                isActive={currentPage < totalPages}
                onClick={onClick(currentPage + 1)}
                className={'h-fit'}
            >
                <PaginationControl>
                    <ArDown style={{ transform: 'rotate(-90deg)' }} />
                </PaginationControl>
            </PageItem>
        </PaginationWrapper>
    );
};

export { Paginator };

const PageItem: React.FC<
    PropsWithChildren<{
        onClick?: MouseEventHandler;
        isActive?: boolean;
        to?: Partial<Path>;
        className?: string;
    }>
> = ({ onClick, to, isActive, className, children }) => {
    return (
        <>
            {isActive && to ? (
                <Link to={to} onClick={onClick} className={className}>
                    {children}
                </Link>
            ) : (
                children
            )}
        </>
    );
};

const calculatePage =
    (totalPages: number, currentPage: number) =>
    (_: number, idx: number, list: number[]) => {
        const page =
            idx > list.length / 2
                ? totalPages - (list.length - (idx + 1))
                : idx + 1;

        if (list.length === totalPages) {
            return page;
        }
        if (idx === 0 || idx === list.length - 1) {
            return page;
        }
        if (idx === 1 || idx === list.length - 2) {
            return page < currentPage - 2 || page > currentPage + 2
                ? idx < list.length / 2
                    ? 'left_spacer'
                    : 'right_spacer'
                : page;
        }

        if (currentPage < VISIBLE_PAGES + 2) {
            return idx + 1;
        }
        if (currentPage > totalPages - VISIBLE_PAGES) {
            return totalPages - (list.length - (idx + 1));
        }

        return (
            currentPage +
            Math.floor(VISIBLE_PAGES / 2) -
            VISIBLE_PAGES +
            idx -
            1
        );
    };

function toQuerySearchString(params?: object) {
    return Object.entries(params ?? {})
        .reduce<[key: string, value: string][]>((queryPairs, [key, value]) => {
            const queryValuePair: [key: string, value: string][] = []
                .concat(value)
                .filter((value) => value !== undefined)
                .map(String)
                .map((val) => [key, String(val)]);
            return queryPairs.concat(queryValuePair);
        }, [])
        .map(([key, value]) => `${key}=${encodeURI(value)}`)
        .join('&');
}
