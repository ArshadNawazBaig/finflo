import { useState, useEffect } from 'react';

/**
 * Returns a debounced copy of `value` that only updates after `delay` ms have
 * passed with no further change. Use it to drive expensive work (e.g. a backend
 * search request) off a fast-changing input without firing on every keystroke:
 * bind the input to raw state for responsiveness, then key the API call off the
 * debounced value.
 *
 * @param {*}      value         the rapidly-changing value to debounce
 * @param {number} [delay=400]   debounce window in milliseconds
 * @returns {*} the debounced value
 */
const useDebounce = (value, delay = 400) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
};

export default useDebounce;
