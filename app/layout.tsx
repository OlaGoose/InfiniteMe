import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StepTrek - English Learning Game',
  description: 'Learn English while walking and exploring the world',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
