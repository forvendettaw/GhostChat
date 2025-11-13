import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GhostChat - Ephemeral P2P Chat',
  description: 'Messages vanish like ghosts. Direct P2P chat with zero traces - no servers, no storage, no history.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'GhostChat - Ephemeral P2P Chat',
    description: 'Your messages vanish like ghosts. Direct peer-to-peer chat with zero traces.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GhostChat - Ephemeral P2P Chat',
    description: 'Your messages vanish like ghosts. Direct peer-to-peer chat with zero traces.',
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
