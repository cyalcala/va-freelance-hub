/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@va-hub/db", "@va-hub/scraper"],
  experimental: {
    serverComponentsExternalPackages: ["@libsql/client"],
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
