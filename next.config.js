// next.config.js
module.exports = {
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'spoezjwulzrwqcbokrsx.supabase.co',
          pathname: '/storage/**',
        },
      ],
    },
  };
