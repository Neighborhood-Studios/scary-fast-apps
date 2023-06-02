import { ENDPOINTS, getEndpointUrl } from './constants.ts';

export function getInfo() {
  return fetch(getEndpointUrl(ENDPOINTS.info), { method: 'POST' })
    .then((response) => (response.ok ? response.json() : Promise.reject()))
    .then(
      (data) => ({
        products: data.products,
        isPaymentInitiation: data.products.includes('payment_initiation'),
      }),
      () => ({
        isPaymentInitiation: false,
      })
    );
}

export function generateToken(isPaymentInitiation: boolean) {
  // Link tokens for 'payment_initiation' use a different creation flow in your backend.
  const path = isPaymentInitiation
    ? ENDPOINTS.linkTokenForPayment
    : ENDPOINTS.linkToken;

  return fetch(getEndpointUrl(path), {
    method: 'POST',
  })
    .then((response) => (response.ok ? response.json() : Promise.reject()))
    .then((data) => {
      // Save the link_token to be used later in the Oauth flow.
      localStorage.setItem('link_token', data.link_token);
      return {
        linkToken: data.link_token ?? null,
        linkTokenError: data.error ?? null,
      };
    });
}

export function exchangePublicTokenForAccessToken(publicToken: string) {
  return fetch(getEndpointUrl(ENDPOINTS.setAccessToken), {
    method: 'POST',
    body: JSON.stringify({ public_token: publicToken }),
  })
    .then((response) => (response.ok ? response.json() : Promise.reject()))
    .then(
      (data) => ({
        itemId: data.item_id,
        accessToken: data.access_token,
        isItemAccess: true,
      }),
      () => ({
        itemId: `no item_id retrieved`,
        accessToken: `no access_token retrieved`,
        isItemAccess: false,
      })
    );
}

export function getItemInfo() {
  return fetch(getEndpointUrl(ENDPOINTS.itemInfo), { method: 'GET' }).then(
    (response) => (response.ok ? response.json() : Promise.reject())
  );
}
