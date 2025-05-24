'use client'

import type React from "react"
import "@/app/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SmoothScrollProvider } from "@/components/smooth-scroll-provider"
import Navbar from "@/components/navbar"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"] })

// export const metadata = {
//   title: "NeverForget - Assistive Technology for Memory Challenges",
//   description:
//     "NeverForget is an assistive technology application designed specifically for individuals with dementia, ADHD, and memory-related challenges.",
//     generator: 'v0.dev'
// }

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SmoothScrollProvider>
            <Navbar />
            {children}
          </SmoothScrollProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
