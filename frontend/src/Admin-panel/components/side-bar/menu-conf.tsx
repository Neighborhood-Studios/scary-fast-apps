import { ReactElement } from 'react';

type MenuItem =
    | {
          label: string;
          path: string;
          children: Omit<MenuItem, 'children'>[];
          icon: ReactElement;
      }
    | { element: ReactElement };

export const menuConf: MenuItem[] = [];
