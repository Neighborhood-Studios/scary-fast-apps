import { useSearchParams } from 'react-router-dom';
import { useCallback, useLayoutEffect } from 'react';
import { useLocationState } from './useLocationState.ts';

export function usePage(key = '') {
    const [searchParams, setSearchParams] = useSearchParams();

    const [locationState, , updateLocationState] = useLocationState<{
        page: number;
    }>(key);

    const setPage = useCallback(
        (page: number) => {
            updateLocationState({ page });
        },
        [updateLocationState]
    );

    const pageFromParams = Number(searchParams.get('page'));
    const pageFromState = locationState?.page;

    useLayoutEffect(() => {
        if (pageFromParams) {
            searchParams.delete('page');
            setSearchParams(searchParams, {
                replace: true,
            });
            updateLocationState({ page: pageFromParams });
        }
    }, [pageFromParams, setSearchParams, searchParams, updateLocationState]);

    const page = pageFromParams || pageFromState || 1;
    return [page, setPage] as const;
}
