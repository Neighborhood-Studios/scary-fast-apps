import { useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useRef } from 'react';

export function useLocationState<T extends object>(key?: string) {
    const location = useLocation();
    const state = (location.state ?? {}) as T;
    const stateRef = useRef(state);
    stateRef.current = state;

    const navigate = useNavigate();
    const navigateRef = useRef(navigate);
    navigateRef.current = navigate;

    const setState = useCallback(
        (newState: T | ((currentState: T) => T)) => {
            let state;
            if (newState instanceof Function) {
                state = newState(stateRef.current);
            } else {
                state = newState;
            }
            state = key ? { ...state, key } : state;
            navigateRef.current('', { state, replace: true });
        },
        [stateRef, navigateRef, key]
    );
    const updateState = useCallback(
        (state: Partial<T>) => {
            const updatedState = Object.assign({}, stateRef.current, state);
            navigateRef.current('', {
                state: key ? { ...updatedState, key } : updatedState,
                replace: true,
            });
        },
        [stateRef, navigateRef, key]
    );
    return [state, setState, updateState] as const;
}
