import type { Metadata } from 'next'
import { Noto_Sans_JP } from 'next/font/google'
import { Geist_Mono } from 'next/font/google'
import { cookies } from 'next/headers'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/layout/ThemeProvider'
import './globals.css'

const notoSansJp = Noto_Sans_JP({
  variable: '--font-noto-sans-jp',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const FONT_SCALE_MAP = { small: 0.9, normal: 1.0, large: 1.1 } as const
type FontScaleKey = keyof typeof FONT_SCALE_MAP

export const metadata: Metadata = {
  title: 'N-LIC CRM',
  description: 'N-LIC 様向け 保険代理店 CRM',
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies()
  const theme =
    (cookieStore.get('nlic_theme')?.value as 'light' | 'dark' | undefined) ??
    'light'
  const fontScale =
    (cookieStore.get('nlic_font_scale')?.value as FontScaleKey | undefined) ??
    'normal'
  const fontScaleValue = FONT_SCALE_MAP[fontScale]

  return (
    <html
      lang="ja"
      className={`${notoSansJp.variable} ${geistMono.variable} h-full antialiased ${
        theme === 'dark' ? 'dark' : ''
      }`}
      style={{ ['--font-scale' as string]: String(fontScaleValue) }}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider initialTheme={theme} initialFontScale={fontScale}>
          {children}
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
