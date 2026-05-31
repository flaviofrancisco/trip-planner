export interface CurrencyOption {
  code: string;
  label: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'EUR', label: 'Euro' },
  { code: 'USD', label: 'US Dollar' },
  { code: 'GBP', label: 'British Pound' },
  { code: 'JPY', label: 'Japanese Yen' },
  { code: 'CHF', label: 'Swiss Franc' },
  { code: 'CAD', label: 'Canadian Dollar' },
  { code: 'AUD', label: 'Australian Dollar' },
  { code: 'NZD', label: 'New Zealand Dollar' },
  { code: 'CNY', label: 'Chinese Yuan' },
  { code: 'HKD', label: 'Hong Kong Dollar' },
  { code: 'SGD', label: 'Singapore Dollar' },
  { code: 'KRW', label: 'South Korean Won' },
  { code: 'INR', label: 'Indian Rupee' },
  { code: 'THB', label: 'Thai Baht' },
  { code: 'AED', label: 'UAE Dirham' },
  { code: 'BRL', label: 'Brazilian Real' },
  { code: 'MXN', label: 'Mexican Peso' },
  { code: 'ARS', label: 'Argentine Peso' },
  { code: 'SEK', label: 'Swedish Krona' },
  { code: 'NOK', label: 'Norwegian Krone' },
  { code: 'DKK', label: 'Danish Krone' },
  { code: 'PLN', label: 'Polish Złoty' },
  { code: 'CZK', label: 'Czech Koruna' },
  { code: 'ZAR', label: 'South African Rand' },
  { code: 'TRY', label: 'Turkish Lira' },
];

/** Locale-aware money formatter. Falls back to "CODE 1234.56" for unknown codes. */
export function formatMoney(amount: number, currency: string = 'EUR'): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
    }).format(amount || 0);
  } catch {
    return `${currency} ${(amount || 0).toFixed(2)}`;
  }
}

/** Just the currency symbol, e.g. "€", "$", "¥". Falls back to the code. */
export function currencySymbol(currency: string = 'EUR'): string {
  try {
    const part = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    })
      .formatToParts(0)
      .find((p) => p.type === 'currency');
    return part?.value || currency;
  } catch {
    return currency;
  }
}
