import { Geist, Geist_Mono } from "next/font/google";
import ClientLayout from "./ClientLayout";
import "./globals.css";

// Font configurations remain outside the component to avoid re-initialization
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Export metadata here since this is now a server component
export const metadata = {
  title: "Remote Desktop Tool",
  description: "A browser-based remote desktop tool using WebRTC",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
