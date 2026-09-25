import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Do not announce the framework in every response header.
  poweredByHeader: false,
};

export default nextConfig;
