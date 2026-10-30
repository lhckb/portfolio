// The site lives under /portfolio/, so every internal path goes through here.
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export function withBase(path = ''): string {
  return `${base}/${path.replace(/^\//, '')}`;
}
