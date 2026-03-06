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
      <DialogContent className="sm:max-w-[550px] max-h-[95vh] !p-0 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="p-6 border-b bg-background z-10">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black">
                  Schedule a Strategy Call
                </DialogTitle>
                <DialogDescription className="text-sm font-medium">
                  Tell us about your business and we'll reach out to schedule a
                  call.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <form
            id="contact-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-5"
          >
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                  <User className="w-3 h-3" /> Full Name
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/30"
                  {...register('name', { required: 'Full name is required' })}
                />
                {errors.name && (
                  <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                    <Mail className="w-3 h-3" /> Email
                  </label>
                  <input
                    type="email"
                    placeholder="john@example.com"
                    className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'Invalid email address',
                      },
                    })}
                  />
                  {errors.email && (
                    <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                    <Phone className="w-3 h-3" /> Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    {...register('phone')}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                  <Building className="w-3 h-3" /> Company Name
                </label>
                <input
                  type="text"
                  placeholder="Acme Corp"
                  className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  {...register('company')}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                  <MessageSquare className="w-3 h-3" /> Message
                </label>
                <textarea
                  placeholder="Tell us about your business needs and what you'd like to discuss..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none placeholder:text-muted-foreground/30"
                  {...register('message', { required: 'Message is required' })}
                />
                {errors.message && (
                  <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                    {errors.message.message}
                  </p>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="p-6 border-t bg-background z-10 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-8 py-3.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-muted"
          >
            Cancel
          </button>
          <Button
            form="contact-form"
            type="submit"
            disabled={loading}
            variant="gradient"
            className="px-10 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Sending...
              </>
            ) : (
              <>
                <Mail size={16} /> Send Request
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactModal;
