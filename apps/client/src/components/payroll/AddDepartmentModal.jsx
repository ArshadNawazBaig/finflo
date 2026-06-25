/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ModalShell } from '@/components/ui/ModalShell';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import api from '@/lib/axios';
import { toast } from 'sonner';

/**
 * Create or edit a payroll department. Standard modal contract
 * ({ isOpen, onClose, onSuccess }); pass `initialData` to edit. A rename
 * cascades to assigned employees server-side.
 */
const AddDepartmentModal = ({ isOpen, onClose, onSuccess, initialData }) => {
  const isEdit = !!initialData;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(initialData?.name || '');
    setDescription(initialData?.description || '');
  }, [isOpen, initialData]);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Department name is required');
      return;
    }
    setIsLoading(true);
    try {
      if (isEdit) {
        await api.put(`/payroll/departments/${initialData._id}`, {
          name: trimmed,
          description,
        });
        toast.success('Department updated');
      } else {
        await api.post('/payroll/departments', { name: trimmed, description });
        toast.success('Department created');
      }
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save department');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-0 overflow-hidden sm:max-w-md">
        <ModalShell
          icon={Building2}
          title={
            <DialogTitle>
              {isEdit ? 'Edit Department' : 'Add Department'}
            </DialogTitle>
          }
          description={
            <DialogDescription>
              Departments organise employees for payroll.
            </DialogDescription>
          }
          footer={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleSubmit} isLoading={isLoading}>
                {isEdit ? 'Save Changes' : 'Create Department'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <FormField label="Department Name" htmlFor="dept-name" required>
              <Input
                id="dept-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="e.g. Operations"
                autoFocus
              />
            </FormField>
            <FormField label="Description" htmlFor="dept-desc">
              <Textarea
                id="dept-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
                rows={3}
              />
            </FormField>
          </div>
        </ModalShell>
      </DialogContent>
    </Dialog>
  );
};

export default AddDepartmentModal;
