const jwt = require('jsonwebtoken');

/**
 * Middleware that requires a valid transaction PIN token.
 * The token is sent in the `x-transaction-token` header.
 * It's issued by the verifyTransactionPin endpoint and is valid for 5 minutes.
 */
const requireTransactionPin = (req, res, next) => {
  const token = req.headers['x-transaction-token'];

  if (!token) {
    return res.status(403).json({
      message: 'Transaction PIN verification required.',
      code: 'PIN_REQUIRED',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'transaction_pin') {
      return res.status(403).json({
        message: 'Invalid transaction token.',
        code: 'PIN_REQUIRED',
      });
    }

    // Verify the token belongs to the requesting member
    const memberId = req.member?._id?.toString();
    if (memberId && decoded.id !== memberId) {
      return res.status(403).json({
        message: 'Transaction token mismatch.',
        code: 'PIN_REQUIRED',
      });
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({
        message: 'Transaction PIN verification expired. Please re-enter your PIN.',
        code: 'PIN_EXPIRED',
      });
    }
    return res.status(403).json({
      message: 'Invalid transaction token.',
      code: 'PIN_REQUIRED',
    });
  }
};

module.exports = { requireTransactionPin };
