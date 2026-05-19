import type { Metadata } from 'next'
import { Nunito, M_PLUS_Rounded_1c } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  display: 'swap',
})

const mplus = M_PLUS_Rounded_1c({
  subsets: ['latin'],
  weight: ['400', '700', '800'],
  display: 'swap',
  variable: '--font-mplus',
})

export const metadata: Metadata = {
  title: 'DeFi Portfolio Manager',
  description: 'ウォレットを繋ぐだけで資産を円換算で把握',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${nunito.className} ${mplus.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}