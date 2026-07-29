import "./globals.css";
import NavigationWrapper from "@/components/NavigationWrapper";
import ContentWrapper from "@/components/ContentWrapper";

export const metadata = {
  title: "Tutor de Estadistica Inferencial",
  description: "Tutor IA personalizado de estadistica inferencial para psicologia, adaptado a discalculia",
  manifest: "/manifest.json",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#4c6ef5",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="antialiased min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <ContentWrapper>{children}</ContentWrapper>
        <NavigationWrapper />
      </body>
    </html>
  );
}
