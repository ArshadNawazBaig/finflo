const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const Payment = require('../models/Payment');
const { sendEmail } = require('../utils/email');
const {
  superAdminSubscriptionNotificationEmail,
} = require('../utils/emailTemplates');
const Notification = require('../models/Notification');

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

          // Notify User
          try {
            const Notification = require('../models/Notification');
            await new Notification({
              recipient: updatedUser._id,
              recipientModel: 'User',
              title: 'Subscription Activated',
              message: `Your ${plan} plan is now active! Enjoy your new features.`,
              type: 'success',
              link: '/billing', // Redirect to billing
              action: 'subscription_activated',
            }).save();

            // Notify Super Admin
            try {
              const superAdmin = await User.findOne({ role: 'super_admin' });
              if (superAdmin) {
                // Email Notification
                await sendEmail({
                  to: superAdmin.email,
                  subject: `Subscription Activated: ${updatedUser.name} (${plan})`,
                  html: superAdminSubscriptionNotificationEmail(
                    updatedUser,
                    plan,
                  ),
                });

                // In-App Notification
                await Notification.create({
                  recipient: superAdmin._id,
                  recipientModel: 'User',
                  title: 'New Subscription',
                  message: `${updatedUser.name} has subscribed to the ${plan} plan.`,
                  type: 'success',
                  link: '/super-admin/users',
                });
              }
            } catch (saNotifErr) {
              console.error(
                'Failed to notify super admin of subscription:',
                saNotifErr,
              );
            }
          } catch (notifErr) {
            console.error('Failed to notify user of subscription:', notifErr);
          }
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

          // Create Payment Record
          try {
            await Payment.create({
              user: user._id,
              amount: invoice.amount_paid / 100,
              currency: invoice.currency,
              status: 'succeeded',
              stripeInvoiceId: invoice.id,
              stripePaymentIntentId: invoice.payment_intent,
              description: `Invoice ${invoice.number}`,
              planName: user.plan,
              date: new Date(invoice.created * 1000),
            });
            console.log(`Payment record created for user ${user._id}`);
          } catch (paymentError) {
            console.error('Error creating payment record:', paymentError);
          }
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

          // Notify Super Admin of Plan Update (if not Free)
          if (user.plan !== 'Free') {
            try {
              const superAdmin = await User.findOne({ role: 'super_admin' });
              if (superAdmin) {
                // Email Notification
                await sendEmail({
                  to: superAdmin.email,
                  subject: `Subscription Updated: ${user.name} (${user.plan})`,
                  html: superAdminSubscriptionNotificationEmail(
                    user,
                    user.plan,
                  ),
                });

                // In-App Notification
                await Notification.create({
                  recipient: superAdmin._id,
                  recipientModel: 'User',
                  title: 'Subscription Updated',
                  message: `${user.name}'s plan has been updated to ${user.plan}.`,
                  type: 'info',
                  link: '/super-admin/users',
                });
              }
            } catch (saNotifErr) {
              console.error(
                'Failed to notify super admin of subscription update:',
                saNotifErr,
              );
            }
          }
        } else {
          console.warn(`No user found for Stripe Customer ID: ${customerId}`);
        }
      } catch (error) {
        console.error('Error updating subscription:', error);
      }
      break;
    }

    case 'charge.refunded': {
      const charge = event.data.object;
      console.log('');
      console.log('💰 Processing charge.refunded');
      console.log('Charge ID:', charge.id);
      console.log('Customer ID:', charge.customer);
      console.log('Amount Refunded:', charge.amount_refunded / 100);

      const customerId = charge.customer;

      try {
        const user = await User.findOne({ stripeCustomerId: customerId });
        if (user) {
          console.log(`Found user ${user._id} for refund processing`);

          // Downgrade user to Free plan
          user.plan = 'Free';
          user.subscriptionStatus = 'canceled';
          user.stripeSubscriptionId = null;
          user.nextBillingDate = null;
          await user.save();

          console.log(
            `✅ User ${user._id} downgraded to Free plan due to refund`,
          );

          // Notify User
          try {
            const Notification = require('../models/Notification');
            await new Notification({
              recipient: user._id,
              recipientModel: 'User',
              title: 'Account Downgraded',
              message: `Your account has been downgraded to Free plan following a refund.`,
              type: 'warning',
              link: '/billing',
              action: 'account_downgraded_refund',
            }).save();
          } catch (notifErr) {
            console.error('Failed to notify user of downgrade:', notifErr);
          }

          // Find and update the payment record
          const payment = await Payment.findOne({
            stripePaymentIntentId: charge.payment_intent,
          });

          if (payment) {
            payment.status = 'refunded';
            payment.refundedAt = new Date();
            await payment.save();
            console.log(`✅ Payment record ${payment._id} marked as refunded`);
          } else {
            // Create a refund payment record if original payment not found
            await Payment.create({
              user: user._id,
              amount: -(charge.amount_refunded / 100), // Negative amount for refund
              currency: charge.currency,
              status: 'refunded',
              stripePaymentIntentId: charge.payment_intent,
              description: `Refund for charge ${charge.id}`,
              planName: 'Refund',
              date: new Date(),
              refundedAt: new Date(),
            });
            console.log(
              `✅ Created new refund payment record for user ${user._id}`,
            );
          }
        } else {
          console.warn(
            `⚠️  No user found for Stripe Customer ID: ${customerId}`,
          );
        }
      } catch (error) {
        console.error('❌ Error processing refund:', error);
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

          // Notify User
          try {
            const Notification = require('../models/Notification');
            await new Notification({
              recipient: user._id,
              recipientModel: 'User',
              title: 'Subscription Canceled',
              message: `Your subscription has been canceled and your plan is now Free.`,
              type: 'warning',
              link: '/billing',
              action: 'subscription_canceled',
            }).save();
          } catch (notifErr) {
            console.error('Failed to notify user of cancellation:', notifErr);
          }
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
