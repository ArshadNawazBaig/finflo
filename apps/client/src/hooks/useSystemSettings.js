import { useState, useEffect } from 'react';
import api from '@/lib/axios';

// Module-level cache shared across all hook instances — avoids blocking
// the entire app on every cold load with a new DB round-trip.
let _cachedSettings = null;
let _cacheExpiresAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const useSystemSettings = () => {
  const [settings, setSettings] = useState(() => {
    // Immediately seed from cache if fresh — prevents spinner on nav
    if (_cachedSettings && Date.now() < _cacheExpiresAt) {
      return _cachedSettings;
    }
    return null;
  });
  const [loading, setLoading] = useState(() => {
    // If cache is warm, we don't need to show loader at all
    return !(_cachedSettings && Date.now() < _cacheExpiresAt);
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    // Cache is still fresh — no fetch needed
    if (_cachedSettings && Date.now() < _cacheExpiresAt) {
      return;
    }

    const fetchSettings = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      try {
        setLoading(true);
        const { data } = await api.get('/system-settings', {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        _cachedSettings = data;
        _cacheExpiresAt = Date.now() + CACHE_TTL_MS;
        setSettings(data);
      } catch (err) {
        if (err.name === 'AbortError' || err.code === 'ECONNABORTED') {
          console.error('[useSystemSettings] Fetch timed out after 10s');
        } else {
          console.error('[useSystemSettings] Failed to fetch system settings:', err);
        }
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const getPlanSettings = (planName) => {
    if (!settings || !settings.subscriptionPlans) return null;
    return settings.subscriptionPlans.find(
      (p) => p.name.toLowerCase() === planName.toLowerCase(),
    );
  };

  const getLimit = (planName, limitField) => {
    const plan = getPlanSettings(planName);
    if (!plan || !plan.limits) return 10; // Default fallback
    const val = plan.limits[limitField];
    return val === -1 ? Infinity : val;
  };

  return {
    settings,
    loading,
    error,
    getPlanSettings,
    getLimit,
  };
};

export default useSystemSettings;
