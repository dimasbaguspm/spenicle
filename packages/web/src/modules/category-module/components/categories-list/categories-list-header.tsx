import { Search } from 'lucide-react';

import { TextInput } from '../../../../components';

export interface CategoriesListHeaderProps {
  categoryCount?: number;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
}

export function CategoriesListHeader({
  categoryCount = 0,
  searchValue = '',
  onSearchChange,
}: CategoriesListHeaderProps) {
  if (categoryCount < 0) return null;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange?.(e.target.value);
  };

  return (
    <div className="p-6 border-b border-mist-100">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <Search className="w-5 h-5 text-slate-400" />
        </div>
        <TextInput
          value={searchValue}
          onChange={handleSearchChange}
          placeholder="Search categories by name or notes..."
          size="md"
          className="w-full sm:max-w-xl text-base py-3 text-slate-700 placeholder-slate-400"
        />
      </div>
    </div>
  );
}
