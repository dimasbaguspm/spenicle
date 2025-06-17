import { StrictMode, type FC, type PropsWithChildren } from 'react';

import { UpdateNotification } from '../components/update-notification';
import { TanstackQueryProvider } from '../providers/tanstack-query';

export const App: FC<PropsWithChildren> = ({ children }) => {
  return (
    <StrictMode>
      <TanstackQueryProvider>
        {children}
        <UpdateNotification />
      </TanstackQueryProvider>
    </StrictMode>
  );
};
