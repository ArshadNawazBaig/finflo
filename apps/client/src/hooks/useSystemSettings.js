import { useState, useEffect } from 'react';
import api from '@/lib/axios';

const useSystemSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      try {
        setLoading(true);
        console.log('[useSystemSettings] Fetching system settings...');
        const { data } = await api.get(`/system-settings?t=${Date.now()}`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        console.log('[useSystemSettings] System settings loaded:', !!data);
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
