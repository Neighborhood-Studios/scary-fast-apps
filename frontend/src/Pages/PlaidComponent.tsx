import type { FC } from "react";
import Plaid from 'Services/plaid'

type PlaidComponentProps = object;
export const PlaidComponent: FC<PlaidComponentProps> = () => {
  return <Plaid />;
};