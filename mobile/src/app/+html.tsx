import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

const DESCRIPTION = "Uma lição de vinte minutos por dia.";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt">
      <head>
        <title>Prosa</title>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="description" content={DESCRIPTION} />
        <meta name="application-name" content="Prosa" />
        <meta name="apple-mobile-web-app-title" content="Prosa" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#FFF8F1" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Prosa" />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:image" content="/og.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Prosa" />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content="/og.png" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
