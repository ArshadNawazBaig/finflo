const path = require('path');
const fs = require('fs');
// Since this is in apps/server/scripts, we go up two levels to apps/server
const envPath = path.join(__dirname, '../.env');
require('dotenv').config({ path: envPath });

const apiKey = process.env.STRIPE_SECRET_KEY;
if (!apiKey) {
  console.error('STRIPE_SECRET_KEY not found in environment variables.');
  process.exit(1);
}

const stripe = require('stripe')(apiKey);

const getPriceId = async (id) => {
  if (id.startsWith('price_')) return id;
  if (id.startsWith('prod_')) {
    console.log(`Resolving Price ID for Product ${id}...`);
    try {
      const prices = await stripe.prices.list({
        product: id,
        limit: 1,
        active: true,
      });
      if (prices.data.length > 0) {
        console.log(`Found Price ID: ${prices.data[0].id}`);
        return prices.data[0].id;
      } else {
        throw new Error(`No active price found for product ${id}`);
      }
    } catch (err) {
      console.error(`Failed to fetch price for product ${id}:`, err.message);
      throw err;
    }
  }
  throw new Error(`Invalid ID format: ${id}. Must start with price_ or prod_`);
};

const configurePortal = async () => {
  try {
    let priceBasicId = process.env.STRIPE_PRICE_ID_BASIC;
    let priceProId = process.env.STRIPE_PRICE_ID_PRO;

    if (!priceBasicId || !priceProId) {
      console.error(
        'Basic or Pro Price/Product ID not found in environment variables.',
      );
      process.exit(1);
    }

    // Resolve Price IDs if Product IDs were provided
    const resolvedBasicPriceId = await getPriceId(priceBasicId);
    const resolvedProPriceId = await getPriceId(priceProId);

    // Retrieve Price details to get associated Product IDs (to be safe/consistent)
    const [priceBasic, pricePro] = await Promise.all([
      stripe.prices.retrieve(resolvedBasicPriceId),
      stripe.prices.retrieve(resolvedProPriceId),
    ]);

    const productBasicId = priceBasic.product;
    const productProId = pricePro.product;

    console.log(`Basic Product ID: ${productBasicId}`);
    console.log(`Pro Product ID: ${productProId}`);

    // Create a new portal configuration
    const configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: 'Manage your subscription',
      },
      features: {
        subscription_update: {
          enabled: true,
          default_allowed_updates: ['price', 'quantity', 'promotion_code'],
          proration_behavior: 'always_invoice',
          products: [
            {
              product: productBasicId,
              prices: [resolvedBasicPriceId],
            },
            {
              product: productProId,
              prices: [resolvedProPriceId],
            },
          ],
        },
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        customer_update: {
          enabled: true,
          allowed_updates: ['email', 'address', 'phone'],
        },
        subscription_cancel: { enabled: true, mode: 'at_period_end' },
      },
    });

    console.log('Portal Configuration Created Successfully!');
    console.log(`CONFIGURATION_ID=${configuration.id}`);

    // Auto-update .env if IDs changed or Config ID is new
    let envContent = fs.readFileSync(envPath, 'utf8');
    let updated = false;

    // Update Price IDs if they were Product IDs
    if (priceBasicId !== resolvedBasicPriceId) {
      envContent = envContent.replace(priceBasicId, resolvedBasicPriceId);
      updated = true;
    }
    if (priceProId !== resolvedProPriceId) {
      envContent = envContent.replace(priceProId, resolvedProPriceId);
      updated = true;
    }

    // Add or Update Portal Config ID
    if (envContent.includes('STRIPE_PORTAL_CONFIGURATION_ID=')) {
      // Use regex to replace the existing line
      const newLine = `STRIPE_PORTAL_CONFIGURATION_ID=${configuration.id}`;
      if (!envContent.includes(newLine)) {
        envContent = envContent.replace(
          /STRIPE_PORTAL_CONFIGURATION_ID=.*/,
          newLine,
        );
        updated = true;
      }
    } else {
      envContent += `\nSTRIPE_PORTAL_CONFIGURATION_ID=${configuration.id}`;
      updated = true;
    }

    if (updated) {
      fs.writeFileSync(envPath, envContent);
      console.log(
        'Updated .env file with correct Price IDs and Portal Configuration ID.',
      );
    } else {
      console.log('.env file is already up to date.');
    }
  } catch (error) {
    console.error('Error configuring portal:', error);
    process.exit(1);
  }
};

configurePortal();
