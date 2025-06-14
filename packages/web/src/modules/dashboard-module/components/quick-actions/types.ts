import type { LucideIcon } from 'lucide-react';

export interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => Promise<void> | void;
  iconColor?: string;
  iconBgColor?: string;
  disabled?: boolean;
}

export interface QuickActionsProps {
  actions: QuickAction[];
  title?: string;
  subtitle?: string;
}
