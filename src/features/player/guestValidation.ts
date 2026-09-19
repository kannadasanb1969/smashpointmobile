export type DobError = 'required' | 'format' | 'calendar' | 'future';
export function validateGuestDob(value: string): DobError | null {
  const v = value.trim();
  if (!v) return 'required';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'format';
  const [year, month, day] = v.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return 'calendar';
  if (date.getTime() > Date.now()) return 'future';
  return null;
}
export function guestDobMessage(error: DobError | null) {
  return error === 'required'
    ? 'Date of birth is required'
    : error === 'future'
      ? 'Date of birth cannot be in the future'
      : error
        ? 'Enter a valid date of birth'
        : null;
}
