import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* การตั้งค่ารูปภาพเดิมของนาย */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zexflchjcycxrpjkuews.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  serverExternalPackages: ["@xenova/transformers", "sharp", "onnxruntime-node"],

  /* ✅ เพิ่มส่วนนี้เพื่อแก้ Error: Body exceeded 1 MB limit */
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // นายปรับเพิ่มได้ตามความเหมาะสม (เช่น '20mb', '50mb')
    },
  },
};

export default nextConfig;