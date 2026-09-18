export function formatImgUrl(path: string | null | undefined): string {
  if (!path) return "/images/placeholder.webp";
  if (path.startsWith('http')) return path;

  const storageBase = process.env.NEXT_PUBLIC_STORAGE_URL || process.env.STORAGE_URL || "";
  return `${storageBase}/${path.replace(/^\/+/, "")}`;
}