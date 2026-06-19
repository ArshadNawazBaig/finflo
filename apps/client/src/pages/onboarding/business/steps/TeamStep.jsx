/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { validateEmail } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import PasswordInput from '@/components/ui/PasswordInput';
import FormField from '@/components/ui/FormField';
import PillSelect from '@/components/ui/PillSelect';
import StepFrame from '../StepFrame';

const TeamStep = ({ onNext, onBack, onSkip }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleRef, setRoleRef] = useState('none');
  const [roles, setRoles] = useState([]);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let active = true;
    api
      .get('/roles')
      .then(({ data }) => {
        if (active) setRoles(Array.isArray(data) ? data : data?.data || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleContinue = async () => {
    // Empty form → treat as skip (the whole step is optional).
    if (!name.trim() && !email.trim() && !password) {
      onNext();
      return;
    }
    const next = {};
    if (!name.trim()) next.name = 'Name is required';
    const emailCheck = validateEmail(email.trim());
    if (!emailCheck.isValid) next.email = emailCheck.message || 'Invalid email';
    if (!password || password.length < 8)
      next.password = 'Min 8 characters';
    if (Object.keys(next).length) {
      setErrors(next);
      return;
    }
    try {
      await api.post('/staff', {
        name: name.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
        ...(roleRef && roleRef !== 'none' ? { roleRef } : {}),
      });
      toast.success('Teammate added');
      onNext();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add teammate');
    }
  };

  return (
    <StepFrame
      icon={Users}
      eyebrow="Step 5 · Invite your team"
      title="Add a teammate"
      description="Invite a staff member and they'll get their own login. You can manage your full team and permissions later — skip if it's just you for now."
      onPrimary={handleContinue}
      primaryLabel="Add & continue"
      onBack={onBack}
      onSkip={onSkip}
    >
      <FormField label="Full name" htmlFor="staff-name" error={errors.name}>
        <Input
          id="staff-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setErrors((p) => ({ ...p, name: undefined }));
          }}
          placeholder="Jane Doe"
          className="h-12 rounded-xl"
        />
      </FormField>

      <FormField label="Email" htmlFor="staff-email" error={errors.email}>
        <Input
          id="staff-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErrors((p) => ({ ...p, email: undefined }));
          }}
          placeholder="jane@company.com"
          className="h-12 rounded-xl"
        />
      </FormField>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField
          label="Temporary password"
          htmlFor="staff-password"
          error={errors.password}
        >
          <PasswordInput
            id="staff-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors((p) => ({ ...p, password: undefined }));
            }}
            placeholder="••••••••"
            className="h-12 rounded-xl"
          />
        </FormField>

        <FormField label="Role" htmlFor="staff-role">
          <PillSelect
            value={roleRef}
            onValueChange={setRoleRef}
            placeholder="Default access"
            className="h-12 w-full rounded-xl"
            options={[
              { value: 'none', label: 'Default access' },
              ...roles.map((r) => ({ value: r._id, label: r.name })),
            ]}
          />
        </FormField>
      </div>
    </StepFrame>
  );
};

export default TeamStep;
