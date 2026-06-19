import { useState, useEffect, useRef } from 'react';
import { ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/axios';

/**
 * Step-up re-authentication modal. Globally mounted once; stays invisible until
 * the axios interceptor dispatches `stepup:required` (a high-risk action got a
 * 403 STEP_UP_REQUIRED). It collects the account's strongest factor — a TOTP
 * code if 2FA is enabled, otherwise the password — POSTs it to `/auth/reauth`
 * (or `/member-auth/reauth`), and resolves the pending request with the freshly
 * minted proof token. Cancelling rejects it (the original action is abandoned).
 */
const StepUpModal = () => {
  const [open, setOpen] = useState(false);
  const [factor, setFactor] = useState('password');
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  // Hold the in-flight resolve/reject so submit/cancel can settle the request.
  const handlersRef = useRef(null);

  useEffect(() => {
    const onRequired = (e) => {
      const { factor: f, resolve, reject } = e.detail || {};
      handlersRef.current = { resolve, reject };
      setFactor(f === '2fa' ? '2fa' : 'password');
      setValue('');
      setError('');
      setSubmitting(false);
      setOpen(true);
    };
    window.addEventListener('stepup:required', onRequired);
    return () => window.removeEventListener('stepup:required', onRequired);
  }, []);

  const cancel = () => {
    const handlers = handlersRef.current;
    handlersRef.current = null;
    setOpen(false);
    setValue('');
    if (handlers?.reject) handlers.reject();
  };

  const submit = async (e) => {
    e?.preventDefault();
    const entry = value.trim();
    if (!entry || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const isMember = window.location.pathname.startsWith('/member/');
      const endpoint = isMember ? '/member-auth/reauth' : '/auth/reauth';
      const body = factor === '2fa' ? { code: entry } : { password: value };
      const { data } = await api.post(endpoint, body);

      const handlers = handlersRef.current;
      handlersRef.current = null;
      setOpen(false);
      setValue('');
      handlers?.resolve(data.token, data.expiresIn);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Verification failed. Please try again.',
      );
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) cancel();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Confirm it&apos;s you
          </DialogTitle>
          <DialogDescription>
            {factor === '2fa'
              ? 'Enter the 6-digit code from your authenticator app to authorize this action.'
              : 'Re-enter your account password to authorize this sensitive action.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <Input
            type={factor === '2fa' ? 'text' : 'password'}
            inputMode={factor === '2fa' ? 'numeric' : undefined}
            autoComplete={factor === '2fa' ? 'one-time-code' : 'current-password'}
            autoFocus
            placeholder={factor === '2fa' ? '123456' : 'Your password'}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={cancel}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !value.trim()}>
              {submitting ? 'Verifying…' : 'Verify'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StepUpModal;
