import { useState, useEffect, useRef } from 'react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  CreditCard,
  Check,
  Zap,
  Clock,
  Download,
  Shield,
  Plus,
} from 'lucide-react';
import api from '@/lib/axios';
import { toast } from 'sonner';

import Pagination from '@/components/ui/Pagination';
import BillingSkeleton from '@/components/pricing/BillingSkeleton';
import InvoiceCard from '@/components/payments/InvoiceCard';
import InfiniteLoader from '@/components/InfiniteLoader';
import EmptyState from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';
import useSystemSettings from '@/hooks/useSystemSettings';
import { useIsMobile } from '@/hooks/useIsMobile';

const Billing = () => {
  const {
    getLimit,
    getPlanSettings,
    loading: settingsLoading,
  } = useSystemSettings();
  const [billingData, setBillingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const isMobile = useIsMobile();

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(5);

  const observerTarget = useRef(null);


  useEffect(() => {
    const fetchBillingInfo = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/subscription');
        console.log('Billing data:', data);
        setBillingData(data);
      } catch (error) {
        console.error('Failed to fetch billing info', error);
        toast.error('Failed to load billing information');
      } finally {
        setLoading(false);
      }
    };

    fetchBillingInfo();
  }, []);

  const handleManageSubscription = async () => {
    try {
      const { data } = await api.post('/subscription/create-portal-session');
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error('Failed to open billing settings');
      }
    } catch (error) {
      console.error('Failed to create portal session', error);
      toast.error('Failed to open billing settings. Please try again.');
    }
  };

  const {
    plan,
    subscriptionStatus,
    paymentMethods,
    invoices = [],
    nextBillingDate,
  } = billingData || {};

  // For mobile infinite scroll, we simulate it using the local invoices array
  const totalEntries = invoices.length;
  const totalPages = Math.ceil(totalEntries / limit);

  // Data to display on mobile (accumulated) or desktop (paginated)
  const displayInvoices = isMobile
    ? invoices.slice(0, currentPage * limit)
    : invoices.slice((currentPage - 1) * limit, currentPage * limit);

  useEffect(() => {
    if (!isMobile) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isFetchingMore &&
          currentPage < totalPages
        ) {
          setIsFetchingMore(true);
          // Simulate a small delay for better UX
          setTimeout(() => {
            setCurrentPage((prev) => prev + 1);
            setIsFetchingMore(false);
          }, 500);
        }
      },
      { threshold: 1.0 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [isMobile, isFetchingMore, currentPage, totalPages]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setCurrentPage(1);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title={
          <>
            Billing & <span className="text-primary ">Subscription</span>
          </>
        }
        description="Manage your subscription, payment methods, and billing history."
      />

      {loading && !isFetchingMore && !billingData ? (
        <BillingSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Current Plan Section */}
            <div className="lg:col-span-2 space-y-6">
              <section className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-5 sm:p-8 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Zap size={120} />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold">Current Plan</h3>
                      <span
                        className={`bg-primary/10 text-primary text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full`}
                      >
                        {plan || 'Free'}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      You are currently on the{' '}
                      <strong className="text-foreground">
                        {plan || 'Free'} Plan
                      </strong>
                      .{' '}
                      {subscriptionStatus === 'active'
                        ? 'Renews on'
                        : 'Expires on'}
                      :{' '}
                      <span className="text-foreground">
                        {formatDate(nextBillingDate)}
                      </span>
                      .
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      if (plan === 'Free' || !plan) {
                        window.location.href = '/pricing';
                      } else {
                        handleManageSubscription();
                      }
                    }}
                    variant="gradient"
                    className="px-6 py-2.5 rounded-full flex items-center gap-2 text-[11px] font-black uppercase tracking-widest"
                  >
                    {plan === 'Free' || !plan
                      ? 'Upgrade Plan'
                      : 'Manage Subscription'}
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-6 border-t border-border/50">
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                      Price
                    </p>
                    <p className="text-2xl font-bold">
                      {(() => {
                        const currentPlanName = plan || 'Free';
                        const planSettings = getPlanSettings(currentPlanName);
                        return `$${planSettings?.price ?? 0}/mo`;
                      })()}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                      Status
                    </p>
                    <div
                      className={`flex items-center gap-2 font-bold ${
                        subscriptionStatus === 'active'
                          ? 'text-emerald-500'
                          : 'text-amber-500'
                      }`}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-current animate-pulse" />
                      {subscriptionStatus === 'active' ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                      Payment
                    </p>
                    <div className="flex items-center gap-2">
                      <CreditCard size={18} className="text-muted-foreground" />
                      <span className="font-bold">
                        {paymentMethods && paymentMethods.length > 0
                          ? `•••• ${paymentMethods.find((pm) => pm.isDefault)?.last4 || paymentMethods[0].last4}`
                          : 'No card'}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Payment Methods */}
              <section className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-5 sm:p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6 flex-col sm:flex-row gap-4">
                  <div>
                    <h3 className="text-lg font-bold">Payment Methods</h3>
                    <p className="text-muted-foreground text-sm">
                      Manage your payment details.
                    </p>
                  </div>
                  <button
                    onClick={handleManageSubscription}
                    className="border border-border bg-background hover:bg-muted px-4 py-2 rounded-full flex items-center gap-2 text-[11px] font-black uppercase tracking-widest transition-all duration-300 w-full sm:w-auto justify-center"
                  >
                    <Plus size={14} strokeWidth={3} />
                    Manage Cards
                  </button>
                </div>

                <div className="space-y-3">
                  {paymentMethods && paymentMethods.length > 0 ? (
                    (() => {
                      // Filter for unique cards based on brand + last4
                      const uniquePaymentMethods = paymentMethods.reduce(
                        (acc, current) => {
                          const x = acc.find(
                            (item) =>
                              item.brand === current.brand &&
                              item.last4 === current.last4,
                          );
                          if (!x) {
                            return acc.concat([current]);
                          } else {
                            // If duplicate, prefer the one that is default
                            if (current.isDefault) {
                              return acc.map((item) =>
                                item.brand === current.brand &&
                                item.last4 === current.last4
                                  ? current
                                  : item,
                              );
                            }
                            return acc;
                          }
                        },
                        [],
                      );

                      return uniquePaymentMethods.map((pm, index) => (
                        <div
                          key={index}
                          className={`flex items-center justify-between p-4 border rounded-xl transition-all duration-300 ${
                            pm.isDefault
                              ? 'border-primary/20 bg-primary/5'
                              : 'border-border/50 hover:bg-muted/30'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-8 bg-background border rounded flex items-center justify-center shadow-sm">
                              <CreditCard
                                size={20}
                                className="text-muted-foreground"
                              />
                            </div>
                            <div>
                              <p className="font-bold text-sm">
                                {pm.brand} ending in {pm.last4}
                              </p>
                              <p className="text-xs text-muted-foreground font-medium">
                                Expires {pm.expiryMonth}/{pm.expiryYear}
                              </p>
                            </div>
                          </div>
                          {pm.isDefault && (
                            <span className="text-[10px] font-bold bg-background border px-2.5 py-1 rounded-full text-foreground/70 uppercase tracking-wider">
                              Default
                            </span>
                          )}
                        </div>
                      ));
                    })()
                  ) : (
                    <EmptyState
                      icon={CreditCard}
                      title="No Payment Methods"
                      description="You haven't added any credit or debit cards yet."
                      className="border-none bg-transparent py-8"
                    />
                  )}
                </div>
              </section>

              {/* Billing History */}
              <section className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 sm:p-6 border-b border-border/50 bg-muted/10">
                  <h3 className="text-lg font-bold">Billing History</h3>
                  <p className="text-muted-foreground text-sm">
                    Review and download your previous invoices.
                  </p>
                </div>

                {isMobile ? (
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      {displayInvoices.map((inv) => (
                        <InvoiceCard key={inv._id} invoice={inv} />
                      ))}
                    </div>

                    {/* Infinite Scroll Trigger */}
                    {currentPage < totalPages && (
                      <div ref={observerTarget}>
                        <InfiniteLoader isFetchingMore={isFetchingMore} />
                      </div>
                    )}

                    {displayInvoices.length === 0 && (
                      <EmptyState
                        icon={Download}
                        title="No Billing History"
                        description="Your invoice list is currently empty."
                        className="border-none bg-transparent py-12"
                      />
                    )}
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left border-collapse">
                        <thead>
                          <tr className="bg-muted/30 border-b border-border/50">
                            <th className="px-4 py-4 font-medium text-sm text-muted-foreground text-nowrap">
                              Invoice
                            </th>
                            <th className="px-4 py-4 font-medium text-sm text-muted-foreground text-nowrap">
                              Date
                            </th>
                            <th className="px-4 py-4 font-medium text-sm text-muted-foreground text-nowrap">
                              Billing Period
                            </th>
                            <th className="px-4 py-4 font-medium text-sm text-muted-foreground text-nowrap">
                              Amount
                            </th>
                            <th className="px-4 py-4 font-medium text-sm text-muted-foreground text-nowrap">
                              Status
                            </th>
                            <th className="px-4 py-4 font-medium text-sm text-muted-foreground text-nowrap text-right">
                              Download
                            </th>
                          </tr>
                        </thead>
                        <tbody className="">
                          {displayInvoices.length > 0 ? (
                            displayInvoices.map((inv) => (
                              <tr
                                key={inv._id}
                                className="group hover:bg-muted/30 transition-colors border-b border-border/50 last:border-none"
                              >
                                <td className="px-4 py-4 font-semibold text-foreground text-sm">
                                  {inv.type === 'subscription_canceled'
                                    ? `${inv.planName} Plan Canceled`
                                    : inv.number || inv._id}
                                </td>
                                <td className="px-4 py-4 text-sm text-muted-foreground">
                                  {formatDate(inv.date)}
                                </td>
                                <td className="px-4 py-4 text-xs text-muted-foreground">
                                  {formatDate(inv.periodStart)} -{' '}
                                  {formatDate(inv.periodEnd)}
                                </td>
                                <td className="px-4 py-4 font-medium text-sm">
                                  <span
                                    className={
                                      inv.status === 'refunded'
                                        ? 'line-through text-destructive'
                                        : ''
                                    }
                                  >
                                    $
                                    {Math.round(
                                      inv.amount || 0,
                                    ).toLocaleString()}
                                  </span>
                                  {inv.status === 'refunded' && (
                                    <span className="ml-2 text-xs text-destructive font-bold">
                                      REFUNDED
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-4">
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide
                                    ${
                                      inv.status?.toLowerCase() === 'paid'
                                        ? 'bg-emerald-500/10 text-emerald-600'
                                        : inv.status?.toLowerCase() === 'open'
                                          ? 'bg-blue-500/10 text-blue-600'
                                          : inv.status?.toLowerCase() ===
                                              'refunded'
                                            ? 'bg-red-500/10 text-red-600'
                                            : inv.status?.toLowerCase() ===
                                                  'void' ||
                                                inv.status?.toLowerCase() ===
                                                  'canceled'
                                              ? 'bg-slate-500/10 text-slate-600'
                                              : inv.status?.toLowerCase() ===
                                                  'uncollectible'
                                                ? 'bg-orange-500/10 text-orange-600'
                                                : inv.status?.toLowerCase() ===
                                                    'draft'
                                                  ? 'bg-purple-500/10 text-purple-600'
                                                  : 'bg-destructive/10 text-destructive'
                                    }`}
                                  >
                                    {inv.status}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-right">
                                  {inv.url ? (
                                    <a
                                      href={inv.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-block p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                                      title="Download Invoice"
                                    >
                                      <Download size={16} />
                                    </a>
                                  ) : (
                                    <button
                                      disabled
                                      className="p-1.5 rounded-md text-muted-foreground/50 cursor-not-allowed"
                                      title="No Invoice Available"
                                    >
                                      <Download size={16} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="6" className="px-4 py-4">
                                <EmptyState
                                  icon={Download}
                                  title="No Invoices Found"
                                  description="Your billing history is currently empty."
                                  className="border-none bg-transparent py-12"
                                />
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {totalEntries > 0 && (
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        totalEntries={totalEntries}
                        limit={limit}
                        onPageChange={handlePageChange}
                        onLimitChange={handleLimitChange}
                      />
                    )}
                  </>
                )}
              </section>
            </div>

            {/* Sidebar Info */}
            <div className="space-y-6">
              {/* Usage Stats (Keep static for now for visual appeal, or connect later) */}
              <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-5 sm:p-8 text-white shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
                  <Shield size={140} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm border border-white/10">
                      <Shield className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-xl">
                      {plan === 'Pro' ? 'Pro Benefits' : 'Upgrade to Pro'}
                    </h3>
                  </div>
                  <ul className="space-y-4 text-sm mb-8">
                    <li className="flex items-center gap-3 text-white/90">
                      <div className="bg-emerald-400/20 p-1 rounded-full">
                        <Check
                          size={12}
                          className="text-emerald-300"
                          strokeWidth={3}
                        />
                      </div>
                      <span className="font-medium">Unlimited Loans</span>
                    </li>
                    <li className="flex items-center gap-3 text-white/90">
                      <div className="bg-emerald-400/20 p-1 rounded-full">
                        <Check
                          size={12}
                          className="text-emerald-300"
                          strokeWidth={3}
                        />
                      </div>
                      <span className="font-medium">Advanced Analytics</span>
                    </li>
                    <li className="flex items-center gap-3 text-white/90">
                      <div className="bg-emerald-400/20 p-1 rounded-full">
                        <Check
                          size={12}
                          className="text-emerald-300"
                          strokeWidth={3}
                        />
                      </div>
                      <span className="font-medium">Priority Support</span>
                    </li>
                    <li className="flex items-center gap-3 text-white/90">
                      <div className="bg-emerald-400/20 p-1 rounded-full">
                        <Check
                          size={12}
                          className="text-emerald-300"
                          strokeWidth={3}
                        />
                      </div>
                      <span className="font-medium">API Access</span>
                    </li>
                  </ul>
                  <button
                    onClick={() => {
                      if (plan === 'Free' || !plan) {
                        window.location.href = '/pricing';
                      } else {
                        handleManageSubscription();
                      }
                    }}
                    className="w-full bg-white text-indigo-700 hover:bg-white/90 shadow-lg px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-widest transition-all duration-300 active:scale-95"
                  >
                    {plan === 'Pro'
                      ? 'View Plan Details'
                      : plan === 'Free' || !plan
                        ? 'Upgrade Now'
                        : 'Manage Subscription'}
                  </button>
                </div>
              </div>

              <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-5 sm:p-8 shadow-sm">
                <h3 className="font-bold mb-6 flex items-center gap-2.5 text-lg">
                  <Clock size={20} className="text-muted-foreground" />
                  Usage Limits
                </h3>
                <div className="space-y-6">
                  {(() => {
                    const usage = billingData?.usage || {
                      members: 0,
                      loans: 0,
                    };
                    const currentPlan = plan || 'Free';

                    const limits = {
                      members: getLimit(currentPlan, 'maxMembers'),
                      loans: getLimit(currentPlan, 'maxLoans'),
                    };

                    const stats = [
                      {
                        label: 'Members',
                        used: usage.members,
                        limit: limits.members,
                        color: 'bg-primary',
                        shadow: 'shadow-[0_0_10px_rgba(var(--primary),0.5)]',
                      },
                      {
                        label: 'Loans Created',
                        used: usage.loans,
                        limit: limits.loans,
                        color: 'bg-emerald-500',
                        shadow: 'shadow-[0_0_10px_rgba(16,185,129,0.5)]',
                      },
                    ];

                    return stats.map((stat, index) => {
                      const isUnlimited = stat.limit === Infinity;
                      const percentage = isUnlimited
                        ? 100
                        : Math.min(
                            Math.round((stat.used / stat.limit) * 100),
                            100,
                          );

                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                            <span className="text-muted-foreground">
                              {stat.label}
                            </span>
                            <span>
                              {isUnlimited ? 'Unlimited' : `${percentage}%`}
                            </span>
                          </div>
                          <div className="h-2.5 w-full bg-muted/50 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-1000 ease-out',
                                stat.color,
                                stat.shadow,
                              )}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground text-right font-medium">
                            {stat.used.toLocaleString()} /{' '}
                            {isUnlimited ? '∞' : stat.limit.toLocaleString()}
                          </p>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Billing;
