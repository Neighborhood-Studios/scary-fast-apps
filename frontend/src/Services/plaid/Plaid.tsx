import type { FC } from 'react';
import { useContext, useEffect, useState } from 'react';

import { getInfo, generateToken, getItemInfo } from './utils.ts';
import { PlaidContext } from './context.tsx';
import { Link } from './Link.tsx';

type PlaidProps = object;
export const Plaid: FC<PlaidProps> = () => {
  const { updateState, ...plaidContext } = useContext(PlaidContext);

  const [itemInfo, setItemInfo] = useState<{
    institution: { name: string };
  } | null>(null);

  useEffect(() => {
    const init = async () => {
      const info = await getInfo(); // used to determine which path to take when generating token
      updateState(info);
      // do not generate a new token for OAuth redirect; instead
      // setLinkToken from localStorage
      if (window.location.href.includes('?oauth_state_id=')) {
        updateState({
          linkToken: localStorage.getItem('link_token'),
        });
        return;
      }
      return generateToken(info.isPaymentInitiation);
    };
    init().then(updateState);
  }, [updateState]);

  useEffect(() => {
    if (plaidContext.itemId) {
      getItemInfo().then(setItemInfo);
    }
  }, [plaidContext.itemId]);

  return (
    <div>
      <h3>Plaid</h3>
      <pre>
        <h6>local plaid context</h6>
        {JSON.stringify(plaidContext, null, '  ')}
        {itemInfo && (
          <>
            <h4>Current linked institution "{itemInfo.institution.name}"</h4>
            <h6>Institution Info</h6>
            {JSON.stringify(itemInfo.institution, null, ' ')}
          </>
        )}
      </pre>
      <div>
        <Link />
      </div>
    </div>
  );
};
