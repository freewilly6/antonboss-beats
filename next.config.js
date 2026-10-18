// next.config.js
//
// Next resolves a single config file, preferring .js over .mjs — the old
// next.config.mjs was silently dead, which is why reactStrictMode never applied.
// Both are merged here.

/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,

  images: {
    remotePatterns: [
      // Public bucket (beat-previews): new cover art.
      { protocol: 'https', hostname: 'cdn.antonboss.com', pathname: '/**' },
      {
        protocol: 'https',
        hostname: 'spoezjwulzrwqcbokrsx.supabase.co',
        pathname: '/storage/**',
      },
    ],
  },

  // The store collapsed into one scrolling page. Old routes are indexed and
  // linked, so forward them to their sections rather than 404ing.
  async redirects() {
    return [
      // /beats is the compact list view now (pages/beats.js).
      // Downloads live in the account library, served by /api/downloads.
      { source: '/downloads', destination: '/account?tab=library', permanent: false },
      { source: '/beats/:beatId', destination: '/#beat-:beatId', permanent: true },
      { source: '/about', destination: '/#about', permanent: true },
      // There is no contact section any more — the footer carries the mailto.
      { source: '/contact', destination: '/', permanent: true },
    ];
  },
};
