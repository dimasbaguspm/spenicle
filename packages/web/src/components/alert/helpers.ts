// utility function to get icon color based on alert variant
export const getAlertIconColor = (variant?: string | null): string => {
  if (!variant) return 'text-mist-600';

  switch (variant) {
    case 'coral':
      return 'text-coral-600';
    case 'sage':
      return 'text-sage-600';
    case 'mist':
      return 'text-mist-600';
    case 'slate':
      return 'text-slate-600';
    case 'success':
      return 'text-success-600';
    case 'info':
      return 'text-info-600';
    case 'warning':
      return 'text-warning-600';
    case 'danger':
      return 'text-danger-600';
    // outline variants use same colors as filled variants
    case 'coral-outline':
      return 'text-coral-600';
    case 'sage-outline':
      return 'text-sage-600';
    case 'mist-outline':
      return 'text-mist-600';
    case 'slate-outline':
      return 'text-slate-600';
    case 'success-outline':
      return 'text-success-600';
    case 'info-outline':
      return 'text-info-600';
    case 'warning-outline':
      return 'text-warning-600';
    case 'danger-outline':
      return 'text-danger-600';
    default:
      return 'text-mist-600';
  }
};
