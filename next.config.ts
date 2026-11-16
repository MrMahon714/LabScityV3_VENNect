import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
    images: {
    remotePatterns: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? (() => {
          const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
          return [
            {
              protocol: url.protocol.replace(":", "") as "http" | "https",
              hostname: url.hostname,
              port: url.port || undefined,
              pathname: "/**",
            },
          ];
        })()
      : [],
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
  },
};

export default nextConfig;
