/* eslint-disable react/prop-types -- project convention: no propTypes */
import FormField from '@/components/ui/FormField';
import { Input } from '@/components/ui/input';

/**
 * Investment fields for member onboarding: initial investment + profit rate.
 * Amounts are parsed/normalised in the parent's submit handler.
 */
const MemberInvestmentFields = ({ register }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-muted/30 border border-border">
    <FormField label="Initial Investment" htmlFor="initialInvestment">
      <Input
        id="initialInvestment"
        type="number"
        placeholder="0.00"
        className="tabular-nums"
        {...register('initialInvestment')}
      />
    </FormField>
    <FormField label="Profit Rate (%)" htmlFor="profitRate">
      <Input
        id="profitRate"
        type="number"
        placeholder="0.00"
        className="tabular-nums"
        {...register('profitRate')}
      />
    </FormField>
  </div>
);

export default MemberInvestmentFields;
