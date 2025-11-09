import { Toaster } from '@zouari-app/ui';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { TRPCProvider } from '@/lib/provider';
import './globals.css';

// Load the Inter font
const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'ZOUARI App',
  description: 'Enterprise TypeScript Monorepo with Better Auth',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Required for next-themes
    <html lang="en" suppressHydrationWarning>
      {/* Applies the Inter font variable */}
      <body className={inter.variable}>
        {/* ThemeProvider manages light/dark mode.
          TRPCProvider manages server state.
        */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TRPCProvider>{children}</TRPCProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
