const axios = require('axios');
const crypto = require('crypto');

/**
 * Service to handle outgoing real-time transfers (Payouts/Disbursements) via Raast or other providers.
 */
class PayoutService {
  constructor() {
    this.merchantId = process.env.RAAST_MERCHANT_ID || '';
    this.payoutKey = process.env.RAAST_PAYOUT_KEY || ''; // Specific key for payouts
    this.secretKey = process.env.RAAST_SECRET_KEY || '';
    this.apiUrl =
      process.env.RAAST_PAYOUT_URL || process.env.RAAST_API_URL || '';
  }

  /**
   * Generates signature for payout requests
   */
  _generateSignature(payload) {
    if (!this.secretKey) return '';
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  /**
   * Initiates a real-time payout to a bank account or wallet.
   * @param {Object} transferDetails - Includes bankCode, accountIdentifier, accountTitle, amount, reference
   * @returns {Object} Result of the transfer
   */
  async sendTransfer(transferDetails) {
    try {
      if (!this.payoutKey || !this.apiUrl) {
        // Return mock success in sandbox/dev if no payout keys are configured
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            'Payout credentials missing; returning mock success in development.',
          );
          return {
            success: true,
            status: 'Pending', // Payouts usually take a moment or need webhook
            transactionId: `TXN-MOCK-${Date.now()}`,
            message: 'Mock payout initiated successfully',
          };
        }
        throw new Error('Payout service credentials not configured.');
      }

      const payload = {
        merchant_id: this.merchantId,
        beneficiary_iban: transferDetails.accountIdentifier, // Alfalah usually requires IBAN for payouts
        beneficiary_name: transferDetails.accountTitle,
        beneficiary_bank_code: transferDetails.bankCode,
        amount: transferDetails.amount.toString(),
        purpose_code: '01', // Standard code for funds transfer
        order_id: transferDetails.reference,
      };

      const signature = this._generateSignature(payload);

      const response = await axios.post(`${this.apiUrl}/payout`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Alfalah-Client-Id': process.env.ALFALAH_CLIENT_ID,
          'X-Alfalah-Client-Secret': process.env.ALFALAH_CLIENT_SECRET,
          'X-Signature': signature,
        },
      });

      return {
        success: true,
        status: response.data?.status || 'Processing',
        transactionId: response.data?.payout_id,
        message: response.data?.message || 'Payout initiated',
      };
    } catch (error) {
      console.error('Payout API Error:', error.response?.data || error.message);
      throw new Error(
        error.response?.data?.message || 'Failed to initiate real transfer',
      );
    }
  }

  /**
   * Fetches the Account Holder Name (Title Fetch) for a given IBAN/Account from Bank Alfalah.
   * @param {String} bankCode - Provider code (e.g., 'meezan', 'hbl')
   * @param {String} accountIdentifier - The IBAN or account number
   * @returns {Object} { accountTitle: string, bankCode: string, isVerified: boolean }
   */
  async resolveAccountTitle(bankCode, accountIdentifier) {
    try {
      if (!this.payoutKey || !this.apiUrl) {
        // Return mock data for Sandbox/Dev if no credentials exist
        if (process.env.NODE_ENV !== 'production') {
          console.log(
            `[Mock Title Fetch] Resolving ${accountIdentifier} at ${bankCode}`,
          );
          // Simulate latency
          await new Promise((resolve) => setTimeout(resolve, 800));
          return {
            success: true,
            accountTitle: 'JOHN DOE MOCK',
            bankCode,
            isVerified: true,
          };
        }
        throw new Error('Payout service credentials not configured.');
      }

      // Bank Alfalah Title Fetch Payload Example
      const payload = {
        merchant_id: this.merchantId,
        beneficiary_bank_code: bankCode,
        beneficiary_account: accountIdentifier,
      };

      const signature = this._generateSignature(payload);

      // We assume /title-fetch is the endpoint; adjust based on actual Alfalah specs
      const response = await axios.post(`${this.apiUrl}/title-fetch`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Alfalah-Client-Id': process.env.ALFALAH_CLIENT_ID,
          'X-Alfalah-Client-Secret': process.env.ALFALAH_CLIENT_SECRET,
          'X-Signature': signature,
        },
      });

      return {
        success: true,
        accountTitle: response.data?.account_title || 'UNKNOWN ACCOUNT',
        bankCode: response.data?.bank_code || bankCode,
        isVerified: !!response.data?.account_title,
      };
    } catch (error) {
      console.error(
        'Title Fetch Error:',
        error.response?.data || error.message,
      );
      throw new Error(
        error.response?.data?.message || 'Failed to fetch account title',
      );
    }
  }
}

module.exports = new PayoutService();
