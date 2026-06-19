import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/axios';
import { toast } from 'sonner';

/**
 * Standardizes the GET-on-mount fetch lifecycle that most read pages hand-roll
 * (`useState` for data/loading/error + a `useEffect` that calls the API).
 *
 * Beyond removing boilerplate it fixes a real bug class: each request runs
 * under an AbortController that is cancelled on unmount, on a `url`/`params`
 * change, and before every `refetch()`. Without this, a slow earlier response
 * can resolve *after* a newer one and clobber the UI with stale data — a race
 * that bites on fast navigation / rapid filter changes.
 *
 * It is deliberately scoped to simple GET reads. Paginated list pages with
 * search + sort + infinite-scroll append keep their bespoke `useCallback`
 * fetchers — forcing them through this hook would be a worse fit, not a better
 * one.
 *
 * @param {string|null} url            request path; pass null/'' to skip
 * @param {object}      [options]
 * @param {boolean}     [options.immediate=true]      fetch on mount
 * @param {object}      [options.params]              axios query params
 * @param {boolean}     [options.showErrorToast=true] toast on error
 * @param {string}      [options.errorMessage]        fallback toast text
 * @param {(data:any)=>void} [options.onSuccess]      called with response.data
 * @param {(data:any)=>any}  [options.select]         map response → state shape
 * @returns {{ data:any, loading:boolean, error:any, refetch:()=>Promise<any>, setData:Function }}
 */
const useApi = (url, options = {}) => {
  const {
    immediate = true,
    params,
    showErrorToast = true,
    errorMessage = 'Failed to load data',
    onSuccess,
    select,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  // Latest callbacks live in refs so refetch keeps a stable identity (a caller
  // can pass inline onSuccess/select without re-triggering the effect).
  const onSuccessRef = useRef(onSuccess);
  const selectRef = useRef(select);
  onSuccessRef.current = onSuccess;
  selectRef.current = select;

  // Serialize params so the effect re-runs on value change, not on the fresh
  // object identity a parent produces every render.
  const paramsKey = params ? JSON.stringify(params) : '';
  const abortRef = useRef(null);

  const refetch = useCallback(async () => {
    if (!url) return undefined;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(url, { params, signal: controller.signal });
      if (controller.signal.aborted) return undefined;
      const value = selectRef.current ? selectRef.current(res.data) : res.data;
      setData(value);
      onSuccessRef.current?.(res.data);
      return value;
    } catch (err) {
      // Aborted requests are not errors — a newer request superseded this one.
      if (
        controller.signal.aborted ||
        err.code === 'ERR_CANCELED' ||
        err.name === 'CanceledError'
      ) {
        return undefined;
      }
      setError(err);
      if (showErrorToast) {
        toast.error(err.response?.data?.message || errorMessage);
      }
      return undefined;
    } finally {
      // Skip when superseded/unmounted: the newer request owns the loading flag.
      if (!controller.signal.aborted) setLoading(false);
    }
    // params is intentionally tracked via paramsKey (stable across identity).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, paramsKey, showErrorToast, errorMessage]);

  useEffect(() => {
    if (immediate) refetch();
    return () => abortRef.current?.abort();
  }, [immediate, refetch]);

  return { data, loading, error, refetch, setData };
};

export default useApi;
