/**
 * Utility for formatting currency.
 * Caches Intl.NumberFormat instances to prevent repeated instantiation
 * which can be a performance bottleneck during rendering.
 */

const formatterCache = new Map<string, Intl.NumberFormat>();

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  const cacheKey = `${currency}-0-0`; // currency-minFraction-maxFraction

  let formatter = formatterCache.get(cacheKey);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    formatterCache.set(cacheKey, formatter);
  }

  return formatter.format(amount);
};
