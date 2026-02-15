import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Insights Engine',
  description: 'Software Engineering Metrics Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
