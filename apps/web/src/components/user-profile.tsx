'use client';

import { Button } from '@zouari-app/ui';
import type { UserResponse } from '@zouari-app/validation';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth';

// This component now receives the user as a prop
interface UserProfileProps {
  initialUser: UserResponse;
}

export function UserProfile({ initialUser }: UserProfileProps) {
  const router = useRouter();

  // No more loading states! The user is passed in from the server.
  const user = initialUser;

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
      router.refresh(); // Force refresh to clear server component state
    } catch (err) {
      // This is a good place for our future logger
      console.error('Sign-out failed:', err);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-bold">Profile (Client Component)</h2>
      <div className="flex flex-col gap-2">
        <p>
          <strong>Name:</strong> {user.name}
        </p>
        <p>
          <strong>Email:</strong> {user.email}
        </p>
        <p>
          <strong>User ID:</strong> <code className="text-sm">{user.id}</code>
        </p>
      </div>
      <Button variant="destructive" onClick={handleSignOut} className="mt-6 w-full">
        Sign Out
      </Button>
    </div>
  );
}
