import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Header from "../components/layout/header";
import Footer from "../components/layout/footer";
import MobileBottomBar from "../components/layout/mobile-bottom-bar";
import AiChatbot from "../features/chatbot/ai-chatbot";
import AuthProvider from "@/providers/auth-provider";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["vietnamese", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "RepairSystem - Hệ Thống Sửa Chữa Thiết Bị Điện Tử Chuyên Nghiệp",
  description: "Dịch vụ sửa chữa điện thoại, laptop, iPad chuyên nghiệp, thay màn hình, thay pin lấy ngay với quy trình minh bạch, uy tín và bảo hành chính hãng.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${plusJakarta.variable} h-full antialiased font-sans`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthProvider>
          <Header />
          
          {/* Main layout container with offset padding-bottom for the mobile bottom bar */}
          <main className="flex-1 pb-16 lg:pb-0">
            {children}
          </main>
          
          <Footer />
          <MobileBottomBar />
          <AiChatbot />
        </AuthProvider>
      </body>
    </html>
  );
}
