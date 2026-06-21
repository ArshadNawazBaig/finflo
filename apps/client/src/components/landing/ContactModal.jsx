import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, User, Mail, MessageSquare, Loader2, Building } from 'lucide-react';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import FormField from '@/components/ui/FormField';

const ContactModal = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/public/contact', formData);
      toast.success(
        'Message received! Our enterprise team will contact you soon.',
      );
      setFormData({ name: '', email: '', message: '' });
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] cursor-pointer"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[201] p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-white dark:bg-slate-950 rounded-[1.5rem] sm:rounded-[2rem] border border-slate-100 dark:border-white/[0.06] shadow-[0_40px_80px_-20px_rgba(15,23,42,0.35)] pointer-events-auto overflow-hidden relative p-6 sm:p-7"
            >
              {/* Header */}
              <div className="flex items-start gap-3 pr-12 mb-5">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
                  <Building />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary mb-1.5">
                    Infrastructure & Scale
                  </p>
                  <h3 className="text-lg sm:text-xl font-extrabold tracking-[-0.025em] leading-tight text-slate-900 dark:text-white">
                    Contact Enterprise
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                    Tell us how we can help your institution scale.
                  </p>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={onClose}
                className="absolute right-5 top-5 z-[70] h-8 w-8 rounded-full bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.1] hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.5} />
              </Button>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <FormField
                  label={
                    <>
                      <User className="w-3 h-3" /> Full Name
                    </>
                  }
                  htmlFor="contact-name"
                  labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5"
                >
                  <Input
                    id="contact-name"
                    required
                    type="text"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="h-auto rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                  />
                </FormField>

                <FormField
                  label={
                    <>
                      <Mail className="w-3 h-3" /> Business Email
                    </>
                  }
                  htmlFor="contact-email"
                  labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5"
                >
                  <Input
                    id="contact-email"
                    required
                    type="email"
                    placeholder="john@company.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="h-auto rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                  />
                </FormField>

                <FormField
                  label={
                    <>
                      <MessageSquare className="w-3 h-3" /> Message
                    </>
                  }
                  htmlFor="contact-message"
                  labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5"
                >
                  <Textarea
                    id="contact-message"
                    required
                    rows={4}
                    placeholder="How can we help your institution scale?"
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 transition-all resize-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                  />
                </FormField>

                <div className="border-t border-slate-100 dark:border-white/[0.06] pt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onClose}
                    className="h-11 px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-11 px-7 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:translate-y-0"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send size={14} />
                        Submit Inquiry
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ContactModal;
