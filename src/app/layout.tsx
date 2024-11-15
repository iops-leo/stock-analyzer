import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '볼린저 밴드 기반 주식 매수 분석',
  description: '볼린저 밴드를 활용한 주식 매수 타이밍 분석',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className="bg-gray-100">
      <body className="min-h-screen bg-gray-100">
        <div className="mx-auto">
          {children}
        </div>
      </body>
    </html>
  )
}