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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import FormField from '@/components/ui/FormField';
import { Loader2, Send, Bell } from 'lucide-react';
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
          <div className="flex items-start gap-3 pr-8">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
              <Bell />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-1.5">
                Broadcast
              </p>
              <DialogTitle>Send Notification</DialogTitle>
              <DialogDescription className="mt-1">
                Send a message to {userId ? 'this user' : 'users'}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          id="notification-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >
          {!userId && (
            <FormField
              label="Recipient"
              labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
            >
              <Select
                value={recipientId}
                onValueChange={(value) => setValue('recipientId', value)}
                disabled={fetchingUsers}
              >
                <SelectTrigger className="rounded-2xl h-[46px] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] text-sm font-medium">
                  <SelectValue placeholder="Select Recipient" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border border-slate-100 dark:border-white/[0.06] shadow-xl">
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u._id} value={u._id}>
                      {u.name} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
          <FormField
            label="Type"
            labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
          >
            <Select
              value={type}
              onValueChange={(value) => setValue('type', value)}
            >
              <SelectTrigger className="rounded-2xl h-[46px] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] text-sm font-medium">
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border border-slate-100 dark:border-white/[0.06] shadow-xl">
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label="Title"
            htmlFor="title"
            labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
            error={errors.title?.message}
          >
            <Input
              id="title"
              type="text"
              placeholder="Notification Title"
              className="h-auto rounded-2xl border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 transition-all"
              {...register('title', { required: 'Title is required' })}
            />
          </FormField>
          <FormField
            label="Message"
            htmlFor="message"
            labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
            error={errors.message?.message}
          >
            <Textarea
              id="message"
              placeholder="Type your message here..."
              rows={4}
              className="rounded-2xl border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              {...register('message', { required: 'Message is required' })}
            />
          </FormField>
        </form>

        <div className="border-t border-slate-100 dark:border-white/[0.06] pt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="h-auto h-11 px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all"
          >
            Cancel
          </Button>
          <Button
            form="notification-form"
            type="submit"
            disabled={loading}
            className="h-11 px-7 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send Notification
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SendNotificationModal;
