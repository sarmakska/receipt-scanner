import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Receipt Scanner',
  description: 'AI receipt OCR. Upload a photo, get structured JSON.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body>{children}</body></html>
  )
}
