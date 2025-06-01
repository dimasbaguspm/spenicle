import { Paintbrush } from 'lucide-react';

import { Segment, type SegmentOption } from '../../../../components';
import { CATEGORY_COLORS } from '../category-icon/constants';

interface ColorSelectorProps {
  selectedColor: string;
  colorVariant: 'fill' | 'outline';
  onColorSelect: (colorValue: string) => void;
  onVariantChange: (variant: 'fill' | 'outline') => void;
}

// Helper function to check if a color is an outline variant
const isOutlineColor = (colorValue: string): boolean => {
  return colorValue.includes('-outline');
};

export const ColorSelector = ({ selectedColor, colorVariant, onColorSelect, onVariantChange }: ColorSelectorProps) => {
  // Filter colors based on current variant
  const filteredColors = CATEGORY_COLORS.filter((color) => {
    const isOutline = isOutlineColor(color.value);
    return colorVariant === 'outline' ? isOutline : !isOutline;
  });

  // Variant options for the segment
  const variantOptions: SegmentOption[] = [
    { value: 'fill', label: 'Filled' },
    { value: 'outline', label: 'Outline' },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Paintbrush className="h-4 w-4 text-slate-600" />
        <h3 className="text-sm font-medium text-slate-700">Choose Color</h3>
      </div>

      {/* Variant Toggle */}
      <div className="mb-6">
        <Segment
          options={variantOptions}
          value={colorVariant}
          onValueChange={(value) => onVariantChange(value as 'fill' | 'outline')}
          variant="coral"
          size="md"
          showLabel={false}
          className="w-full"
        />
      </div>

      {/* Color Grid */}
      <div className="grid grid-cols-4 gap-2">
        {filteredColors.map((colorOption) => {
          const isSelected = selectedColor === colorOption.value;
          const colorClasses = colorOption.color;

          // Use lighter borders for filled variants, following color palette guidelines
          const borderClass = colorVariant === 'fill' ? 'border border-slate-200' : ''; // Outline variants already have borders in colorClasses

          return (
            <button
              key={colorOption.value}
              type="button"
              className={`h-10 w-10 rounded-lg transition-all duration-200 flex items-center justify-center ${borderClass} ${colorClasses} ${
                isSelected ? 'ring-2 ring-offset-2 ' + colorOption.ring + ' scale-105' : 'hover:scale-105'
              }`}
              onClick={() => onColorSelect(colorOption.value)}
              title={colorOption.label}
            />
          );
        })}
      </div>
    </div>
  );
};
