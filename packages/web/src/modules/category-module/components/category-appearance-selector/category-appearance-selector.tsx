import { useState } from 'react';
import { Controller, type Control, type FieldErrors, type FieldPath, type FieldValues } from 'react-hook-form';

import { Modal, Button } from '../../../../components';
import { CATEGORY_COLORS } from '../category-icon/constants';

import { AppearanceButton } from './appearance-button';
import { AppearancePreview } from './appearance-preview';
import { ColorSelector } from './color-selector';
import { IconSelector } from './icon-selector';

export interface CategoryAppearanceSelectorProps<T extends FieldValues> {
  control: Control<T>;
  errors?: FieldErrors<T>;
  iconName?: string;
  colorName?: string;
  label?: string;
  helperText?: string;
}

export const CategoryAppearanceSelector = <T extends FieldValues>({
  control,
  iconName = 'metadata.icon',
  colorName = 'metadata.color',
  label = 'Category Appearance',
  helperText = 'Choose an icon and color for your category',
}: CategoryAppearanceSelectorProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempIcon, setTempIcon] = useState<string | null>(null);
  const [tempColor, setTempColor] = useState<string | null>(null);
  const [colorVariant, setColorVariant] = useState<'fill' | 'outline'>('fill');

  // Helper function to check if a color is an outline variant
  const isOutlineColor = (colorValue: string): boolean => {
    return colorValue.includes('-outline');
  };

  // Handle variant change and update temp color to equivalent
  const handleVariantChange = (variant: 'fill' | 'outline') => {
    setColorVariant(variant);

    if (!tempColor) return;

    const baseColorName = tempColor.replace('-outline', '');
    let equivalentColor: string;

    if (variant === 'outline') {
      // Convert to outline variant
      equivalentColor = baseColorName === 'slate' ? 'slate-outline' : `${baseColorName}-outline`;
    } else {
      // Convert to fill variant
      equivalentColor = baseColorName;
    }

    // Only update if the equivalent color exists
    const colorExists = CATEGORY_COLORS.some((color) => color.value === equivalentColor);
    if (colorExists) {
      setTempColor(equivalentColor);
    }
  };

  // Reset temp state when modal opens/closes
  const handleModalToggle = (open: boolean, currentColor?: string) => {
    setIsOpen(open);
    if (!open) {
      setTempIcon(null);
      setTempColor(null);
      setColorVariant('fill'); // Reset to default variant
    } else if (currentColor) {
      // Set the variant based on the current color when opening
      setColorVariant(isOutlineColor(currentColor) ? 'outline' : 'fill');
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">{label}</label>
        {helperText && <p className="text-xs text-slate-500 mb-3">{helperText}</p>}

        <Controller
          name={iconName as FieldPath<T>}
          control={control}
          defaultValue={'tag' as T[FieldPath<T>]}
          render={({ field: iconField }) => (
            <Controller
              name={colorName as FieldPath<T>}
              control={control}
              defaultValue={'coral' as T[FieldPath<T>]}
              render={({ field: colorField }) => {
                return (
                  <>
                    <AppearanceButton
                      iconValue={iconField.value}
                      colorValue={colorField.value}
                      isOpen={isOpen}
                      onClick={() => {
                        // Initialize temp state with current values when opening modal
                        if (!isOpen) {
                          setTempIcon(iconField.value);
                          setTempColor(colorField.value);
                        }
                        handleModalToggle(!isOpen, colorField.value);
                      }}
                    />

                    {isOpen && (
                      <Modal onClose={() => handleModalToggle(false)} size="md">
                        <Modal.Header>
                          <Modal.Title>Customize Appearance</Modal.Title>
                          <Modal.CloseButton />
                        </Modal.Header>
                        <Modal.Content>
                          <div className="space-y-6">
                            {/* Icon Selector */}
                            <IconSelector selectedIcon={tempIcon ?? iconField.value} onIconSelect={setTempIcon} />

                            {/* Color Selector */}
                            <ColorSelector
                              selectedColor={tempColor ?? colorField.value}
                              colorVariant={colorVariant}
                              onColorSelect={setTempColor}
                              onVariantChange={handleVariantChange}
                            />

                            {/* Preview */}
                            <AppearancePreview
                              iconValue={tempIcon ?? iconField.value}
                              colorValue={tempColor ?? colorField.value}
                            />
                          </div>
                        </Modal.Content>
                        <Modal.Footer>
                          <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => handleModalToggle(false)}>
                              Cancel
                            </Button>
                            <Button
                              variant="coral"
                              onClick={() => {
                                // Apply changes to form fields
                                if (tempIcon !== null) {
                                  iconField.onChange(tempIcon);
                                }
                                if (tempColor !== null) {
                                  colorField.onChange(tempColor);
                                }
                                handleModalToggle(false);
                              }}
                            >
                              Apply Changes
                            </Button>
                          </div>
                        </Modal.Footer>
                      </Modal>
                    )}
                  </>
                );
              }}
            />
          )}
        />
      </div>
    </div>
  );
};
