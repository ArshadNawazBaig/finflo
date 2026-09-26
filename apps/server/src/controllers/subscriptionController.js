const { getStripe } = require('../config/stripe');
const User = require('../models/User');
const Loan = require('../models/Loan');
const Member = require('../models/Member');
const Branch = require('../models/Branch');
const Notification = require('../models/Notification');
const { sendEmail } = require('../utils/email');
const {
  superAdminSubscriptionNotificationEmail,
} = require('../utils/emailTemplates');
const { getPlanLimits } = require('../utils/planLimits');
const { getSubscriptionPeriodEnd } = require('../utils/stripeHelpers');

const getBaseUrl = (req) => {
  // Try environment variable first (best for consistent email links)
  let url = process.env.CLIENT_URL;

  if (!url) {
    // Try to get origin from request headers
    const origin = req.get('origin') || req.get('referer');
    if (origin) {
      try {
        const urlObj = new URL(origin);
        url = `${urlObj.protocol}//${urlObj.host}`;
      } catch (e) {
        url = 'http://localhost:5173';
      }
    } else {
      url = 'http://localhost:5173';
    }
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

const createCheckoutSession = async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ message: 'Stripe billing is not configured' });
  const { plan } = req.body;
  const userId = req.user._id;

  try {
    const user = await User.findById(userId);

    // Determine Price ID based on plan
    let priceId;
    if (plan === 'Basic') {
      priceId = process.env.STRIPE_PRICE_ID_BASIC;
    } else if (plan === 'Pro') {
      priceId = process.env.STRIPE_PRICE_ID_PRO;
    } else {
      return res.status(400).json({ message: 'Invalid plan selected' });
    }

    console.log(`Initiating checkout for plan: ${plan}, Price ID: ${priceId}`);

    if (!priceId) {
      console.error(
        `Price ID for plan "${plan}" is not defined in environment variables.`,
      );
      return res.status(500).json({
        message: `Price ID for ${plan} is not configured on the server.`,
      });
    }

    // Prevent duplicate subscriptions
    if (user.stripeSubscriptionId && user.subscriptionStatus === 'active') {
      // User already has an active subscription
      if (user.plan === plan) {
        // Trying to subscribe to the same plan
        return res.status(400).json({
          message: `You already have an active ${plan} subscription.`,
        });
      } else if (user.plan === 'Pro' && plan === 'Basic') {
        // Trying to downgrade from Pro to Basic
        return res.status(400).json({
          message: `To downgrade from Pro to Basic, please use the billing portal to manage your subscription.`,
        });
      } else if (user.plan === 'Basic' && plan === 'Pro') {
        // Allow upgrade from Basic to Pro
        // Cancel the existing Basic subscription first
        try {
          await stripe.subscriptions.cancel(user.stripeSubscriptionId);
          console.log(
            `Canceled existing Basic subscription: ${user.stripeSubscriptionId}`,
          );
        } catch (error) {
          console.error('Error canceling existing subscription:', error);
          return res.status(500).json({
            message:
              'Failed to cancel existing subscription. Please try again.',
          });
        }
      }
    }

    // Create customer if not exists
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user._id.toString() },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    const baseUrl = getBaseUrl(req);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/payment/cancel`,
      subscription_data: {
        metadata: { userId: user._id.toString(), plan },
      },
      metadata: {
        userId: user._id.toString(),
        plan,
      },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout Session Error Detail:', {
      message: error.message,
      type: error.type,
      code: error.code,
      param: error.param,
    });
    res.status(500).json({
      message: 'Failed to initiate checkout session',
      error: error.message,
    });
  }
};

const createPortalSession = async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ message: 'Stripe billing is not configured' });
  try {
    const user = await User.findById(req.user._id);

    let customerId = user.stripeCustomerId;

    // Create customer if not exists (handling migration/first-time users)
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user._id.toString() },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    console.log(
      'Creating portal session for customer:',
      customerId,
      process.env.STRIPE_PORTAL_CONFIGURATION_ID
        ? `with config: ${process.env.STRIPE_PORTAL_CONFIGURATION_ID}`
        : 'using default configuration',
    );

    const baseUrl = getBaseUrl(req);
    const portalOptions = {
      customer: customerId,
      return_url: `${baseUrl}/billing`,
    };

    // Configuration is optional; if missing, Stripe uses the default
    if (process.env.STRIPE_PORTAL_CONFIGURATION_ID) {
      portalOptions.configuration = process.env.STRIPE_PORTAL_CONFIGURATION_ID;
    }

    const session = await stripe.billingPortal.sessions.create(portalOptions);

    res.json({ url: session.url });
  } catch (error) {
    console.error('Portal Session Error Detail:', {
      message: error.message,
      type: error.type,
      code: error.code,
      param: error.param,
    });
    res.status(500).json({
      message: 'Failed to create portal session',
      error: error.message,
    });
  }
};

const getBillingInfo = async (req, res) => {
  const stripe = getStripe();
  try {
    const billingUserId = req.user.effectiveOwnerId;
    const user = await User.findById(billingUserId).select(
      'plan stripeCustomerId subscriptionStatus nextBillingDate',
    );

    const userPlan = user.plan || 'Free';
    const planLimits = await getPlanLimits(userPlan);

    if (!user.stripeCustomerId || !stripe) {
      // Fetch usage counts even if no Stripe ID (includes branches)
      const [loanCount, memberCount, branchCount] = await Promise.all([
        Loan.countDocuments({ user: req.user.effectiveOwnerId }),
        Member.countDocuments({ user: req.user.effectiveOwnerId }),
        Branch.countDocuments({ owner: req.user.effectiveOwnerId }),
      ]);

      return res.json({
        ...user.toObject(),
        paymentMethods: [],
        invoices: [],
        usage: {
          loans: loanCount,
          members: memberCount,
          branches: branchCount,
        },
        limits: planLimits,
      });
    }

    const [paymentMethods, invoices, customer, subscriptions] =
      await Promise.all([
        stripe.paymentMethods.list({
          customer: user.stripeCustomerId,
          type: 'card',
        }),
        stripe.invoices.list({
          customer: user.stripeCustomerId,
          limit: 100, // Fetch more history
        }),
        stripe.customers.retrieve(user.stripeCustomerId),
        stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: 'active',
          limit: 1,
        }),
      ]);

    // Sync Plan from Stripe if needed
    let currentPlan = user.plan;
    let needsSave = false;
    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      const priceId = subscription.items.data[0].price.id;
      let stripePlan = 'Free';

      if (priceId === process.env.STRIPE_PRICE_ID_BASIC) {
        stripePlan = 'Basic';
      } else if (priceId === process.env.STRIPE_PRICE_ID_PRO) {
        stripePlan = 'Pro';
      }

      // If DB plan doesn't match Stripe active plan, update DB
      if (stripePlan !== 'Free' && user.plan !== stripePlan) {
        console.log(
          `Syncing plan for user ${user._id}: ${user.plan} -> ${stripePlan}`,
        );
        user.plan = stripePlan;
        user.subscriptionStatus = 'active';
        user.stripeSubscriptionId = subscription.id;
        currentPlan = stripePlan;
        needsSave = true;
      }

      // Self-heal the renewal date from Stripe (covers records where
      // verify-session failed to persist it). Prefer the subscription period
      // end; fall back to the latest invoice's period end.
      let periodEnd = getSubscriptionPeriodEnd(subscription);
      if (!periodEnd && invoices.data[0]) {
        const inv = invoices.data[0];
        const ts = inv.lines?.data?.[0]?.period?.end || inv.period_end;
        if (ts) {
          const d = new Date(ts * 1000);
          if (!Number.isNaN(d.valueOf())) periodEnd = d;
        }
      }
      if (
        periodEnd &&
        (!user.nextBillingDate ||
          new Date(user.nextBillingDate).getTime() !== periodEnd.getTime())
      ) {
        user.nextBillingDate = periodEnd;
        needsSave = true;
      }
    }
    if (needsSave) await user.save();

    const defaultPaymentMethodId =
      customer.invoice_settings.default_payment_method;

    const formattedPaymentMethods = paymentMethods.data.map((pm) => ({
      _id: pm.id,
      brand: pm.card.brand,
      last4: pm.card.last4,
      expiryMonth: pm.card.exp_month,
      expiryYear: pm.card.exp_year,
      isDefault: pm.id === defaultPaymentMethodId,
    }));

    const formattedInvoices = invoices.data.map((inv) => ({
      _id: inv.id,
      number: inv.number,
      date: new Date(inv.created * 1000),
      amount: inv.total / 100, // Show total amount (even if not paid)
      status: inv.status, // paid, open, void, uncollectible, draft
      url: inv.hosted_invoice_url,
      periodStart: new Date(
        (inv.lines?.data[0]?.period?.start || inv.period_start) * 1000,
      ),
      periodEnd: new Date(
        (inv.lines?.data[0]?.period?.end || inv.period_end) * 1000,
      ),
      type: 'invoice',
    }));

    // Fetch Payment records for this user (including refunds)
    const Payment = require('../models/Payment');
    const payments = await Payment.find({ user: user._id }).sort({ date: -1 });

    const formattedPayments = payments
      .filter((p) => p.status === 'refunded') // Only include refunds
      .map((p) => ({
        _id: p._id,
        number: `REFUND-${p._id.toString().slice(-8).toUpperCase()}`,
        date: p.refundedAt || p.date,
        amount: Math.abs(p.amount), // Show positive amount
        status: 'refunded',
        url: null,
        periodStart: null,
        periodEnd: null,
        type: 'refund',
      }));

    // Fetch all subscriptions (including canceled ones)
    const allSubscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      limit: 100,
      status: 'all',
    });

    const formattedCanceledSubscriptions = allSubscriptions.data
      .filter((sub) => sub.status === 'canceled' && sub.canceled_at)
      .map((sub) => {
        // Determine plan name from price ID
        let planName = 'Unknown';
        if (sub.items && sub.items.data.length > 0) {
          const priceId = sub.items.data[0].price.id;
          if (priceId === process.env.STRIPE_PRICE_ID_BASIC) {
            planName = 'Basic';
          } else if (priceId === process.env.STRIPE_PRICE_ID_PRO) {
            planName = 'Pro';
          }
        }

        return {
          _id: sub.id,
          number: `SUB-CANCELED-${sub.id.slice(-8).toUpperCase()}`,
          date: new Date(sub.canceled_at * 1000),
          amount: 0,
          status: 'canceled',
          url: null,
          periodStart: sub.current_period_start
            ? new Date(sub.current_period_start * 1000)
            : null,
          periodEnd: getSubscriptionPeriodEnd(sub),
          type: 'subscription_canceled',
          planName: planName,
        };
      });

    // Merge and sort by date
    const allBillingHistory = [
      ...formattedInvoices,
      ...formattedPayments,
      ...formattedCanceledSubscriptions,
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Fetch usage counts (All-time regardless of status)
    const [loanCount, memberCount, branchCount] = await Promise.all([
      Loan.countDocuments({ user: req.user.effectiveOwnerId }),
      Member.countDocuments({ user: req.user.effectiveOwnerId }),
      Branch.countDocuments({ owner: req.user.effectiveOwnerId }),
    ]);

    res.json({
      ...user.toObject(),
      plan: currentPlan, // Return the synced plan
      paymentMethods: formattedPaymentMethods,
      invoices: allBillingHistory,
      usage: {
        loans: loanCount,
        members: memberCount,
        branches: branchCount,
      },
      limits: planLimits,
    });
  } catch (error) {
    console.error('Error fetching billing info:', error);
    res.status(500).json({ message: 'Failed to fetch billing info' });
  }
};

const addPaymentMethod = async (req, res) => {
  const { brand, last4, expiryMonth, expiryYear, isDefault } = req.body;
  try {
    const user = await User.findById(req.user._id);
    user.paymentMethods.push({
      brand,
      last4,
      expiryMonth,
      expiryYear,
      isDefault: isDefault || false,
    });
    await user.save();
    res.status(201).json(user.paymentMethods);
  } catch (error) {
    res.status(500).json({ message: 'Failed to add payment method' });
  }
};

const setDefaultPaymentMethod = async (req, res) => {
  const { paymentMethodId } = req.params;
  try {
    const user = await User.findById(req.user._id);

    // Set all to non-default
    user.paymentMethods.forEach((pm) => {
      pm.isDefault = false;
    });

    // Set selected as default
    const selectedMethod = user.paymentMethods.id(paymentMethodId);
    if (selectedMethod) {
      selectedMethod.isDefault = true;
      await user.save();
      res.json({
        message: 'Default payment method updated',
        paymentMethods: user.paymentMethods,
      });
    } else {
      res.status(404).json({ message: 'Payment method not found' });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Failed to update default payment method' });
  }
};

const removePaymentMethod = async (req, res) => {
  const { paymentMethodId } = req.params;
  try {
    const user = await User.findById(req.user._id);
    const method = user.paymentMethods.id(paymentMethodId);

    if (!method) {
      return res.status(404).json({ message: 'Payment method not found' });
    }

    if (method.isDefault && user.paymentMethods.length > 1) {
      return res.status(400).json({
        message:
          'Cannot remove default payment method. Set another as default first.',
      });
    }

    user.paymentMethods.pull(paymentMethodId);
    await user.save();
    res.json({
      message: 'Payment method removed',
      paymentMethods: user.paymentMethods,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove payment method' });
  }
};

const verifySession = async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ message: 'Stripe billing is not configured' });
  const { sessionId } = req.body;
  const userId = req.user._id;

  try {
    console.log(`Verifying session ${sessionId} for user ${userId}`);

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Get the subscription details
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription,
    );

    // Determine plan from Price ID
    const priceId = subscription.items.data[0].price.id;
    let plan = 'Pro'; // Default

    if (priceId === process.env.STRIPE_PRICE_ID_BASIC) {
      plan = 'Basic';
    } else if (priceId === process.env.STRIPE_PRICE_ID_PRO) {
      plan = 'Pro';
    }

    console.log(`Determined plan: ${plan} from price ID: ${priceId}`);

    // Update user in database
    const update = {
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription,
      subscriptionStatus: 'active',
      plan: plan,
    };
    const periodEnd = getSubscriptionPeriodEnd(subscription);
    if (periodEnd) update.nextBillingDate = periodEnd;

    const updatedUser = await User.findByIdAndUpdate(userId, update, {
      returnDocument: 'after',
    });

    console.log(`User ${userId} updated to ${plan} plan`);

    // Notify Super Admin
    try {
      const superAdmin = await User.findOne({ role: 'super_admin' });
      if (superAdmin) {
        // Email Notification
        await sendEmail({
          to: superAdmin.email,
          subject: `Subscription Activated: ${updatedUser.name} (${plan})`,
          html: superAdminSubscriptionNotificationEmail(updatedUser, plan),
        });

        // In-App Notification
        await Notification.create({
          recipient: superAdmin._id,
          recipientModel: 'User',
          title: 'Subscription Activated',
          message: `${updatedUser.name} has activated their ${plan} plan.`,
          type: 'success',
          link: '/super-admin/revenue',
        });
      }
    } catch (saNotifErr) {
      console.error(
        'Failed to notify super admin of subscription activity:',
        saNotifErr,
      );
    }

    res.json({
      success: true,
      plan: updatedUser.plan,
      subscriptionStatus: updatedUser.subscriptionStatus,
    });
  } catch (error) {
    console.error('Error verifying session:', error);
    res.status(500).json({
      message: 'Failed to verify session',
      error: error.message,
    });
  }
};

const updateSubscription = async (req, res) => {
  const { plan } = req.body;
  try {
    const user = await User.findById(req.user._id);

    if (!['Free', 'Basic', 'Pro'].includes(plan)) {
      return res.status(400).json({ message: 'Invalid plan' });
    }

    user.plan = plan;
    user.subscriptionStatus = plan === 'Free' ? 'inactive' : 'active';

    // Set next billing date to next month
    if (plan !== 'Free') {
      const nextBilling = new Date();
      nextBilling.setMonth(nextBilling.getMonth() + 1);
      user.nextBillingDate = nextBilling;
    }

    await user.save();

    // Notify Super Admin of modification (if not Free)
    if (plan !== 'Free') {
      try {
        const superAdmin = await User.findOne({ role: 'super_admin' });
        if (superAdmin) {
          // Email Notification
          await sendEmail({
            to: superAdmin.email,
            subject: `Subscription Modified: ${user.name} (${plan})`,
            html: superAdminSubscriptionNotificationEmail(user, plan),
          });

          // In-App Notification
          await Notification.create({
            recipient: superAdmin._id,
            recipientModel: 'User',
            title: 'Subscription Modified',
            message: `${user.name}'s plan has been modified to ${plan} manually.`,
            type: 'info',
            link: '/super-admin/users',
          });
        }
      } catch (saNotifErr) {
        console.error(
          'Failed to notify super admin of subscription modification:',
          saNotifErr,
        );
      }
    }

    res.json({ message: `Subscription updated to ${plan} plan`, user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update subscription' });
  }
};

module.exports = {
  createCheckoutSession,
  createPortalSession,
  getBillingInfo,
  addPaymentMethod,
  setDefaultPaymentMethod,
  removePaymentMethod,
  updateSubscription,
  verifySession,
};
