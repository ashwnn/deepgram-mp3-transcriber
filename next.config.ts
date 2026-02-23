import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isProd ? "/deepgram-mp3-transcriber" : "",
  assetPrefix: isProd ? "/deepgram-mp3-transcriber/" : "",
  images: {
    unoptimized: true
  }
};

export default nextConfig;
