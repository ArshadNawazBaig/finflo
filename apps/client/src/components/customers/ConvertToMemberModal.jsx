import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useForm } from 'react-hook-form';
import { X, UserPlus, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PasswordInput from '@/components/ui/PasswordInput';
import api from '@/lib/axios';
import { toast } from 'sonner';

const ConvertToMemberModal = ({ isOpen, onClose, customer, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await api.post('/members/convert', {
        customerId: customer._id,
        password: data.password,
      });

      toast.success('Member account created successfully');
      reset();
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to convert customer',
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !customer) return null;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] bg-white dark:bg-slate-950 border border-slate-100 dark:border-white/[0.06] p-6 sm:p-7 text-left align-middle shadow-[0_40px_80px_-20px_rgba(15,23,42,0.35)] transition-all">
                <div className="flex items-start justify-between mb-6 gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
                      <UserPlus />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1.5">
                        Member onboarding
                      </p>
                      <Dialog.Title
                        as="h3"
                        className="text-lg sm:text-xl font-extrabold tracking-[-0.025em] leading-tight text-slate-900 dark:text-white"
                      >
                        Convert to Member
                      </Dialog.Title>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="h-8 w-8 rounded-full bg-slate-100 dark:bg-white/[0.05] text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/[0.1] hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all shrink-0"
                  >
                    <X size={14} strokeWidth={2.5} />
                  </button>
                </div>

                <div className="mb-6 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] p-4 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Converting <strong className="font-bold text-slate-900 dark:text-white capitalize">{customer.name || 'this customer'}</strong>{' '}
                  (CNIC: <span className="font-mono font-bold text-slate-900 dark:text-white">{customer.cnic}</span>) to a Member will give them access to
                  the Member Portal where they can view their loans and submit
                  new requests.
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Password */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                      Set Password
                    </label>
                    <PasswordInput
                      {...register('password', {
                        required: 'Password is required',
                        minLength: {
                          value: 8,
                          message: 'Password must be at least 8 characters',
                        },
                      })}
                      placeholder="Create a password for the member"
                      leftIcon={
                        <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-primary transition-colors" />
                      }
                    />
                    {errors.password && (
                      <p className="text-rose-500 text-[10px] font-bold pl-1 mt-1 animate-in fade-in slide-in-from-top-1">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-slate-100 dark:border-white/[0.06] pt-5">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all"
                    >
                      Cancel
                    </button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-11 px-7 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Create Account'
                      )}
                    </Button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ConvertToMemberModal;
