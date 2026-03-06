// Force update
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';
import api from '@/lib/axios';
import { toast } from 'sonner';

const SendNotificationModal = ({ isOpen, onClose, userId = null }) => {
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [users, setUsers] = useState([]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      recipientId: userId || 'all',
      title: '',
      message: '',
      type: 'info',
    },
  });

  const recipientId = watch('recipientId');
  const type = watch('type');

  useEffect(() => {
    if (isOpen && !userId) {
      const fetchUsers = async () => {
        try {
          setFetchingUsers(true);
          const { data } = await api.get('/super-admin/users?limit=100');
          setUsers(data.users || []);
        } catch (error) {
          console.error('Failed to fetch users', error);
        } finally {
          setFetchingUsers(false);
        }
      };
      fetchUsers();
    }
    if (userId) {
      setValue('recipientId', userId);
    }
  }, [isOpen, userId, setValue]);

  const onSubmit = async (formData) => {
    setLoading(true);
    try {
      await api.post('/notifications/send', formData);
      toast.success('Notification sent successfully');
      reset({
        recipientId: userId || 'all',
        title: '',
        message: '',
        type: 'info',
      });
      onClose();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to send notification',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Send Notification</DialogTitle>
          <DialogDescription>
            Send a message to {userId ? 'this user' : 'users'}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!userId && (
            <div className="space-y-2">
              <Label>Recipient</Label>
              <Select
                value={recipientId}
                onValueChange={(value) => setValue('recipientId', value)}
                disabled={fetchingUsers}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Recipient" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u._id} value={u._id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(value) => setValue('type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              placeholder="Notification Title"
              {...register('title', { required: 'Title is required' })}
            />
            {errors.title && (
              <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                {errors.title.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              placeholder="Type your message here..."
              rows={4}
              {...register('message', { required: 'Message is required' })}
            />
            {errors.message && (
              <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                {errors.message.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-6 py-2 rounded-full border border-border text-muted-foreground hover:bg-muted text-[11px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95"
            >
              Cancel
            </button>
            <Button
              type="submit"
              disabled={loading}
              variant="gradient"
              className="px-8 py-2 rounded-full text-[11px] font-black uppercase tracking-widest"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Notification
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SendNotificationModal;
