// pages/_document.js
import { Html, Head, Main, NextScript } from "next/document";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";

// Inlined at build time. Guarded, since a malformed or absent env var must not
// take the whole document render down.
const origin = (url) => {
  try {
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
};
const SUPABASE_ORIGIN = origin(process.env.NEXT_PUBLIC_SUPABASE_URL);
const R2_ORIGIN = origin(process.env.NEXT_PUBLIC_R2_URL);

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Beats and cover art come from Supabase, audio from R2. Opening the
            TCP + TLS handshakes during head parsing takes that latency off the
            critical path for the first request to each. */}
        {SUPABASE_ORIGIN && (
          <link rel="preconnect" href={SUPABASE_ORIGIN} crossOrigin="anonymous" />
        )}
        {R2_ORIGIN && <link rel="preconnect" href={R2_ORIGIN} crossOrigin="anonymous" />}

        {/* PWA/Web App manifest */}
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#000000" />
        {/* Applies a stored light-mode choice before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />

        {/* Default favicon */}
        <link rel="icon" href="/favicon.ico" />

        {/* Android/Web: icons declared in manifest */}
        {/* (no need to repeat them here) */}

        {/* iOS: Apple touch icons */}
        <link
          rel="apple-touch-icon"
          sizes="192x192"
          href="/favicon-192x192.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="512x512"
          href="/favicon-512x512.png"
        />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
