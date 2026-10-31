export const APP_URL = 'https://www.occanova.com/app';
const APP_ORIGIN = 'https://www.occanova.com';

export function navigationKind(url: string): 'web' | 'external' | 'blocked' {
  if (/^https:\/\//i.test(url) || url === 'about:blank' || /^blob:/i.test(url)) {
    return 'web';
  }
  if (/^(mailto|tel|sms|upi|whatsapp|market|intent):/i.test(url) || /^http:\/\//i.test(url)) {
    return 'external';
  }
  return 'blocked';
}

export function popupKind(url: string): 'internal' | 'external' {
  return url === APP_ORIGIN || url.startsWith(`${APP_ORIGIN}/`) ? 'internal' : 'external';
}
