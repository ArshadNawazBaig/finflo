const isServerless = () => process.env.VERCEL === '1';
const usePolling = () => isServerless() || process.env.REALTIME_TRANSPORT === 'polling';

module.exports = { isServerless, usePolling };
