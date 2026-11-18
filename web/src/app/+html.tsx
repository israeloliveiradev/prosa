import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

const DESCRIPTION = "Ritual diário de idiomas de 20 minutos com mentores históricos.";

const ANTI_FLASH_SCRIPT = `
  try {
    var root = document.documentElement;
    root.style.backgroundColor = '#FDFBF7';
  } catch (e) {}
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <title>Prosa — Maestria Polímata em 20 Minutos</title>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="description" content={DESCRIPTION} />
        <meta name="theme-color" content="#FDFBF7" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="manifest" href="/site.webmanifest" />

        {/* Fontes Oficiais do Google Stitch: Plus Jakarta Sans, Newsreader */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500&family=Plus+Jakarta+Sans:ital,wght@0,500;0,600;0,700;0,800;1,500;1,600;1,700;1,800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />

        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --color-background: #FDFBF7;
              --color-surface: #FFFFFF;
              --color-surface-raised: #F5F0E8;
              --color-primary: #0D9488;
              --color-primary-dark: #0F766E;
              --color-streak: #FF5722;
              --color-gems: #06B6D4;
              --color-combo: #EC4899;
            }
            html, body, #root {
              background-color: #FDFBF7 !important;
              font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif !important;
              margin: 0;
              padding: 0;
            }
            * {
              box-sizing: border-box;
            }
          `
        }} />

        <script dangerouslySetInnerHTML={{ __html: ANTI_FLASH_SCRIPT }} />
        <ScrollViewStyleReset />
      </head>
      <body style={{ backgroundColor: "#FDFBF7", margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
