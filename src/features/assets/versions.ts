// The version shown on the asset page: the one asked for in ?v=, or the latest.
// A missing, malformed or unknown number falls back on the latest instead of a 404:
// an old link keeps working after a version is added.
export function pickVersion<T extends { number: number }>(versions: T[], requested: unknown): T | undefined {
  const latest = versions.reduce<T | undefined>(
    (best, version) => (best && best.number > version.number ? best : version),
    undefined,
  );
  if (typeof requested !== "string" || !/^[1-9]\d*$/.test(requested)) return latest;
  return versions.find((version) => version.number === Number(requested)) ?? latest;
}
