import { AlertTriangle } from 'lucide-react';

import { Button, Modal } from '../../../../components';
import { useApiDeleteCategoryMutation } from '../../../../hooks/use-api/built-in/use-categories';
import { useSnack } from '../../../../providers/snack';
import type { Category } from '../../../../types/api';
import { CategoryIcon } from '../category-icon';

export interface DeleteCategoryModalProps {
  category: Category | null;
  onSuccess?: (deletedCategory: Category) => void;
  onCancel: () => void;
}

export function DeleteCategoryModal({ category, onSuccess, onCancel }: DeleteCategoryModalProps) {
  const [deleteCategory, , { isPending: isDeleting }] = useApiDeleteCategoryMutation();
  const { success, error } = useSnack();

  if (!category) {
    return null;
  }

  const handleConfirm = async () => {
    if (!category.id) return;

    try {
      await deleteCategory({ categoryId: category.id });
      success(`Category "${category.name}" deleted successfully`);
      onSuccess?.(category);
      onCancel(); // Close the modal
    } catch {
      error(`Failed to delete category "${category.name}"`);
    }
  };

  return (
    <Modal onClose={onCancel} size="sm" closeOnOverlayClick closeOnEscape>
      <Modal.Header>
        <Modal.Title>Delete Category</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>
      <Modal.Content>
        <div className="space-y-4">
          {/* Warning with Category */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <div className="w-8 h-8 rounded-full bg-danger-100 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-danger-600" />
              </div>
            </div>
            <div className="flex-1">
              <p className="text-slate-900 font-medium mb-3">Are you sure you want to continue?</p>

              {/* Category Display */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <CategoryIcon
                  iconValue={category.metadata?.icon ?? 'tag'}
                  colorValue={category.metadata?.color ?? 'coral'}
                  size="sm"
                />
                <span className="font-medium text-slate-900 truncate">{category.name}</span>
              </div>

              <p className="text-sm text-slate-600 mt-3">
                This will permanently remove the category and cannot be undone. All associated transactions will lose
                their category assignment.
              </p>
            </div>
          </div>
        </div>
      </Modal.Content>
      <Modal.Footer>
        <Button variant="slate-outline" onClick={onCancel} disabled={isDeleting}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleConfirm} disabled={isDeleting} busy={isDeleting}>
          Confirm
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
