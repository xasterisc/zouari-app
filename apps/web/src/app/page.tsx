import { Button } from '@zouari-app/ui';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="mb-8 text-4xl font-bold">Welcome to ZOUARI App</h1>
      <p className="mb-8 text-xl">Enterprise TypeScript Monorepo with Better Auth</p>
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/login">Sign In</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
