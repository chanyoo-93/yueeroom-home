import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '유이룸 (Yu-ee Room)',
  description: '프리미엄 유아/아동복 & 악세사리',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
