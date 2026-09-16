import type { NextConfig } from "next";
import os from "os";

// ดึง IPv4 ทั้งหมดของเครื่องเพื่อให้อนุญาตการเข้าใช้งานผ่าน IP LAN ได้อัตโนมัติ
const getLocalIpAddresses = (): string[] => {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = ["192.168.9.77", "localhost", "127.0.0.1"];
  Object.values(interfaces).forEach((netList) => {
    netList?.forEach((net) => {
      if (net.family === "IPv4" || (net.family as unknown) === 4) {
        if (!addresses.includes(net.address)) {
          addresses.push(net.address);
        }
      }
    });
  });
  return addresses;
};

const localIps = getLocalIpAddresses();
const allowedOriginsWithPorts = [
  ...localIps.map(ip => `${ip}:3000`),
  ...localIps,
  "localhost:3000",
  "127.0.0.1:3000"
];

const nextConfig: NextConfig = {
  /* ✅ อนุญาตให้ Dev Server รับการเชื่อมต่อและส่ง static chunks ข้ามเครื่องผ่าน IP (Next.js 15/16) */
  allowedDevOrigins: localIps,

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

  /* ✅ เพิ่มส่วนนี้เพื่อแก้ Error: Body exceeded 1 MB limit และ Server Actions CSRF */
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // นายปรับเพิ่มได้ตามความเหมาะสม (เช่น '20mb', '50mb')
      allowedOrigins: allowedOriginsWithPorts,
    },
  },
};

export default nextConfig;