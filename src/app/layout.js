import "./globals.css";

export const metadata = {
  title: "Editto - Free Online Image Editor",
  description:
    "Editto is a powerful, free online image editor that lets you edit images in your browser with ease. No downloads, no sign-ups—just edit instantly!",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="title" content="Editto - Free Online Image Editor" />
        <meta
          name="description"
          content="Editto is a powerful, free online image editor that lets you edit images in your browser with ease. No downloads, no sign-ups—just edit instantly!"
        />
        <meta
          name="keywords"
          content="online image editor, free image editor, edit photos online, photo editor, web image editor, browser-based image editor"
        />
        <meta name="author" content="Editto Team" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://editto.divanshusoni.in/" />

        {/* Open Graph Meta Tags (for better social media previews) */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://editto.divanshusoni.in/" />
        <meta property="og:title" content="Editto - Free Online Image Editor" />
        <meta
          property="og:description"
          content="Edit and enhance images online with Editto, a free, browser-based image editor. No software downloads needed!"
        />
        <meta
          property="og:image"
          content="https://editto.divanshusoni.in/preview.jpg"
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="Editto" />

        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://editto.divanshusoni.in/" />
        <meta
          name="twitter:title"
          content="Editto - Free Online Image Editor"
        />
        <meta
          name="twitter:description"
          content="Edit images online with Editto, a free, browser-based image editor. No software downloads needed!"
        />
        <meta
          name="twitter:image"
          content="https://editto.divanshusoni.in/preview.jpg"
        />
        <meta name="twitter:creator" content="@dragodiv" />

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`antialiased`}>{children}</body>
    </html>
  );
}
