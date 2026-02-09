const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');

const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  console.log('========================================');
  console.log('🔔 WEBHOOK RECEIVED at', new Date().toISOString());
  console.log('========================================');

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
    console.log('✅ Webhook signature verified');
    console.log('📦 Event Type:', event.type);
    console.log('📦 Event ID:', event.id);
  } catch (err) {
    console.error(`❌ Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log('');
      console.log('💳 Processing checkout.session.completed');
      console.log('Session ID:', session.id);
      console.log('Customer ID:', session.customer);
      console.log('Subscription ID:', session.subscription);

      const userId = session.metadata.userId;
      console.log('User ID from metadata:', userId);

      if (userId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription,
          );

          console.log('Retrieved subscription:', {
            id: subscription.id,
            status: subscription.status,
            priceId: subscription.items.data[0].price.id,
          });

          // Determine plan from Price ID in subscription items
          const priceId = subscription.items.data[0].price.id;
          let plan = session.metadata.plan || 'Pro'; // Fallback

          console.log('Price ID comparison:');
          console.log('  Received:', priceId);
          console.log('  Basic:', process.env.STRIPE_PRICE_ID_BASIC);
          console.log('  Pro:', process.env.STRIPE_PRICE_ID_PRO);

          if (priceId === process.env.STRIPE_PRICE_ID_BASIC) {
            plan = 'Basic';
          } else if (priceId === process.env.STRIPE_PRICE_ID_PRO) {
            plan = 'Pro';
          }

          console.log('Determined plan:', plan);

          const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
              subscriptionStatus: 'active',
              plan: plan,
              nextBillingDate: new Date(subscription.current_period_end * 1000),
            },
            { new: true },
          );

          console.log('✅ User updated successfully:', {
            userId: updatedUser._id,
            plan: updatedUser.plan,
            subscriptionStatus: updatedUser.subscriptionStatus,
          });
        } catch (error) {
          console.error('❌ Error updating user from checkout session:', error);
        }
      } else {
        console.warn('⚠️  No userId found in session metadata');
      }
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      const customerId = invoice.customer;

      try {
        const user = await User.findOne({ stripeCustomerId: customerId });
        if (user) {
          // Update next billing date
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription,
          );
          user.nextBillingDate = new Date(
            subscription.current_period_end * 1000,
          );
          user.subscriptionStatus = 'active';

          // Add invoice to history
          user.invoices.unshift({
            id: invoice.number,
            date: new Date(invoice.created * 1000),
            amount: invoice.amount_paid / 100,
            status: 'Paid',
            url: invoice.hosted_invoice_url,
          });

          await user.save();
          console.log(`Invoice paid for user ${user._id}`);
        }
      } catch (error) {
        console.error('Error handling invoice payment:', error);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      console.log(
        'Processing customer.subscription.updated for subscription:',
        subscription.id,
      );
      const customerId = subscription.customer;

      try {
        const user = await User.findOne({ stripeCustomerId: customerId });
        if (user) {
          console.log(`Found user ${user._id} for customer ${customerId}`);
          user.subscriptionStatus = subscription.status;
          user.stripeSubscriptionId = subscription.id;
          user.nextBillingDate = new Date(
            subscription.current_period_end * 1000,
          );

          // Sync Plan based on Price ID
          if (subscription.items && subscription.items.data.length > 0) {
            const priceId = subscription.items.data[0].price.id;
            console.log(`Subscription Price ID: ${priceId}`);

            if (priceId === process.env.STRIPE_PRICE_ID_BASIC) {
              user.plan = 'Basic';
            } else if (priceId === process.env.STRIPE_PRICE_ID_PRO) {
              user.plan = 'Pro';
            } else {
              console.warn(
                `Unknown Price ID: ${priceId}. Expected Basic: ${process.env.STRIPE_PRICE_ID_BASIC}, Pro: ${process.env.STRIPE_PRICE_ID_PRO}`,
              );
            }
          }

          // If status is active but plan is Free/Unknown, force Pro (safeguard)
          if (user.subscriptionStatus === 'active' && user.plan === 'Free') {
            console.warn(
              'User status active but plan is Free. Forcing adjustment.',
            );
            // This is a backup. Ideally price ID logic above handles it.
            // We won't force 'Pro' blindly to avoid giving free upgrades if logic failed.
            // But if we are sure it's an upgrade event... let's stick to the Price ID logic.
          }

          await user.save();
          console.log(
            `Subscription updated for user ${user._id}. Current Plan: ${user.plan}, Status: ${user.subscriptionStatus}`,
          );
        } else {
          console.warn(`No user found for Stripe Customer ID: ${customerId}`);
        }
      } catch (error) {
        console.error('Error updating subscription:', error);
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const customerId = subscription.customer;

      try {
        const user = await User.findOne({ stripeCustomerId: customerId });
        if (user) {
          user.subscriptionStatus = 'canceled';
          user.plan = 'Free';
          user.stripeSubscriptionId = null;
          await user.save();
          console.log(`Subscription canceled for user ${user._id}`);
        }
      } catch (error) {
        console.error('Error cancelling subscription:', error);
      }
      break;
    }

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.send();
};

module.exports = { handleWebhook };
