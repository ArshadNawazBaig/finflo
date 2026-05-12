import { useState, useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { memberAtom } from '@/atoms';
import PageHeader from '@/components/PageHeader';
import MemberLoanCalculator from '@/components/member/MemberLoanCalculator';
import { MemberCalculatorSkeleton } from '@/components/ui/PageSkeletons';
import api from '@/lib/axios';

const MemberCalculator = () => {
  const member = useAtomValue(memberAtom);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchProducts = async () => {
      try {
        const { data } = await api.get('/loan-products/member');
        if (!cancelled) setProducts(data || []);
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <MemberCalculatorSkeleton />;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <PageHeader
        title="Loan Calculator"
        description="Simulate EMI, simple, or compound interest schedules for any loan amount, rate, and term."
      />
      <MemberLoanCalculator member={member} products={products} />
    </div>
  );
};

export default MemberCalculator;
