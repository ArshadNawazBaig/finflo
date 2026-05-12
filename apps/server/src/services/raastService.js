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
        terminal_id: process.env.ALFALAH_TERMINAL_ID || '001',
        order_reference: orderId,
        amount: amount.toString(),
        expiry_minutes: 60,
      };

      const signature = this._generateSignature(payload);

      const response = await axios.post(`${this.apiUrl}/generate-qr`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Alfalah-Client-Id': process.env.ALFALAH_CLIENT_ID,
          'X-Alfalah-Client-Secret': process.env.ALFALAH_CLIENT_SECRET,
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
    // SECURITY: Always require a configured secret AND a signature header.
    // Previously this returned `true` when secretKey was unset (any non-prod
    // env), which let anyone reaching the endpoint forge `status: PAID` and
    // credit any investment. There is no scenario where bypassing webhook
    // signature verification is safe — a missing secret is a misconfiguration
    // and must fail closed.
    if (!this.secretKey || !signatureHeader) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');

    // Constant-time comparison defeats timing side channels.
    const a = Buffer.from(expectedSignature, 'hex');
    const b = Buffer.from(String(signatureHeader), 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }
}

module.exports = new RaastService();
