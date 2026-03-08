const axios = require('axios');
const crypto = require('crypto');

/**
 * A generic Raast Service that can be adapted for any Pakistani issuing bank (Meezan, Alfalah, HBL, etc.)
 * Provides methods for generating P2M QR codes / Pay Intents, and verifying incoming Webhooks.
 */
class RaastService {
  constructor() {
    this.merchantId = process.env.RAAST_MERCHANT_ID || '';
    this.accessKey = process.env.RAAST_ACCESS_KEY || '';
    this.secretKey = process.env.RAAST_SECRET_KEY || '';
    this.apiUrl =
      process.env.RAAST_API_URL || 'https://sandbox.raast.provider.com/api';
  }

  /**
   * Helper to generate HMAC SHA256 signature commonly used by Banks
   */
  _generateSignature(payload) {
    if (!this.secretKey) return '';
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  /**
   * Generates a dynamic Raast QR Code / Intent for a specific deposit amount and tracking reference.
   * @param {Number} amount - The deposit amount in PKR
   * @param {String} orderId - A unique tracking ID (e.g., Investment ID)
   * @returns {Object} Resolves to the QR string or intent URL
   */
  async generateDynamicQR(amount, orderId) {
    try {
      if (!this.merchantId || !this.apiUrl) {
        console.warn(
          'Raast credentials missing; returning mock QR for development mode.',
        );
        return {
          success: true,
          qrCode: `raast.mock://p2m?merchant=${this.merchantId}&amount=${amount}&ref=${orderId}`,
          intentUrl: `https://mock.bank.com/raast-checkout?ref=${orderId}`,
          expiresIn: 3600, // 1 hour
        };
      }

      const payload = {
        merchant_id: this.merchantId,
        order_reference: orderId,
        amount: amount.toString(),
        expiry_minutes: 60,
      };

      const signature = this._generateSignature(payload);

      const response = await axios.post(`${this.apiUrl}/generate-qr`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Access-Key': this.accessKey,
          'X-Signature': signature,
        },
      });

      return {
        success: true,
        qrCode: response.data?.qr_string,
        intentUrl: response.data?.checkout_url,
        expiresIn: response.data?.expiry_minutes * 60,
      };
    } catch (error) {
      console.error(
        'Raast QR Generation Error:',
        error.response?.data || error.message,
      );
      throw new Error(
        error.response?.data?.message || 'Failed to generate Raast QR',
      );
    }
  }

  /**
   * Verifies an incoming webhook payload from the partner bank.
   * @param {Object} payload - The raw or parsed JSON body
   * @param {String} signatureHeader - The signature header sent by the bank
   * @returns {Boolean} True if signature matches
   */
  verifyWebhook(payload, signatureHeader) {
    if (!this.secretKey) {
      // Allow bypass in local dev if no secret key configured
      return process.env.NODE_ENV !== 'production';
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');

    // Often banks provide a slightly different signature mechanism, adjust here if needed
    return expectedSignature === signatureHeader;
  }
}

module.exports = new RaastService();
