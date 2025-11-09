import Link from 'next/link';
import { redirect } from 'next/navigation';
import { UserProfile } from '@/components/user-profile';
import { getCurrentUser } from '@/lib/session';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 pt-16">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Link href="/" className="text-sm text-primary underline">
            Go Home
          </Link>
        </div>

        {/* We pass the 'user' object (fetched securely on the server) 
          down to the 'UserProfile' client component as a prop.
        */}
        <UserProfile initialUser={user} />
      </div>
    </main>
  );
}
