// pages/_document.js
import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* PWA/Web App manifest */}
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#000000" />

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
