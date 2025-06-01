import { StrictMode, type FC, type PropsWithChildren } from 'react';

import { TanstackQueryProvider } from '../providers/tanstack-query';

export const App: FC<PropsWithChildren> = ({ children }) => {
  return (
    <StrictMode>
      <TanstackQueryProvider>{children}</TanstackQueryProvider>
    </StrictMode>
  );
};
