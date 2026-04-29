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
