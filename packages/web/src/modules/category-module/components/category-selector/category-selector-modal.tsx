import React, { useState, useMemo, useRef, useEffect } from 'react';

import { Modal } from '../../../../components/modal';
import { cn } from '../../../../libs/utils';
import type { Category } from '../../../../types/api';
import { CategoryIcon } from '../category-icon';

interface CategorySelectorModalProps {
  isOpen: boolean;
  categories: Category[];
  value: Category | null;
  onSelect: (category: Category) => void;
  onClear: () => void;
  onClose: () => void;
  size?: 'sm' | 'md';
}

export const CategorySelectorModal: React.FC<CategorySelectorModalProps> = ({
  isOpen,
  categories,
  value,
  onSelect,
  onClear,
  onClose,
  size = 'md',
}) => {
  const [search, setSearch] = useState('');
  const [focusedIdx, setFocusedIdx] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredCategories = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter((cat) => (cat.name ?? '').toLowerCase().includes(term));
  }, [categories, search]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
      setFocusedIdx(filteredCategories.findIndex((cat) => cat.id === value?.id));
    } else {
      setSearch('');
      setFocusedIdx(-1);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredCategories.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIdx((idx) => (idx + 1) % filteredCategories.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIdx((idx) => (idx - 1 + filteredCategories.length) % filteredCategories.length);
    } else if (e.key === 'Enter' && focusedIdx >= 0) {
      e.preventDefault();
      onSelect(filteredCategories[focusedIdx]);
    } else if (e.key === 'Tab') {
      // Allow default tab behavior: focus moves to next/prev focusable element
      setFocusedIdx(-1);
    }
  };

  useEffect(() => {
    // Scroll focused item into view
    if (listRef.current && focusedIdx >= 0) {
      const item = listRef.current.querySelectorAll('button[role="option"]')[focusedIdx] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [focusedIdx, filteredCategories]);

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose} size="sm" closeOnOverlayClick closeOnEscape>
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
          onKeyDown={handleKeyDown}
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
          filteredCategories.map((category, idx) => (
            <button
              key={category.id}
              type="button"
              role="option"
              aria-selected={value?.id === category.id}
              className={cn(
                'w-full flex items-center gap-3 text-left px-4 py-3 transition-colors',
                value?.id === category.id && 'bg-mist-100 font-semibold',
                focusedIdx === idx
                  ? 'bg-coral-50 z-10'
                  : 'hover:bg-mist-50 active:bg-mist-200 focus:bg-mist-100 focus:outline-none'
              )}
              onClick={() => onSelect(category)}
              onMouseEnter={() => setFocusedIdx(idx)}
            >
              <CategoryIcon
                iconValue={category.metadata?.icon}
                colorValue={category.metadata?.color}
                size={size === 'sm' ? 'sm' : 'md'}
              />
              <span className="truncate">{category.name}</span>
            </button>
          ))
        )}
      </div>
      <div className="flex justify-between items-center p-3 border-t border-mist-100 bg-cream-50">
        {/* Info left: filtered/total count */}
        <div className="text-xs text-slate-500">
          {filteredCategories.length} of {categories.length} categories
        </div>
        {/* Clear right */}
        <button
          type="button"
          className="text-sm text-slate-400 hover:text-danger-500 focus:text-danger-500 focus:outline-none"
          onClick={onClear}
        >
          Clear
        </button>
      </div>
    </Modal>
  );
};
