const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');

const getBaseUrl = () => {
  let url = process.env.CLIENT_URL || 'http://localhost:5173';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  return url.endsWith('/') ? url.slice(0, -1) : url;
};

const createCheckoutSession = async (req, res) => {
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

    const baseUrl = getBaseUrl();
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

    const baseUrl = getBaseUrl();
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
  try {
    const user = await User.findById(req.user._id).select(
      'plan subscriptionStatus nextBillingDate stripeCustomerId',
    );

    if (!user.stripeCustomerId) {
      return res.json({
        ...user.toObject(),
        paymentMethods: [],
        invoices: [],
      });
    }

    const [paymentMethods, invoices, customer] = await Promise.all([
      stripe.paymentMethods.list({
        customer: user.stripeCustomerId,
        type: 'card',
      }),
      stripe.invoices.list({
        customer: user.stripeCustomerId,
        limit: 100, // Fetch more history
      }),
      stripe.customers.retrieve(user.stripeCustomerId),
    ]);

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

    console.log(
      `Found ${invoices.data.length} invoices for customer ${user.stripeCustomerId}`,
    );

    const formattedInvoices = invoices.data.map((inv) => ({
      _id: inv.id,
      number: inv.number,
      date: new Date(inv.created * 1000),
      amount: inv.total / 100, // Show total amount (even if not paid)
      status: inv.status, // paid, open, void, uncollectible, draft
      url: inv.hosted_invoice_url,
      periodStart: new Date(inv.period_start * 1000),
      periodEnd: new Date(inv.period_end * 1000),
    }));

    res.json({
      ...user.toObject(),
      paymentMethods: formattedPaymentMethods,
      invoices: formattedInvoices,
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
};
