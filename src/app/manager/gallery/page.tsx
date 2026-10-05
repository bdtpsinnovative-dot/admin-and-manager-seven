// src/app/manager/gallery/page.tsx
import GalleryOriginalClient from "@/components/gallery/GalleryOriginalClient";

export const dynamic = "force-dynamic";

export default function ManagerGalleryPage() {
  return <GalleryOriginalClient backHref="/manager/dashboard" backLabel="กลับแดชบอร์ด Manager" />;
}
