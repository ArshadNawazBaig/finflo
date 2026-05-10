import { useState, useCallback, useRef } from 'react';
import api from '@/lib/axios';

/**
 * Hook that manages transaction PIN verification.
 * Caches a valid token in memory for 5 minutes.
 * Returns helpers to check PIN status, require PIN, and the modal state.
 */
const useTransactionPin = () => {
  const [showPinModal, setShowPinModal] = useState(false);
  const [showSetPinModal, setShowSetPinModal] = useState(false);
  const [pinStatus, setPinStatus] = useState(null); // { hasPinSet }
  const tokenRef = useRef(null);
  const tokenExpiryRef = useRef(null);
  const onSuccessRef = useRef(null);

  const checkPinStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/members/portal/pin-status');
      setPinStatus(data);
      return data;
    } catch {
      return { hasPinSet: false };
    }
  }, []);

  const getValidToken = useCallback(() => {
    if (tokenRef.current && tokenExpiryRef.current && Date.now() < tokenExpiryRef.current) {
      return tokenRef.current;
    }
    tokenRef.current = null;
    tokenExpiryRef.current = null;
    return null;
  }, []);

  const setToken = useCallback((token, expiresIn) => {
    tokenRef.current = token;
    tokenExpiryRef.current = Date.now() + (expiresIn * 1000) - 5000; // 5s buffer
  }, []);

  /**
   * Gate a sensitive action behind PIN verification.
   * If token is cached and valid, calls onSuccess immediately.
   * Otherwise opens the PIN modal.
   */
  const requirePin = useCallback(async (onSuccess) => {
    // Check cached token first
    const existing = getValidToken();
    if (existing) {
      onSuccess(existing);
      return;
    }

    // Check if PIN is set
    const status = await checkPinStatus();
    if (!status.hasPinSet) {
      // Prompt to set PIN first
      onSuccessRef.current = onSuccess;
      setShowSetPinModal(true);
      return;
    }

    onSuccessRef.current = onSuccess;
    setShowPinModal(true);
  }, [getValidToken, checkPinStatus]);

  const onPinVerified = useCallback((token, expiresIn) => {
    setToken(token, expiresIn);
    setShowPinModal(false);
    if (onSuccessRef.current) {
      onSuccessRef.current(token);
      onSuccessRef.current = null;
    }
  }, [setToken]);

  const onPinSet = useCallback(async () => {
    setShowSetPinModal(false);
    setPinStatus({ hasPinSet: true });
    // After setting PIN, open verify modal
    setShowPinModal(true);
  }, []);

  const clearToken = useCallback(() => {
    tokenRef.current = null;
    tokenExpiryRef.current = null;
  }, []);

  return {
    requirePin,
    showPinModal,
    setShowPinModal,
    showSetPinModal,
    setShowSetPinModal,
    onPinVerified,
    onPinSet,
    pinStatus,
    checkPinStatus,
    getValidToken,
    clearToken,
  };
};

export default useTransactionPin;
