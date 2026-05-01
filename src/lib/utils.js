import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 

export function formatMemberId(id) {
  if (id === null || id === undefined || id === '') return '';
  const str = String(id).trim();
  const match = str.match(/^(?:MEM-)?(\d+)$/i);
  if (match) return `MEM-${String(parseInt(match[1], 10)).padStart(4, '0')}`;
  return str;
}

export const isIframe = window.self !== window.top;

/**
 * Replace any localhost / 127.0.0.1 origin that a backend may embed in a
 * generated URL or share message with the actual window origin.
 * This ensures invite links, reset links, and WhatsApp messages always
 * contain the correct production domain even when the backend's
 * FRONTEND_URL env variable is set to localhost.
 *
 * Works on raw URL strings and on free-text strings that contain embedded URLs.
 */
export function sanitizeShareUrl(urlOrText) {
  if (!urlOrText || typeof urlOrText !== 'string') return urlOrText;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  if (!origin) return urlOrText;
  return urlOrText
    // Plain form: http(s)://localhost:PORT or http(s)://127.0.0.1:PORT
    .replace(/https?:\/\/localhost:\d+/gi, origin)
    .replace(/https?:\/\/127\.0\.0\.1:\d+/gi, origin)
    // URL-encoded form inside wa.me?text= query strings
    .replace(/https?%3A%2F%2Flocalhost%3A\d+/gi, encodeURIComponent(origin))
    .replace(/https?%3A%2F%2F127\.0\.0\.1%3A\d+/gi, encodeURIComponent(origin));
}
