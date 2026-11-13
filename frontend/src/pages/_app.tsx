import type { AppProps } from "next/app";
import { Inter, JetBrains_Mono } from "next/font/google";
import "../pages/globals.css";
import "../features/flood-mission/floodMission.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}>
      <Component {...pageProps} />
    </div>
  );
}
