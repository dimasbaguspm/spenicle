import { useSnackContext, type SnackItem } from './snack-context';

export interface UseSnackReturn {
  /**
   * Add a new snack notification
   * @param snack - The snack configuration
   * @returns The ID of the created snack
   */
  addSnack: (snack: Omit<SnackItem, 'id'>) => string;
  /**
   * Remove a specific snack by ID
   * @param id - The ID of the snack to remove
   */
  removeSnack: (id: string) => void;
  /**
   * Remove all snacks
   */
  clearAll: () => void;
  /**
   * Show a success snack
   * @param message - The message to display
   * @param options - Additional snack options
   */
  success: (message: React.ReactNode, options?: Partial<Omit<SnackItem, 'id' | 'message' | 'variant'>>) => string;
  /**
   * Show an info snack
   * @param message - The message to display
   * @param options - Additional snack options
   */
  info: (message: React.ReactNode, options?: Partial<Omit<SnackItem, 'id' | 'message' | 'variant'>>) => string;
  /**
   * Show a warning snack
   * @param message - The message to display
   * @param options - Additional snack options
   */
  warning: (message: React.ReactNode, options?: Partial<Omit<SnackItem, 'id' | 'message' | 'variant'>>) => string;
  /**
   * Show a danger/error snack
   * @param message - The message to display
   * @param options - Additional snack options
   */
  danger: (message: React.ReactNode, options?: Partial<Omit<SnackItem, 'id' | 'message' | 'variant'>>) => string;
  /**
   * Show an error snack (alias for danger)
   * @param message - The message to display
   * @param options - Additional snack options
   */
  error: (message: React.ReactNode, options?: Partial<Omit<SnackItem, 'id' | 'message' | 'variant'>>) => string;
}

/**
 * Hook for managing snack notifications
 * @returns Object with methods to show and manage snacks
 */
export function useSnack(): UseSnackReturn {
  const { addSnack, removeSnack, clearAll } = useSnackContext();

  const success = (message: React.ReactNode, options?: Partial<Omit<SnackItem, 'id' | 'message' | 'variant'>>) =>
    addSnack({ message, variant: 'success', ...options });

  const info = (message: React.ReactNode, options?: Partial<Omit<SnackItem, 'id' | 'message' | 'variant'>>) =>
    addSnack({ message, variant: 'info', ...options });

  const warning = (message: React.ReactNode, options?: Partial<Omit<SnackItem, 'id' | 'message' | 'variant'>>) =>
    addSnack({ message, variant: 'warning', ...options });

  const danger = (message: React.ReactNode, options?: Partial<Omit<SnackItem, 'id' | 'message' | 'variant'>>) =>
    addSnack({ message, variant: 'danger', ...options });

  const error = (message: React.ReactNode, options?: Partial<Omit<SnackItem, 'id' | 'message' | 'variant'>>) =>
    addSnack({ message, variant: 'error', ...options });

  return {
    addSnack,
    removeSnack,
    clearAll,
    success,
    info,
    warning,
    danger,
    error,
  };
}
