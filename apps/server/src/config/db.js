const mongoose = require('mongoose');

// ── Global aggregation timeout ───────────────────────────────────────────────
// Cap every aggregation pipeline at 30s so a heavy or pathological report query
// (P&L, balance sheet, dashboard rollups) can't pin a mongod thread or block the
// event loop indefinitely. Registered as a global plugin here because db.js is
// required near the top of index.js — ahead of the services/models — so every
// schema compiled afterwards inherits the hook. Callers may still override by
// setting their own maxTimeMS on the aggregate.
mongoose.plugin((schema) => {
  schema.pre('aggregate', function setAggregateTimeout() {
    if (this.options.maxTimeMS == null) {
      this.options.maxTimeMS = 30000;
    }
  });
});

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    throw error; // Essential for the middleware to catch it
  }
};

module.exports = connectDB;
