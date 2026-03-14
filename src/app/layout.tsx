// src/app/layout.tsx

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Saturia - Technical Analysis Dashboard',
  description: 'Real-time crypto trading signals with technical indicators',
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-dark-bg text-white">
        {children}
      </body>
    </html>
  );
}
