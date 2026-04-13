import { SupportedLanguage } from './i18n';

const LOCALE_MAP: Record<SupportedLanguage, string> = {
  en: 'en-CA',
  fr: 'fr-CA',
};

export const formatDate = (
  date: Date | string | number,
  lang: SupportedLanguage,
  options?: Intl.DateTimeFormatOptions
): string => {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(LOCALE_MAP[lang], options || {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
};

export const formatDateShort = (
  date: Date | string | number,
  lang: SupportedLanguage
): string => {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(LOCALE_MAP[lang], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
};

export const formatTime = (
  date: Date | string | number,
  lang: SupportedLanguage
): string => {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(LOCALE_MAP[lang], {
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
};

export const formatDateTime = (
  date: Date | string | number,
  lang: SupportedLanguage
): string => {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(LOCALE_MAP[lang], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
};

export const formatCurrency = (
  amount: number,
  lang: SupportedLanguage,
  currency: string = 'CAD'
): string => {
  return new Intl.NumberFormat(LOCALE_MAP[lang], {
    style: 'currency',
    currency,
  }).format(amount);
};

export const formatNumber = (
  num: number,
  lang: SupportedLanguage
): string => {
  return new Intl.NumberFormat(LOCALE_MAP[lang]).format(num);
};

export const formatPercent = (
  num: number,
  lang: SupportedLanguage
): string => {
  return new Intl.NumberFormat(LOCALE_MAP[lang], {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
};

export const formatRelativeTime = (
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  lang: SupportedLanguage
): string => {
  return new Intl.RelativeTimeFormat(LOCALE_MAP[lang], {
    numeric: 'auto',
  }).format(value, unit);
};
