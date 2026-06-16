/* eslint-disable react/prop-types -- project convention: no propTypes */
import FormField from '@/components/ui/FormField';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

/**
 * Employment + address fields for member onboarding: occupation, monthly
 * income, job detail, and residential address.
 */
const MemberEmploymentFields = ({ register }) => (
  <>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormField label="Occupation" htmlFor="job">
        <Input id="job" placeholder="e.g. Business" {...register('job')} />
      </FormField>
      <FormField label="Monthly Income" htmlFor="monthlyIncome">
        <Input
          id="monthlyIncome"
          type="number"
          placeholder="0.00"
          className="tabular-nums"
          {...register('monthlyIncome')}
        />
      </FormField>
    </div>

    <FormField label="Job Detail & Office Address" htmlFor="jobDetail">
      <Textarea
        id="jobDetail"
        placeholder="Details of job and office location..."
        className="min-h-[80px] resize-none"
        {...register('jobDetail')}
      />
    </FormField>

    <FormField label="Residential Address" htmlFor="address">
      <Textarea
        id="address"
        placeholder="Enter complete address..."
        className="min-h-[80px] resize-none"
        {...register('address')}
      />
    </FormField>
  </>
);

export default MemberEmploymentFields;
