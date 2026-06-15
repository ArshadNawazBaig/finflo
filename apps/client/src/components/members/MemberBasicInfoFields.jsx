/* eslint-disable react/prop-types -- project convention: no propTypes */
import FormField from '@/components/ui/FormField';
import { Input } from '@/components/ui/input';
import { formatCNIC } from '@/lib/utils';

/**
 * Identity fields for member onboarding: name, CNIC, email, phone.
 * Receives react-hook-form `register`/`errors`/`setValue` from the parent form
 * (does NOT call useForm itself).
 */
const MemberBasicInfoFields = ({ register, errors, setValue }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <FormField label="Full Name" htmlFor="name" required error={errors.name?.message}>
      <Input
        id="name"
        placeholder="Enter name"
        {...register('name', { required: 'Full name is required' })}
      />
    </FormField>

    <FormField label="CNIC Number" htmlFor="cnic" required error={errors.cnic?.message}>
      <Input
        id="cnic"
        placeholder="00000-0000000-0"
        className="font-mono tabular-nums"
        {...register('cnic', { required: 'CNIC is required' })}
        onChange={(e) => setValue('cnic', formatCNIC(e.target.value))}
      />
    </FormField>

    <FormField label="Email Address" htmlFor="email" required error={errors.email?.message}>
      <Input
        id="email"
        type="email"
        placeholder="member@example.com"
        {...register('email', { required: 'Email is required' })}
      />
    </FormField>

    <FormField label="Phone Number" htmlFor="phone" required error={errors.phone?.message}>
      <Input
        id="phone"
        type="tel"
        placeholder="+92 300 1234567"
        {...register('phone', { required: 'Phone number is required' })}
      />
    </FormField>
  </div>
);

export default MemberBasicInfoFields;
