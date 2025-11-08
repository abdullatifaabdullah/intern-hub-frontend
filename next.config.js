/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Enable standalone output for Docker
  async headers() {
    // Get API URL from environment or use default
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v2';
    // Extract base URL (remove /api/v2)
    let baseUrl = apiUrl.replace('/api/v2', '');
    // Determine if we're in production
    const isProduction = baseUrl.includes('internhubapi.sadn.site') || baseUrl.includes('internhub.sadn.site');
    
    // Force HTTPS for production URLs in CSP
    if (isProduction && baseUrl.startsWith('http://')) {
      baseUrl = baseUrl.replace('http://', 'https://');
    }
    
    // Build CSP connect-src with appropriate URLs
    // Frontend: internhub.sadn.site, Backend API: internhubapi.sadn.site
    // Allow both HTTP and HTTPS to make it work (will be upgraded to HTTPS by browser/Cloudflare)
    const connectSrc = isProduction
      ? `'self' https://internhubapi.sadn.site http://internhubapi.sadn.site https://internhub.sadn.site http://internhub.sadn.site https://static.cloudflareinsights.com ws://internhub.sadn.site wss://internhub.sadn.site wss://internhubapi.sadn.site`
      : `'self' http://localhost:8000 http://127.0.0.1:8000 ws://localhost:3000 ws://127.0.0.1:3000`;
    
    // Build CSP script-src - allow Cloudflare Insights
    const scriptSrc = isProduction
      ? "'self' 'unsafe-eval' 'unsafe-inline' https://static.cloudflareinsights.com"
      : "'self' 'unsafe-eval' 'unsafe-inline'";
    
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `connect-src ${connectSrc}`,
              `script-src ${scriptSrc}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
            ].join('; '),
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig





