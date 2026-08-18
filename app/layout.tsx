import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import LogisticsNav from "@/components/LogisticsNav";
import Footer from "@/components/Footer";
import SplashScreen from "@/components/SplashScreen";
import PageTransitionOverlay from "@/components/PageTransitionOverlay";
import ScrollProgressBar from "@/components/ScrollProgressBar";
import SectionNav from "@/components/SectionNav";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "New Balaji Transports — Heavy-Haul Logistics & Interstate Freight",
  description: "Asset-based logistics support for interstate container transit, FTL/PTL cargo, heavy-haul transport and commercial freight across India.",
  metadataBase: new URL("https://newbalajitransport.com"),
  openGraph: {
    title: "New Balaji Transports — Heavy-Haul Logistics & Interstate Freight",
    description: "Asset-based logistics support for interstate container transit, FTL/PTL cargo, heavy-haul transport and commercial freight across India.",
    type: "website",
    locale: "en_IN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${montserrat.variable} h-full antialiased`}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-on-surface font-body-md">
        <ScrollProgressBar />
        <SectionNav />
        <SplashScreen />
        <PageTransitionOverlay />
        <LogisticsNav />
        <main className="flex-grow flex flex-col">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
