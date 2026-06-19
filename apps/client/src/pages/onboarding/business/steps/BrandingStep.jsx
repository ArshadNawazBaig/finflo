/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useState, useRef } from 'react';
import { Palette, Upload, Lock, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { Input } from '@/components/ui/input';
import FormField from '@/components/ui/FormField';
import { Button } from '@/components/ui/button';
import StepFrame from '../StepFrame';

// "Horizon Micro Finance" → "HMF"; single word → first 4 letters.
const suggestAbbreviation = (name = '') => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  return words
    .slice(0, 5)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
};

const BrandingStep = ({ user, setUser, onNext, onBack, onSkip }) => {
  const canUploadLogo = (user?.plan || 'Free') !== 'Free';
  const [abbreviation, setAbbreviation] = useState(
    user?.businessAbbreviation || suggestAbbreviation(user?.businessName),
  );
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(user?.businessLogo || '');
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleContinue = async () => {
    const abbr = abbreviation.trim().toUpperCase();
    try {
      if (abbr) {
        const { data } = await api.put('/auth/updatedetails', {
          businessAbbreviation: abbr,
        });
        setUser((prev) => ({ ...prev, ...data }));
      }
      if (logoFile && canUploadLogo) {
        const formData = new FormData();
        formData.append('businessLogo', logoFile);
        const { data } = await api.put('/auth/updatebusinesslogo', formData);
        setUser((prev) => ({ ...prev, businessLogo: data.businessLogo }));
      }
      window.dispatchEvent(new Event('userUpdated'));
      onNext();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save branding');
    }
  };

  return (
    <StepFrame
      icon={Palette}
      eyebrow="Step 2 · Branding & identity"
      title="Add your brand"
      description="Your abbreviation prefixes member account numbers; your logo appears on portals and outgoing emails."
      onPrimary={handleContinue}
      onBack={onBack}
      onSkip={onSkip}
    >
      <FormField
        label="Business abbreviation"
        htmlFor="biz-abbr"
        hint="2–5 letters, e.g. HMF. Used in member account numbers."
      >
        <Input
          id="biz-abbr"
          value={abbreviation}
          onChange={(e) => setAbbreviation(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="HMF"
          className="h-12 rounded-xl font-bold uppercase tracking-[0.15em]"
        />
      </FormField>

      <FormField label="Business logo">
        {canUploadLogo ? (
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/40 dark:border-white/[0.06] dark:bg-white/[0.02]">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="h-full w-full object-contain"
                />
              ) : (
                <ImageIcon className="h-6 w-6 text-slate-300 dark:text-slate-600" />
              )}
            </div>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="h-10 gap-2 rounded-full"
              >
                <Upload size={14} />
                {logoPreview ? 'Change logo' : 'Upload logo'}
              </Button>
              <p className="mt-2 text-[11px] font-medium text-slate-400">
                PNG or SVG, square works best.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 p-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-white/[0.06]">
              <Lock size={15} />
            </span>
            <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">
              Custom logo & branding are available on a paid plan. You can add it
              anytime from Settings after upgrading.
            </p>
          </div>
        )}
      </FormField>
    </StepFrame>
  );
};

export default BrandingStep;
