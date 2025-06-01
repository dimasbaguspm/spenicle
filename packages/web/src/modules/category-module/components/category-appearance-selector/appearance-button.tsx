import { ChevronDown } from 'lucide-react';

import { Button } from '../../../../components';
import { CategoryIcon } from '../category-icon';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../category-icon/constants';

interface AppearanceButtonProps {
  iconValue: string;
  colorValue: string;
  isOpen: boolean;
  onClick: () => void;
}

export const AppearanceButton = ({ iconValue, colorValue, isOpen, onClick }: AppearanceButtonProps) => {
  const selectedIcon = CATEGORY_ICONS.find((icon) => icon.value === iconValue);
  const selectedColor = CATEGORY_COLORS.find((color) => color.value === colorValue);

  return (
    <Button type="button" variant="outline" className="w-full justify-between h-12 px-4" onClick={onClick}>
      <div className="flex items-center gap-3">
        <CategoryIcon iconValue={iconValue} colorValue={colorValue} size="sm" />
        <div className="text-left">
          <div className="text-sm font-medium text-slate-700">
            {selectedIcon?.label} • {selectedColor?.label}
          </div>
          <div className="text-xs text-slate-500">Icon & Color</div>
        </div>
      </div>
      <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </Button>
  );
};
