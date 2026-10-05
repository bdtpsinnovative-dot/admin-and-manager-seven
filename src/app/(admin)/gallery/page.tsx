// src/app/(admin)/gallery/page.tsx
import GalleryOriginalClient from "@/components/gallery/GalleryOriginalClient";

export const dynamic = "force-dynamic";

export default function AdminGalleryPage() {
  return <GalleryOriginalClient backHref="/dashboard" backLabel="กลับแดชบอร์ด Admin" />;
}
