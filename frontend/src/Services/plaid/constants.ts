import { plaidBeURL } from 'app-constants.ts';

const PLAID_BE_URL = plaidBeURL;

export enum ENDPOINTS {
    info = `/info`,
    linkToken = `/create_link_token`,
    linkTokenForPayment = `/create_link_token_for_payment`,
    setAccessToken = `/set_access_token`,
    itemInfo = '/item',
}

export const getEndpointUrl = (endpoint: ENDPOINTS) => PLAID_BE_URL + endpoint;
