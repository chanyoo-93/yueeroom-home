import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: '유이룸 (Yu-ee Room)',
    template: '%s | 유이룸',
  },
  description: '프리미엄 유아/아동복 & 악세사리',
  keywords: ['유아복', '아동복', '아기옷', '유이룸', '프리미엄 유아복'],
  authors: [{ name: '유이룸' }],
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: '유이룸',
    title: '유이룸 (Yu-ee Room)',
    description: '프리미엄 유아/아동복 & 악세사리',
  },
  twitter: {
    card: 'summary_large_image',
    title: '유이룸 (Yu-ee Room)',
    description: '프리미엄 유아/아동복 & 악세사리',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const kcpSdkUrl = process.env.NEXT_PUBLIC_KCP_SDK_URL;

  return (
    <html lang="ko">
      <body>
        {kcpSdkUrl && <Script src={kcpSdkUrl} strategy="beforeInteractive" />}
        {children}
      </body>
    </html>
  );
}
