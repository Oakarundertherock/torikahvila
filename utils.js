// Parses a user-typed amount into a plain number.
// Accepts: "4.50", "4,50", "45k", "1.5k", "45 000", "45K", etc.
// Returns null if the input can't be parsed into a valid non-negative number.
function parseCost(raw) {
  let s = raw.trim().toLowerCase();
  s = s.replace(/\s+/g, ''); // drop spaces like "45 000"
  s = s.replace(',', '.');   // Finnish-style decimal comma -> dot

  let multiplier = 1;
  if (s.endsWith('k')) {
    multiplier = 1000;
    s = s.slice(0, -1);
  }

  s = s.replace(/[^0-9.]/g, '');
  if (s === '') return null;

  const value = parseFloat(s);
  if (isNaN(value) || value < 0) return null;

  return value * multiplier;
}

// Formats a number for display.
// Anything 1000 or above is shown as "10k" / "12.3k" style.
// Anything below 1000 is shown as a normal "45.00" style amount.
function formatMoney(amount) {
  if (amount >= 1000) {
    const k = amount / 1000;
    const rounded = Math.round(k * 10) / 10;
    const str = Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1);
    return `${str}k€`;
  }
  return `${amount.toFixed(2)}€`;
}

module.exports = { parseCost, formatMoney };
