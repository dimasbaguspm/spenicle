import { CategoryIcon } from '../category-icon';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '../category-icon/constants';

interface AppearancePreviewProps {
  iconValue: string;
  colorValue: string;
}

export const AppearancePreview = ({ iconValue, colorValue }: AppearancePreviewProps) => {
  const previewIcon = CATEGORY_ICONS.find((icon) => icon.value === iconValue);
  const previewColor = CATEGORY_COLORS.find((color) => color.value === colorValue);

  return (
    <div className="border-t border-slate-200 pt-4">
      <h3 className="text-sm font-medium text-slate-700 mb-3">Preview</h3>
      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
        <CategoryIcon iconValue={iconValue} colorValue={colorValue} size="md" className="shadow-md" />
        <div>
          <div className="text-sm font-medium text-slate-700">Category Name</div>
          <div className="text-xs text-slate-500">
            {previewIcon?.label} • {previewColor?.label}
          </div>
        </div>
      </div>
    </div>
  );
};
