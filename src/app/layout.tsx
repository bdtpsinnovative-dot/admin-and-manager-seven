// src/app/layout.tsx
import "./globals.css"; 
import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      {/* เพิ่ม suppressHydrationWarning เพื่อบอก React ว่า 
          ไม่ต้องตกใจถ้ามี Extension มาเติมค่าใน body */}
      <body
        className="font-sans"
        style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" }}
        suppressHydrationWarning
      >
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}