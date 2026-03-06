'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { ArrowLeft, LogOut, User as UserIcon, Mail, Shield, Moon } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        setUser(currentUser);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#050505] flex items-center justify-center text-black dark:text-white">
        <div className="animate-pulse">Loading profile...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] text-black dark:text-white font-sans p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            href="/" 
            className="p-2 -ml-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-2xl font-bold">Profile</h1>
        </div>

        {/* Profile Card */}
        <div className="bg-neutral-50 dark:bg-[#121212] border border-black/5 dark:border-white/5 rounded-3xl p-6 md:p-8 shadow-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="w-24 h-24 rounded-full bg-pink-500 text-white flex items-center justify-center text-4xl font-medium mb-4 shadow-lg">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || 'User'} 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span>{user.displayName?.[0] || user.email?.[0] || "U"}</span>
              )}
            </div>
            <h2 className="text-xl font-bold mb-1">{user.displayName || 'User'}</h2>
            <p className="text-black/50 dark:text-white/50 text-sm">{user.email}</p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-white dark:bg-black/20 rounded-2xl border border-black/5 dark:border-white/5 flex items-center gap-4">
              <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-black/40 dark:text-white/40 font-medium uppercase tracking-wider">Display Name</div>
                <div className="font-medium">{user.displayName || 'Not set'}</div>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-black/20 rounded-2xl border border-black/5 dark:border-white/5 flex items-center gap-4">
              <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-black/40 dark:text-white/40 font-medium uppercase tracking-wider">Email Address</div>
                <div className="font-medium">{user.email}</div>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-black/20 rounded-2xl border border-black/5 dark:border-white/5 flex items-center gap-4">
              <div className="p-2 bg-green-500/10 text-green-500 rounded-xl">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-black/40 dark:text-white/40 font-medium uppercase tracking-wider">Account Status</div>
                <div className="font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Active
                  {user.emailVerified && <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full ml-2">Verified</span>}
                </div>
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-black/20 rounded-2xl border border-black/5 dark:border-white/5 flex items-center gap-4">
              <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-xl">
                <Moon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-black/40 dark:text-white/40 font-medium uppercase tracking-wider">Theme</div>
                <div className="font-medium">Switch Theme</div>
              </div>
              <ThemeToggle />
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-black/5 dark:border-white/5">
            <button
              onClick={handleLogout}
              className="w-full py-3 px-4 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
