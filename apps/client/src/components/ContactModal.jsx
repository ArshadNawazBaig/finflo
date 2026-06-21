import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Calendar,
  Loader2,
  Mail,
  Phone,
  User,
  Building,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import FormField from '@/components/ui/FormField';

const ContactModal = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const onSubmit = async (formData) => {
    setLoading(true);
    try {
      await api.post('/contact', {
        ...formData,
        subject: 'Strategy Call Request',
        recipientEmail: 'arshadnawazbaig@gmail.com',
      });

      toast.success("Message sent successfully! We'll get back to you soon.");
      onClose();
      reset();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          'Failed to send message. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
              <Calendar />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-1.5">
                Schedule a Call
              </p>
              <DialogTitle>Schedule a Strategy Call</DialogTitle>
              <DialogDescription className="mt-1">
                Tell us about your business and we'll reach out to schedule a
                call.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          id="contact-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <FormField
            label={
              <>
                <User className="w-3 h-3" /> Full Name
              </>
            }
            htmlFor="name"
            labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5"
            error={errors.name?.message}
          >
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 h-auto"
              {...register('name', { required: 'Full name is required' })}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField
              label={
                <>
                  <Mail className="w-3 h-3" /> Email
                </>
              }
              htmlFor="email"
              labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5"
              error={errors.email?.message}
            >
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 transition-all h-auto"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Invalid email address',
                  },
                })}
              />
            </FormField>
            <FormField
              label={
                <>
                  <Phone className="w-3 h-3" /> Phone
                </>
              }
              htmlFor="phone"
              labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5"
            >
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 transition-all h-auto"
                {...register('phone')}
              />
            </FormField>
          </div>

          <FormField
            label={
              <>
                <Building className="w-3 h-3" /> Company Name
              </>
            }
            htmlFor="company"
            labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5"
          >
            <Input
              id="company"
              type="text"
              placeholder="Acme Corp"
              className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 transition-all h-auto"
              {...register('company')}
            />
          </FormField>

          <FormField
            label={
              <>
                <MessageSquare className="w-3 h-3" /> Message
              </>
            }
            htmlFor="message"
            labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5"
            error={errors.message?.message}
          >
            <Textarea
              id="message"
              placeholder="Tell us about your business needs and what you'd like to discuss..."
              rows={5}
              className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 transition-all resize-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
              {...register('message', { required: 'Message is required' })}
            />
          </FormField>
        </form>

        <div className="border-t border-slate-100 dark:border-white/[0.06] pt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="h-11 px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all disabled:opacity-50"
          >
            Cancel
          </Button>
          <Button
            form="contact-form"
            type="submit"
            disabled={loading}
            className="h-11 px-7 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Sending...
              </>
            ) : (
              <>
                <Mail size={14} /> Send Request
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactModal;
