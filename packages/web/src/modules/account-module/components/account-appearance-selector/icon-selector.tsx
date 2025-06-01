import { Palette } from 'lucide-react';

import { ACCOUNT_ICONS } from '../account-icon/constants';

interface IconSelectorProps {
  selectedIcon: string;
  onIconSelect: (iconValue: string) => void;
}

export const IconSelector = ({ selectedIcon, onIconSelect }: IconSelectorProps) => {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Palette className="h-4 w-4 text-slate-600" />
        <h3 className="text-sm font-medium text-slate-700">Choose Icon</h3>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {ACCOUNT_ICONS.map((iconOption) => {
          const OptionIconComponent = iconOption.icon;
          const isSelected = selectedIcon === iconOption.value;

          return (
            <button
              key={iconOption.value}
              type="button"
              className={`h-10 w-10 rounded-lg border-2 transition-all duration-200 flex items-center justify-center ${
                isSelected
                  ? 'border-coral-400 bg-coral-50 scale-105'
                  : 'border-slate-200 hover:border-slate-300 hover:scale-105'
              }`}
              onClick={() => onIconSelect(iconOption.value)}
              title={iconOption.label}
            >
              <OptionIconComponent className="h-4 w-4 text-slate-600" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
