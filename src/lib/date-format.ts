export function formatWeddingDateLabel(value: Date | string | null | undefined, uppercase = false) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const label = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);

  const formatted = label.charAt(0).toUpperCase() + label.slice(1);
  return uppercase ? formatted.toUpperCase() : formatted;
}
