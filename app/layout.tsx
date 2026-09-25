import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Guestbook on velixir',
  description: 'A Next.js guestbook on managed Postgres.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <main className="wrap">
          {children}
          <footer>
            <a href="/api/entries">JSON API</a> &middot; running on <a href="https://velixir.net">velixir</a>
          </footer>
        </main>
      </body>
    </html>
  );
}
