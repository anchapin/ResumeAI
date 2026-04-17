// utils/formatters.ts

/**
 * Cache for Intl.NumberFormat instances.
 * Instantiating Intl.NumberFormat is expensive and doing it repeatedly in render cycles
 * or loops causes measurable performance degradation.
 */
const currencyFormatterCache = new Map<string, Intl.NumberFormat>();

/**
 * Returns a cached currency formatter based on the provided options.
 */
export const getCurrencyFormatter = (
  currency: string,
  minimumFractionDigits?: number,
  maximumFractionDigits?: number,
) => {
  const cacheKey = `${currency}-${minimumFractionDigits ?? 'none'}-${maximumFractionDigits ?? 'none'}`;

  if (!currencyFormatterCache.has(cacheKey)) {
    currencyFormatterCache.set(
      cacheKey,
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits,
        maximumFractionDigits,
      }),
    );
  }

  return currencyFormatterCache.get(cacheKey)!;
};

/**
 * Formats an amount as currency using a cached Intl.NumberFormat instance.
 */
export const formatCurrencyValue = (
  amount: number,
  currency: string = 'USD',
  minimumFractionDigits?: number,
  maximumFractionDigits?: number,
) => {
  return getCurrencyFormatter(currency, minimumFractionDigits, maximumFractionDigits).format(
    amount,
  );
};
