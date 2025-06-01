import { type FC, useState, useMemo, useEffect } from 'react';

import { Modal, TextInput, Button } from '../../../../components';
import type { Category } from '../../../../types/api';
import { CategoryIcon } from '../category-icon';

interface GroupCategoryPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  selectedCategoryId?: number | null;
  onSelectCategory: (categoryId: number | null) => void;
}

export const GroupCategoryPickerModal: FC<GroupCategoryPickerModalProps> = ({
  isOpen,
  onClose,
  categories,
  selectedCategoryId,
  onSelectCategory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [tempSelectedId, setTempSelectedId] = useState<number | null>(null);

  // Initialize temp selection when modal opens or selectedCategoryId changes
  useEffect(() => {
    if (isOpen) {
      setTempSelectedId(selectedCategoryId ?? null);
    }
  }, [isOpen, selectedCategoryId]);

  const handleApply = () => {
    onSelectCategory(tempSelectedId);
    onClose();
  };

  const handleCancel = () => {
    setTempSelectedId(selectedCategoryId ?? null);
    onClose();
  };

  // Filter categories based on search term
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories;
    return categories.filter((category) => category.name?.toLowerCase().includes(searchTerm.toLowerCase().trim()));
  }, [categories, searchTerm]);

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose} size="sm">
      <Modal.Header>
        <Modal.Title>Parent Category</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>
      <Modal.Content>
        <div className="space-y-3">
          {/* Search input - only show if there are many categories */}
          {categories.length > 5 && (
            <TextInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search categories..."
              className="w-full"
            />
          )}

          {/* No parent option - always at top */}
          <button
            type="button"
            onClick={() => setTempSelectedId(null)}
            className={`w-full p-3 rounded-lg border transition-all ${
              tempSelectedId === null
                ? 'border-coral-500 bg-coral-50'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </div>
              <span className="font-medium text-slate-900">No Parent</span>
              {tempSelectedId === null && (
                <div className="ml-auto w-4 h-4 rounded-full bg-coral-500 flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
          </button>

          {/* Separator */}
          {filteredCategories.length > 0 && <div className="border-t border-slate-200" />}

          {/* Categories list - compact and scrollable */}
          {filteredCategories.length > 0 ? (
            <div className="max-h-96 overflow-y-auto space-y-1">
              {filteredCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setTempSelectedId(category.id ?? null)}
                  className={`w-full p-3 rounded-lg border transition-all ${
                    tempSelectedId === category.id
                      ? 'border-coral-500 bg-coral-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CategoryIcon
                      iconValue={category.metadata?.icon ?? 'tag'}
                      colorValue={category.metadata?.color ?? 'coral'}
                      size="sm"
                    />
                    <span className="font-medium text-slate-900 truncate flex-1 text-left">{category.name}</span>
                    {tempSelectedId === category.id && (
                      <div className="w-4 h-4 rounded-full bg-coral-500 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : searchTerm ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <p className="text-sm text-slate-500">No categories found for "{searchTerm}"</p>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <p className="text-sm text-slate-500">No categories available</p>
            </div>
          )}
        </div>
      </Modal.Content>
      <Modal.Footer>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="coral" onClick={handleApply}>
            Apply
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};
