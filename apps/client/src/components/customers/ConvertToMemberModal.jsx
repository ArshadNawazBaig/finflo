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
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-[2rem] bg-card border border-border/50 p-8 text-left align-middle shadow-2xl transition-all">
                <div className="flex items-center justify-between mb-8">
                  <Dialog.Title
                    as="h3"
                    className="text-2xl font-black tracking-tighter flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <UserPlus size={20} strokeWidth={3} />
                    </div>
                    Convert to Member
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-muted/50 transition-colors"
                  >
                    <X size={20} className="text-muted-foreground" />
                  </button>
                </div>

                <div className="mb-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-600 dark:text-blue-400">
                  Converting <strong>{customer.name || 'this customer'}</strong>{' '}
                  (CNIC: {customer.cnic}) to a Member will give them access to
                  the Member Portal where they can view their loans and submit
                  new requests.
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Password */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground ml-1">
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
                        <Lock className="w-4 h-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                      }
                    />
                    {errors.password && (
                      <p className="text-[11px] font-medium text-destructive ml-1">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      className="flex-1 rounded-xl h-11"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      variant="gradient"
                      className="flex-1 rounded-xl h-11 text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-primary/30"
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
