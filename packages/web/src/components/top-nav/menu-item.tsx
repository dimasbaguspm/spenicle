import { cn } from '../../libs/utils';

export interface MenuItemProps {
  label: string;
  href: string;
  active?: boolean;
}

export const MenuItem = ({ label, href, active }: MenuItemProps) => {
  return (
    <a
      href={href}
      className={cn(
        'px-3 py-2 text-sm font-medium rounded transition-colors',
        active ? 'text-gray-900 bg-gray-100' : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
      )}
    >
      {label}
    </a>
  );
};
