import type { FC } from 'react';

import { Outlet } from 'react-router-dom';

type AppProps = object;
export const App: FC<AppProps> = () => {
  return (
    <main>
      <div>App</div>
      <Outlet />
    </main>
  );
};
