const cents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const whole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/**
 * "$4.87", or "$100" with `whole`. Costs are kept to the cent on purpose: at
 * pilot scale a month is a few dollars, and rounding to the dollar would hide
 * it.
 */
export function formatUsd(
  amount: number,
  options: { whole?: boolean } = {},
): string {
  return (options.whole ? whole : cents).format(amount);
}

/** "1,609". */
export function formatCount(count: number): string {
  return count.toLocaleString("en-US");
}
