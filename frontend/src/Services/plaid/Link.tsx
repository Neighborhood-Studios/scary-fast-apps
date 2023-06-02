import type { FC } from 'react';
import type { PlaidLinkOptionsWithLinkToken } from 'react-plaid-link';
//
import { useCallback, useContext, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import Button from 'plaid-threads/Button';

import { PlaidContext } from './context';
import { exchangePublicTokenForAccessToken } from './utils.ts';

export const Link: FC = () => {
    const { linkToken, isPaymentInitiation, updateState } =
        useContext(PlaidContext);

    const onSuccess = useCallback(
        (public_token: string) => {
            // If the access_token is needed, send public_token to server

            // 'payment_initiation' products do not require the public_token to be exchanged for an access_token.
            if (isPaymentInitiation) {
                updateState({ isItemAccess: false });
            } else {
                exchangePublicTokenForAccessToken(public_token).then(
                    updateState
                );
            }

            updateState({ linkSuccess: true });
            window.history.pushState('', '', '/');
        },
        [updateState, isPaymentInitiation]
    );

    let isOauth = false;
    const config: PlaidLinkOptionsWithLinkToken = {
        token: linkToken,
        onSuccess,
    };

    if (window.location.href.includes('?oauth_state_id=')) {
        config.receivedRedirectUri = window.location.href;
        isOauth = true;
    }

    const { open, ready } = usePlaidLink(config);

    useEffect(() => {
        if (isOauth && ready) {
            open();
        }
    }, [ready, open, isOauth]);

    return (
        <Button type="button" large onClick={() => open()} disabled={!ready}>
            Launch Link
        </Button>
    );
};
