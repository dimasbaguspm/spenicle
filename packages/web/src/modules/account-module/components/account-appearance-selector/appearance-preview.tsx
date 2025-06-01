import { AccountIcon } from '../account-icon';
import { ACCOUNT_COLORS, ACCOUNT_ICONS } from '../account-icon/constants';

interface AppearancePreviewProps {
  iconValue: string;
  colorValue: string;
}

export const AppearancePreview = ({ iconValue, colorValue }: AppearancePreviewProps) => {
  const previewIcon = ACCOUNT_ICONS.find((icon) => icon.value === iconValue);
  const previewColor = ACCOUNT_COLORS.find((color) => color.value === colorValue);

  return (
    <div className="border-t border-slate-200 pt-4">
      <h3 className="text-sm font-medium text-slate-700 mb-3">Preview</h3>
      <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
        <AccountIcon iconValue={iconValue} colorValue={colorValue} size="md" className="shadow-md" />
        <div>
          <div className="text-sm font-medium text-slate-700">Account Name</div>
          <div className="text-xs text-slate-500">
            {previewIcon?.label} • {previewColor?.label}
          </div>
        </div>
      </div>
    </div>
  );
};
