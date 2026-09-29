import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // El Excel del relevamiento se sube por una Server Action (límite por defecto: 1 MB).
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
