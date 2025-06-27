import { createContext } from 'react';

import type { AlertContextType } from '../types';

// context for sharing alert state between main component and subcomponents
export const AlertContext = createContext<AlertContextType | null>(null);
