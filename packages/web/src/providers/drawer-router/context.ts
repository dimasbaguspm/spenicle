import { createContext, useContext } from 'react';

import type { DrawerContextType } from './types';

const DrawerRouterContext = createContext<DrawerContextType | null>(null);

export const DrawerRouterContextProvider = DrawerRouterContext.Provider;

export const useDrawerRouterProvider = () => {
  const context = useContext(DrawerRouterContext);
  if (!context) {
    throw new Error('useDrawerRouterProvider must be used within a DrawerRouterContext');
  }
  return context;
};
