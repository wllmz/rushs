// A fixed time zone: the server (UTC in production) and the browser must print the same day,
// or a date rendered in a Client Component fails hydration around midnight
const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "Europe/Paris" });

export function formatDate(iso: string) {
  return dateFormat.format(new Date(iso));
}
