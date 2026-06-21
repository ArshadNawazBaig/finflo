/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useState, useEffect } from 'react';
import { Loader2, Mail, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import FormField from '@/components/ui/FormField';
import api from '@/lib/axios';
import { validateEmail } from '@/lib/utils';

/**
 * Parse a free-form string of emails (separated by commas, whitespace, or
 * newlines) into a de-duplicated, lowercased list.
 */
const parseEmails = (raw) => {
  const seen = new Set();
  const list = [];
  String(raw || '')
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .forEach((email) => {
      if (!seen.has(email)) {
        seen.add(email);
        list.push(email);
      }
    });
  return list;
};

/**
 * Admin modal to invite one or more members by email. Emails are entered as a
 * free-form textarea (split on commas / spaces / newlines), with an optional
 * branch and profit rate. On submit it POSTs to /members/invite and surfaces
 * the per-email summary returned by the server (sent / skipped / errors).
 */
const InviteMemberModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [fetchingBranches, setFetchingBranches] = useState(false);
  const [branches, setBranches] = useState([]);
  const [rawEmails, setRawEmails] = useState('');
  const [branchId, setBranchId] = useState('');
  const [profitRate, setProfitRate] = useState('');
  const [emailError, setEmailError] = useState('');
  const [summary, setSummary] = useState(null);

  const emails = parseEmails(rawEmails);

  useEffect(() => {
    if (!isOpen) return;
    const fetchBranches = async () => {
      setFetchingBranches(true);
      try {
        const { data } = await api.get('/branches');
        setBranches(data || []);
      } catch (err) {
        console.error('Failed to fetch branches', err);
      } finally {
        setFetchingBranches(false);
      }
    };
    fetchBranches();
  }, [isOpen]);

  const resetForm = () => {
    setRawEmails('');
    setBranchId('');
    setProfitRate('');
    setEmailError('');
    setSummary(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const removeEmail = (target) => {
    setRawEmails(emails.filter((e) => e !== target).join(', '));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setEmailError('');
    setSummary(null);

    if (emails.length === 0) {
      setEmailError('Enter at least one email address.');
      return;
    }

    const invalid = emails.filter((email) => !validateEmail(email).isValid);
    if (invalid.length > 0) {
      setEmailError(`Invalid email${invalid.length > 1 ? 's' : ''}: ${invalid.join(', ')}`);
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/members/invite', {
        emails,
        branchId: branchId || undefined,
        profitRate: profitRate !== '' ? parseFloat(profitRate) : undefined,
      });

      const sent = data?.sent || [];
      const skipped = data?.skipped || [];
      const errors = data?.errors || [];

      if (sent.length > 0) {
        toast.success(
          `${sent.length} invitation${sent.length > 1 ? 's' : ''} sent successfully`,
        );
      } else {
        toast.error('No invitations were sent.');
      }

      if (skipped.length > 0 || errors.length > 0) {
        // Keep the modal open and show the per-email breakdown inline so the
        // admin can see which addresses were skipped / failed and why.
        setSummary({ sent, skipped, errors });
      } else {
        onSuccess?.();
        handleClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invitations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px] max-h-[95vh] !p-0 !gap-0 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="p-6 sm:p-7 pb-5 border-b border-slate-100 dark:border-white/[0.06] z-10">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
                <Mail />
              </div>
              <div className="min-w-0 flex-1 pr-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1.5">
                  Member invitations
                </p>
                <DialogTitle>Invite by Email</DialogTitle>
                <DialogDescription className="mt-1">
                  Send a secure sign-up link to one or more members.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-7 custom-scrollbar">
          <form id="invite-member-form" onSubmit={onSubmit} className="space-y-6">
            <FormField
              label="Email Addresses"
              htmlFor="invite-emails"
              hint="Separate multiple emails with a comma, space, or new line."
              error={emailError}
              required
            >
              <Textarea
                id="invite-emails"
                value={rawEmails}
                onChange={(e) => setRawEmails(e.target.value)}
                placeholder="ali@example.com, sara@example.com"
                className="min-h-[100px] resize-none"
              />
            </FormField>

            {emails.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {emails.map((email) => {
                  const isValid = validateEmail(email).isValid;
                  return (
                    <span
                      key={email}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                        isValid
                          ? 'bg-primary/10 text-primary'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() => removeEmail(email)}
                        className="rounded-full hover:opacity-70 transition-opacity"
                        aria-label={`Remove ${email}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            <FormField label="Branch" htmlFor="invite-branch">
              <select
                id="invite-branch"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                disabled={fetchingBranches}
                className="flex h-11 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-4 text-sm font-medium focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
              >
                <option value="">No branch (assign later)</option>
                {branches.map((branch) => (
                  <option key={branch._id} value={branch._id}>
                    {branch.name}
                    {branch.isDefault ? ' (Default)' : ''}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Profit Rate (%)"
              htmlFor="invite-profit-rate"
              hint="Optional. Applied to members who accept this invitation."
            >
              <Input
                id="invite-profit-rate"
                type="number"
                min="0"
                step="0.01"
                value={profitRate}
                onChange={(e) => setProfitRate(e.target.value)}
                placeholder="e.g. 12"
                className="h-11"
              />
            </FormField>

            {summary && (
              <div className="space-y-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] p-4">
                {summary.sent.length > 0 && (
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Sent: {summary.sent.map((s) => s.email).join(', ')}
                  </p>
                )}
                {summary.skipped.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Skipped
                    </p>
                    {summary.skipped.map((s) => (
                      <p
                        key={s.email}
                        className="text-xs text-slate-600 dark:text-slate-300"
                      >
                        {s.email} — {s.reason}
                      </p>
                    ))}
                  </div>
                )}
                {summary.errors.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                      Failed
                    </p>
                    {summary.errors.map((s) => (
                      <p
                        key={s.email}
                        className="text-xs text-slate-600 dark:text-slate-300"
                      >
                        {s.email} — {s.reason}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="px-6 sm:px-7 pb-6 sm:pb-7 pt-5 border-t border-slate-100 dark:border-white/[0.06] z-10 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            className="px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all"
          >
            {summary ? 'Close' : 'Cancel'}
          </Button>
          <Button
            form="invite-member-form"
            type="submit"
            disabled={loading || emails.length === 0}
            className="h-11 px-7 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Mail size={16} />
            )}
            Send Invitation{emails.length > 1 ? 's' : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteMemberModal;
