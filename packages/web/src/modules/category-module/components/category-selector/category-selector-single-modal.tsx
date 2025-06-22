import { Check } from 'lucide-react';
import React, { useState, useMemo, useRef, useEffect } from 'react';

import { Button } from '../../../../components/button/button';
import { Modal } from '../../../../components/modal';
import { useViewport } from '../../../../hooks';
import { cn } from '../../../../libs/utils';
import type { Category } from '../../../../types/api';
import { CategoryIcon } from '../category-icon';

interface CategorySelectorSingleModalProps {
  isOpen: boolean;
  categories: Category[];
  value: Category | undefined;
  onClear: () => void;
  onClose: () => void;
  onSubmit: (selected: Category) => void;
}

export const CategorySelectorSingleModal: React.FC<CategorySelectorSingleModalProps> = ({
  isOpen,
  categories,
  value,
  onClear,
  onClose,
  onSubmit,
}) => {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | undefined>(
    typeof value?.id === 'number' ? value.id : undefined
  );
  const { isDesktop } = useViewport();

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setSelectedId(typeof value?.id === 'number' ? value.id : undefined);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter((cat) => (cat.name ?? '').toLowerCase().includes(term));
  }, [categories, search]);

  const handleCategoryClick = (category: Category) => {
    if (typeof category.id !== 'number') return;
    setSelectedId((prev) => (prev === category.id ? undefined : category.id));
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
              aria-selected={typeof category.id === 'number' && selectedId === category.id}
              className={cn(
                'w-full flex items-center gap-3 text-left px-4 py-3 transition-colors',
                typeof category.id === 'number' && selectedId === category.id && 'bg-mist-100 font-semibold',
                'hover:bg-mist-50 active:bg-mist-200 focus:bg-mist-100 focus:outline-none'
              )}
              onClick={() => handleCategoryClick(category)}
            >
              <CategoryIcon iconValue={category.metadata?.icon} colorValue={category.metadata?.color} size={size} />
              <span className="truncate">{category.name}</span>
              {typeof category.id === 'number' && selectedId === category.id ? (
                <span className="ml-auto text-coral-600 font-bold flex items-center">
                  <Check className="w-5 h-5" aria-label="Selected" />
                </span>
              ) : null}
            </button>
          ))
        )}
      </div>
      <div className="flex justify-between items-center p-3 border-t border-mist-100 bg-cream-50">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {filteredCategories.length} of {categories.length} categories
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-danger-500 focus:text-danger-500 focus:outline-none"
            onClick={() => {
              setSelectedId(undefined);
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
              // only submit if a category is selected
              if (selectedId === undefined) return;
              const selected = categories.find((cat) => typeof cat.id === 'number' && selectedId === cat.id);
              if (selected) onSubmit(selected);
            }}
          >
            Submit
          </Button>
        </div>
      </div>
    </Modal>
  );
};
