import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import MainNav from "@/components/main-nav"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Operational Risk Management",
  description: "Operational Risk Management Platform",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <div className="min-h-screen flex flex-col">
            <MainNav />
            <div className="flex-1">{children}</div>
            <footer className="border-t py-4 mt-8">
              <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
                &copy; 2025 Microsoft Operational Risk Management Platform
              </div>
            </footer>
          </div>
        </body>
      </html>
    </ThemeProvider>
  )
}
