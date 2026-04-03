/**
 * ⚡ Bolt Performance Optimization
 * Instantiating `Intl.NumberFormat` is a known performance bottleneck in JS.
 * By caching and reusing formatter instances, we avoid repetitive instantiation
 * overhead during render cycles (especially in loops like invoices or offers).
 *
 * Expected Impact: Reduces formatting execution time significantly (often by ~10x)
 * per format call, leading to fewer dropped frames when rendering large data lists.
 */
const formatters: Record<string, Intl.NumberFormat> = {};

export const formatCurrency = (amount: number, currency: string = 'USD', preserveDecimals: boolean = false): string => {
  const cacheKey = `${currency}-${preserveDecimals ? 'dec' : 'nodec'}`;
  if (!formatters[cacheKey]) {
    formatters[cacheKey] = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      ...(preserveDecimals ? {} : { minimumFractionDigits: 0, maximumFractionDigits: 0 }),
    });
  }
  return formatters[cacheKey].format(amount);
};
