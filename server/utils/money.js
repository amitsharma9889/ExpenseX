export function rupeesToPaise(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/^(\d{1,8})(?:\.(\d{1,2}))?$/);

  if (!match) {
    return null;
  }

  const rupees = Number(match[1]);
  const paise = Number((match[2] || "").padEnd(2, "0"));
  const totalPaise = rupees * 100 + paise;

  return Number.isSafeInteger(totalPaise) && totalPaise > 0
    ? totalPaise
    : null;
}
