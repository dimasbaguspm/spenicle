import { Check } from 'lucide-react';
import React, { useState, useMemo, useRef, useEffect } from 'react';

import { Button } from '../../../../components/button/button';
import { Modal } from '../../../../components/modal';
import { useViewport } from '../../../../hooks';
import { cn } from '../../../../libs/utils';
import type { Category } from '../../../../types/api';
import { CategoryIcon } from '../category-icon';

interface CategorySelectorMultiModalProps {
  isOpen: boolean;
  categories: Category[];
  value: Category[] | undefined; // changed from Category | null to Category[]
  onClear: () => void;
  onClose: () => void;
  onSubmit: (selected: Category[]) => void;
}

export const CategorySelectorMultiModal: React.FC<CategorySelectorMultiModalProps> = ({
  isOpen,
  categories,
  value,
  onClear,
  onClose,
  onSubmit,
}) => {
  const { isDesktop } = useViewport();
  const [search, setSearch] = useState('');
  // helper to extract selected ids from value
  function getSelectedIdsFromValue(val: Category[] = []): number[] {
    return val.filter((v) => typeof v.id === 'number').map((v) => v.id as number);
  }

  const [selectedIds, setSelectedIds] = useState<number[]>(getSelectedIdsFromValue(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setSelectedIds(getSelectedIdsFromValue(value));
    } else {
      setSearch('');
    }
  }, [isOpen]); // remove value from deps

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter((cat) => (cat.name ?? '').toLowerCase().includes(term));
  }, [categories, search]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  // update selection for multi-select, only allow number id
  const handleCategoryClick = (category: Category) => {
    if (typeof category.id !== 'number') return;
    setSelectedIds((prev) => {
      const arr = prev.filter((id): id is number => typeof id === 'number' && Number.isFinite(id));
      if (arr.includes(category.id!)) {
        return arr.filter((id) => id !== category.id!);
      } else {
        return [...arr, category.id!];
      }
    });
  };

  if (!isOpen) return null;

  const size = isDesktop ? 'lg' : 'sm';

  return (
    <Modal onClose={onClose} size={size} closeOnOverlayClick closeOnEscape>
      <Modal.Header>
        <Modal.Title>Select Category</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>
      <div className="p-3 border-b border-mist-100 bg-cream-50">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories..."
          className="w-full rounded-md border border-mist-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-coral-400 outline-none transition"
          aria-label="Search categories"
          aria-autocomplete="list"
          aria-controls="category-listbox"
        />
      </div>
      <div
        ref={listRef}
        id="category-listbox"
        role="listbox"
        className="bg-white max-h-80 overflow-y-auto divide-y divide-mist-100"
      >
        {filteredCategories.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No categories found</div>
        ) : (
          filteredCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              role="option"
              aria-selected={typeof category.id === 'number' && selectedIds.includes(category.id)}
              className={cn(
                'w-full flex items-center gap-3 text-left px-4 py-3 transition-colors',
                typeof category.id === 'number' && selectedIds.includes(category.id) && 'bg-mist-100 font-semibold',
                'hover:bg-mist-50 active:bg-mist-200 focus:bg-mist-100 focus:outline-none'
              )}
              onClick={() => handleCategoryClick(category)}
            >
              <CategoryIcon iconValue={category.metadata?.icon} colorValue={category.metadata?.color} size={size} />
              <span className="truncate">{category.name}</span>
              {typeof category.id === 'number' && selectedIds.includes(category.id) ? (
                <span className="ml-auto text-coral-600 font-bold flex items-center">
                  <Check className="w-5 h-5" aria-label="Selected" />
                </span>
              ) : null}
            </button>
          ))
        )}
      </div>
      <div className="flex justify-between items-center p-3 border-t border-mist-100 bg-cream-50">
        {/* Info left: filtered/total count and selected count with consistent gap and icon */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {filteredCategories.length} of {categories.length} categories
          </span>
          {selectedIds.length > 0 && (
            <span className="flex items-center gap-1 text-xs font-semibold text-coral-600">
              <Check className="w-4 h-4" aria-label="Selected count" />
              {selectedIds.length} selected
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-danger-500 focus:text-danger-500 focus:outline-none"
            onClick={() => {
              setSelectedIds([]);
              onClear();
            }}
          >
            Clear
          </Button>
          <Button
            type="button"
            variant="coral"
            size="sm"
            className="ml-2"
            onClick={() => {
              // only submit categories with number id in selectedIds
              const selected = categories.filter((cat) => typeof cat.id === 'number' && selectedIds.includes(cat.id));
              onSubmit(selected);
            }}
          >
            Submit
          </Button>
        </div>
      </div>
    </Modal>
  );
};
