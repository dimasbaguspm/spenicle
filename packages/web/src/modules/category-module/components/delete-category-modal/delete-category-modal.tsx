import { AlertTriangle } from 'lucide-react';

import { Button, Modal } from '../../../../components';
import { useApiDeleteCategoryMutation } from '../../../../hooks/use-api/built-in/use-categories';
import { useSnack } from '../../../../providers/snack';
import type { Category } from '../../../../types/api';

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
    <Modal onClose={onCancel} size="md" closeOnOverlayClick closeOnEscape>
      <Modal.Header>
        <Modal.Title>Confirm Category Deletion</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>
      <Modal.Content>
        <div className="flex items-start gap-3">
          <div className="text-red-600 mt-1">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="text-slate-900 font-medium mb-2">Are you sure you want to delete "{category.name}"?</p>
            <p className="text-slate-600 text-sm">
              This action cannot be undone. All transactions associated with this category will lose their category
              association.
            </p>
          </div>
        </div>
      </Modal.Content>
      <Modal.Footer>
        <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
          Cancel
        </Button>
        <Button variant="danger" onClick={handleConfirm} disabled={isDeleting} busy={isDeleting}>
          {isDeleting ? 'Deleting...' : 'Delete Category'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
