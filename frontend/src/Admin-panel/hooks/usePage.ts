import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useCallback, useLayoutEffect, useRef } from 'react';

export function usePage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { state } = useLocation();
    const stateRef = useRef(state);
    stateRef.current = state;

    const navigate = useNavigate();
    const navigateRef = useRef(navigate);
    navigateRef.current = navigate;

    const setPage = useCallback(
        (page: number) => {
            navigateRef.current('', {
                state: Object.assign({}, stateRef.current, { page }),
            });
        },
        [navigateRef, stateRef]
    );

    const pageFromParams = Number(searchParams.get('page'));
    const pageFromState = state?.page;

    useLayoutEffect(() => {
        if (pageFromParams) {
            searchParams.delete('page');
            setSearchParams(searchParams, {
                replace: true,
                state: Object.assign({}, state, { page: pageFromParams }),
            });
        }
    }, [pageFromParams, state, setSearchParams, searchParams]);

    const page = pageFromParams || pageFromState || 1;
    return [page, setPage];
}
