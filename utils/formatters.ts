/**
 * ⚡ Bolt Optimization:
 * Repeatedly instantiating Intl.NumberFormat is an expensive operation that can cause
 * noticeable lag during React renders, especially in lists or loops.
 *
 * We cache the formatter instances based on currency and fraction digits.
 * This prevents unnecessary instantiations and speeds up formatting operations.
 */
const currencyFormattersCache: Record<string, Intl.NumberFormat> = {};

export const formatCurrency = (
  amount: number,
  currency: string = 'USD',
  isCents: boolean = false,
  minFrac: number = 0,
  maxFrac: number = 0
) => {
  const cacheKey = `${currency}-${minFrac}-${maxFrac}`;

  if (!currencyFormattersCache[cacheKey]) {
    currencyFormattersCache[cacheKey] = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: minFrac,
      maximumFractionDigits: maxFrac,
    });
  }

  const finalAmount = isCents ? amount / 100 : amount;
  return currencyFormattersCache[cacheKey].format(finalAmount);
};
