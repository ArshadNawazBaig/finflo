/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';

/**
 * Download a payslip PDF. If `payslip` + `business` are supplied they're used
 * directly; otherwise the data is fetched from
 * GET /payroll/payslips/:payslipId before rendering. Rendering is lazy so the
 * (heavy) jsPDF bundle only loads on click.
 *
 * @param {object} props
 * @param {string} [props.payslipId] - Payslip id to fetch when data not passed.
 * @param {object} [props.payslip] - Pre-loaded payslip (populated employee/run).
 * @param {object} [props.business] - Pre-loaded business branding context.
 * @param {string} [props.variant='outline'] - Button variant override.
 * @param {string} [props.size] - Button size override.
 * @param {string} [props.className] - Extra classes for the button.
 */
const PayslipPDFPreview = ({
  payslipId,
  payslip,
  business,
  variant = 'outline',
  size,
  className,
}) => {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (loading) return;
    try {
      setLoading(true);

      let resolvedPayslip = payslip;
      let resolvedBusiness = business;

      if (!resolvedPayslip || !resolvedBusiness) {
        if (!payslipId) {
          toast.error('Payslip is not available to download');
          return;
        }
        const { data } = await api.get(`/payroll/payslips/${payslipId}`);
        resolvedPayslip = data.payslip;
        resolvedBusiness = data.business;
      }

      const { exportPayslip } = await import('@/lib/payslipPdfUtils');
      await exportPayslip(resolvedPayslip, resolvedBusiness);
      toast.success('Payslip downloaded');
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to download payslip',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      isLoading={loading}
      onClick={handleDownload}
    >
      {!loading && <Download className="mr-2 h-4 w-4" />}
      Download Payslip
    </Button>
  );
};

export default PayslipPDFPreview;
