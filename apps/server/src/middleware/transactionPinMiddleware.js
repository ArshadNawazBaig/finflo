const jwt = require('jsonwebtoken');

/**
 * Middleware that requires a valid transaction PIN token.
 * The token is sent in the `x-transaction-token` header.
 * It's issued by the verifyTransactionPin endpoint and is valid for 5 minutes.
 */
const requireTransactionPin = (req, res, next) => {
  // Admin/Manager bypass — business-side users don't need member PIN
  if (req.user && !req.member) {
    console.log('[PIN Middleware] Admin bypass — skipping PIN check');
    return next();
  }

  const token = req.headers['x-transaction-token'];
  console.log('[PIN Middleware] Token present:', !!token, 'Member:', req.member?._id?.toString());

  if (!token) {
    console.log('[PIN Middleware] REJECTED — No token');
    return res.status(403).json({
      message: 'Transaction PIN verification required.',
      code: 'PIN_REQUIRED',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('[PIN Middleware] Token decoded:', { id: decoded.id, type: decoded.type });

    if (decoded.type !== 'transaction_pin') {
      console.log('[PIN Middleware] REJECTED — Wrong token type:', decoded.type);
      return res.status(403).json({
        message: 'Invalid transaction token.',
        code: 'PIN_REQUIRED',
      });
    }

    // Verify the token belongs to the requesting member
    const memberId = req.member?._id?.toString();
    if (memberId && decoded.id !== memberId) {
      console.log('[PIN Middleware] REJECTED — Token mismatch. Token:', decoded.id, 'Member:', memberId);
      return res.status(403).json({
        message: 'Transaction token mismatch.',
        code: 'PIN_REQUIRED',
      });
    }

    console.log('[PIN Middleware] PASSED — Token valid');
    next();
  } catch (error) {
    console.log('[PIN Middleware] REJECTED — Error:', error.name, error.message);
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
