import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Toaster } from 'sonner'

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SSM Pilot — HostelEase License Management | by SSM Limited",
  description: "SSM Limited pilot dashboard for managing HostelEase licenses, tenants, invoices, and contracts. RC 7977037, Kano, Nigeria.",
  keywords: ["SSM Limited", "HostelEase", "license management", "pilot dashboard", "RC 7977037"],
  authors: [{ name: "SSM Limited", url: "https://ssm.com.ng" }],
  creator: "SSM Limited",
  publisher: "SSM Limited",
  openGraph: {
    title: "SSM Pilot — HostelEase License Management",
    description: "SSM Limited pilot dashboard for managing HostelEase licenses, tenants, invoices, and contracts.",
    type: "website",
    locale: "en_NG",
    siteName: "SSM Pilot",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  )
}
