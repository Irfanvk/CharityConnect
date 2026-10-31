import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';

const HIGHLIGHT_CLASSES = ['ring-2', 'ring-emerald-500', 'bg-emerald-50'];

/**
 * Scrolls to and highlights the item named in the URL (e.g. ?challan=12) once the
 * list has loaded. If the item cannot be found (deleted, or not visible to this
 * user) it falls back to the list with a toast.
 *
 * @param {Object} options
 * @param {string[]} options.params  Query params that identify an item, in priority order.
 * @param {boolean} options.ready    True once the list data has finished loading.
 * @param {(param: string, value: string) => void} [options.onFound]
 */
export function useDeepLink({ params, ready, onFound }) {
  const [searchParams] = useSearchParams();
  const handledRef = useRef('');

  useEffect(() => {
    if (!ready) return undefined;
    const param = params.find((name) => searchParams.get(name));
    if (!param) return undefined;
    const value = searchParams.get(param);
    const key = `${param}=${value}`;
    if (handledRef.current === key) return undefined;
    handledRef.current = key;

    const selector = `[data-deeplink="${param}-${CSS.escape(value)}"]`;
    const element = document.querySelector(selector);

    if (!element) {
      toast({ title: 'That item is no longer available', description: 'Showing the full list instead.' });
      return undefined;
    }

    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.classList.add(...HIGHLIGHT_CLASSES);
    const timer = window.setTimeout(() => element.classList.remove(...HIGHLIGHT_CLASSES), 4000);
    if (onFound) onFound(param, value);
    return () => window.clearTimeout(timer);
  }, [ready, params, searchParams, onFound]);
}
