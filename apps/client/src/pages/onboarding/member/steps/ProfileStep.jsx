/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useRef, useState } from 'react';
import { UserCircle, Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import FormField from '@/components/ui/FormField';
import { getInitials, capitalize } from '@/lib/utils';
import StepFrame from '../../business/StepFrame';

const ProfileStep = ({ member, setMember, onNext, onBack }) => {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [address, setAddress] = useState(member?.address || '');
  const [cnic, setCnic] = useState(member?.cnic || '');
  const [error, setError] = useState('');

  const hasPhoto = !!member?.profilePicture;
  const canContinue = hasPhoto && cnic.trim() && address.trim();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('profilePicture', file);
    try {
      // Stored on Cloudinary by the upload middleware; we get back the URL.
      const { data } = await api.put(
        '/member-auth/updateprofilepicture',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      if (data?.success) {
        setMember((prev) => ({ ...prev, profilePicture: data.profilePicture }));
        window.dispatchEvent(new Event('memberUpdated'));
        toast.success('Profile picture updated');
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Failed to upload profile picture',
      );
    } finally {
      setUploading(false);
    }
  };

  const handleContinue = async () => {
    if (!hasPhoto) {
      setError('Please upload a profile photo.');
      return;
    }
    if (!cnic.trim()) {
      setError('CNIC is required.');
      return;
    }
    if (!address.trim()) {
      setError('Address is required.');
      return;
    }
    try {
      const { data } = await api.put('/member-auth/updatedetails', {
        cnic: cnic.trim(),
        address: address.trim(),
      });
      setMember((prev) => ({ ...prev, ...(data?.data || {}) }));
      window.dispatchEvent(new Event('memberUpdated'));
      onNext();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save your profile');
    }
  };

  return (
    <StepFrame
      icon={UserCircle}
      eyebrow="Step 1 · Your profile"
      title="Add your photo and details"
      description="A photo helps staff recognise you. Your CNIC and address keep your account records accurate."
      onPrimary={handleContinue}
      onBack={onBack}
      primaryDisabled={!canContinue}
    >
      {/* Avatar uploader */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-primary/10 text-primary ring-1 ring-slate-200 transition-all hover:ring-primary/40 dark:ring-white/[0.08]"
          aria-label="Upload profile picture"
        >
          {member?.profilePicture ? (
            <img
              src={member.profilePicture}
              alt={member?.name || 'Profile'}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-lg font-extrabold">
              {getInitials(capitalize(member?.name || 'Member'))}
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-slate-900/50 opacity-0 transition-opacity group-hover:opacity-100">
            {uploading ? (
              <Loader2 size={18} className="animate-spin text-white" />
            ) : (
              <Camera size={18} className="text-white" />
            )}
          </span>
        </button>
        <div className="space-y-1">
          <p className="text-[13px] font-bold text-slate-900 dark:text-white">
            Profile photo <span className="text-rose-500">*</span>
          </p>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Tap the circle to upload a clear photo of yourself.
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <FormField label="CNIC" htmlFor="member-cnic" required>
        <Input
          id="member-cnic"
          value={cnic}
          onChange={(e) => {
            setCnic(e.target.value);
            if (error) setError('');
          }}
          placeholder="e.g. 35202-1234567-8"
          className="h-12 rounded-xl"
        />
      </FormField>

      <FormField label="Address" htmlFor="member-address" required error={error}>
        <Textarea
          id="member-address"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            if (error) setError('');
          }}
          placeholder="House #, street, area, city"
          className="min-h-[88px] resize-none rounded-xl"
        />
      </FormField>
    </StepFrame>
  );
};

export default ProfileStep;
