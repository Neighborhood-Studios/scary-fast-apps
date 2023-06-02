import type { Dispatch, FC, PropsWithChildren } from 'react';
import { createContext, useReducer } from 'react';

interface QuickstartState {
  linkSuccess: boolean;
  isItemAccess: boolean;
  isPaymentInitiation: boolean;
  linkToken: string | null;
  accessToken: string | null;
  itemId: string | null;
  isError: boolean;
  backend: boolean;
  products: string[];
  linkTokenError: {
    error_message: string;
    error_code: string;
    error_type: string;
  };
}

const initialState: QuickstartState = {
  linkSuccess: false,
  isItemAccess: true,
  isPaymentInitiation: false,
  linkToken: '', // Don't set to null or error message will show up briefly when site loads
  accessToken: null,
  itemId: null,
  isError: false,
  backend: true,
  products: ['transactions'],
  linkTokenError: {
    error_type: '',
    error_code: '',
    error_message: '',
  },
};

interface QuickstartContext extends QuickstartState {
  updateState: Dispatch<Partial<QuickstartState>|undefined>;
}

export const PlaidContext = createContext<QuickstartContext>({
  ...initialState,
  updateState: () => initialState,
});

export const PlaidContextProvider: FC<PropsWithChildren> = ({children}) => {
  const [state, updateState] = useReducer(reducer, initialState);
  return <PlaidContext.Provider value={{ ...state, updateState }}>{children}</PlaidContext.Provider>;
};


const reducer = (
  state: QuickstartState,
  update: Partial<QuickstartState>|undefined
): QuickstartState =>update ? Object.assign({}, state, update) : state;
