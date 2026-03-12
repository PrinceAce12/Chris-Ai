'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User, updateProfile } from 'firebase/auth';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { 
  ArrowLeft, LogOut, User as UserIcon, Mail, Shield, Moon, 
  MessageSquare, Calendar, Edit2, Camera, Bell, Volume2, 
  Trash2, ChevronRight, X, Check, Loader2 
} from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatCount, setChatCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        setUser(currentUser);
        setDisplayName(currentUser.displayName || '');
        setPhotoURL(currentUser.photoURL || '');
        
        // Fetch stats
        try {
          const q = query(collection(db, "chats"), where("userId", "==", currentUser.uid));
          const snapshot = await getCountFromServer(q);
          setChatCount(snapshot.data().count);
        } catch (error) {
          console.error("Error fetching stats:", error);
        }
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

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user, {
        displayName: displayName,
        photoURL: photoURL
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#050505] flex items-center justify-center text-black dark:text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-black/20 dark:text-white/20" />
          <div className="animate-pulse text-sm font-medium">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#050505] text-black dark:text-white font-sans pb-20 md:pb-8">
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5 px-4 py-3 md:hidden flex items-center justify-between">
        <Link href="/" className="p-2 -ml-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-lg font-semibold">Profile</h1>
        <div className="w-9" /> {/* Spacer */}
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Desktop Header */}
        <div className="hidden md:flex items-center gap-4 mb-8">
          <Link 
            href="/" 
            className="p-2 -ml-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors group"
          >
            <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Profile & Settings</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Profile Card */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white dark:bg-[#121212] border border-black/5 dark:border-white/5 rounded-3xl p-6 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-pink-500/20 to-purple-500/20 dark:from-pink-500/10 dark:to-purple-500/10 z-0"></div>
              
              <div className="relative z-10 flex flex-col items-center">
                <div className="relative mb-4">
                  <div className="w-28 h-28 rounded-full bg-white dark:bg-[#121212] p-1.5 shadow-xl">
                    <div className="w-full h-full rounded-full bg-neutral-100 dark:bg-[#1a1a1a] flex items-center justify-center overflow-hidden relative group/avatar">
                      {user.photoURL ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img 
                          src={user.photoURL} 
                          alt={user.displayName || 'User'} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-4xl font-medium text-black/20 dark:text-white/20">
                          {user.displayName?.[0] || user.email?.[0] || "U"}
                        </span>
                      )}
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Camera className="w-6 h-6 text-white" />
                      </button>
                    </div>
                  </div>
                  <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 border-4 border-white dark:border-[#121212] rounded-full"></div>
                </div>

                <h2 className="text-xl font-bold mb-1 text-center">{user.displayName || 'User'}</h2>
                <p className="text-black/50 dark:text-white/50 text-sm text-center mb-6">{user.email}</p>

                <button 
                  onClick={() => setIsEditing(true)}
                  className="w-full py-2.5 px-4 bg-black dark:bg-white text-white dark:text-black font-medium rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-sm"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-[#121212] border border-black/5 dark:border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-1 shadow-sm">
                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl mb-1">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="text-2xl font-bold">{chatCount}</div>
                <div className="text-xs text-black/40 dark:text-white/40 font-medium uppercase tracking-wider">Chats</div>
              </div>
              <div className="bg-white dark:bg-[#121212] border border-black/5 dark:border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center gap-1 shadow-sm">
                <div className="p-2 bg-purple-500/10 text-purple-500 rounded-xl mb-1">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="text-2xl font-bold">
                  {user.metadata.creationTime ? new Date(user.metadata.creationTime).getFullYear() : new Date().getFullYear()}
                </div>
                <div className="text-xs text-black/40 dark:text-white/40 font-medium uppercase tracking-wider">Joined</div>
              </div>
            </div>
          </div>

          {/* Right Column: Settings */}
          <div className="md:col-span-2 space-y-6">
            {/* Account Details */}
            <div className="bg-white dark:bg-[#121212] border border-black/5 dark:border-white/5 rounded-3xl p-6 shadow-sm">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-pink-500" />
                Account Details
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-black/20 rounded-2xl border border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-neutral-200 dark:bg-white/10 rounded-xl">
                      <Mail className="w-5 h-5 opacity-50" />
                    </div>
                    <div>
                      <div className="text-xs text-black/40 dark:text-white/40 font-medium uppercase">Email</div>
                      <div className="font-medium">{user.email}</div>
                    </div>
                  </div>
                  {user.emailVerified ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-xs font-medium">
                      <Check className="w-3 h-3" /> Verified
                    </div>
                  ) : (
                    <button className="text-xs font-medium text-blue-500 hover:underline">Verify Now</button>
                  )}
                </div>

                <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-black/20 rounded-2xl border border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-neutral-200 dark:bg-white/10 rounded-xl">
                      <Shield className="w-5 h-5 opacity-50" />
                    </div>
                    <div>
                      <div className="text-xs text-black/40 dark:text-white/40 font-medium uppercase">Role</div>
                      <div className="font-medium">Free Plan</div>
                    </div>
                  </div>
                  <button className="text-xs font-medium text-purple-500 hover:underline">Upgrade</button>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="bg-white dark:bg-[#121212] border border-black/5 dark:border-white/5 rounded-3xl p-6 shadow-sm">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Moon className="w-5 h-5 text-blue-500" />
                Preferences
              </h3>
              <div className="space-y-1">
                <div className="flex items-center justify-between p-3 hover:bg-neutral-50 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-neutral-100 dark:bg-white/5 rounded-xl">
                      <Moon className="w-5 h-5 opacity-70" />
                    </div>
                    <div className="font-medium">Dark Mode</div>
                  </div>
                  <ThemeToggle />
                </div>

                <div className="flex items-center justify-between p-3 hover:bg-neutral-50 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-neutral-100 dark:bg-white/5 rounded-xl">
                      <Bell className="w-5 h-5 opacity-70" />
                    </div>
                    <div className="font-medium">Notifications</div>
                  </div>
                  <div className="w-10 h-6 bg-neutral-200 dark:bg-white/10 rounded-full relative cursor-pointer">
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 hover:bg-neutral-50 dark:hover:bg-white/5 rounded-xl transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-neutral-100 dark:bg-white/5 rounded-xl">
                      <Volume2 className="w-5 h-5 opacity-70" />
                    </div>
                    <div className="font-medium">Sound Effects</div>
                  </div>
                  <div className="w-10 h-6 bg-black dark:bg-white rounded-full relative cursor-pointer">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white dark:bg-black rounded-full shadow-sm"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-500/20 rounded-3xl p-6 shadow-sm">
              <h3 className="text-lg font-bold mb-4 text-red-600 dark:text-red-400 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Danger Zone
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-red-900 dark:text-red-200">Delete Account</div>
                  <div className="text-sm text-red-700/60 dark:text-red-300/60">Permanently remove your account and all data.</div>
                </div>
                <button className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 transition-colors">
                  Delete
                </button>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={handleLogout}
                className="w-full py-3 px-4 bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 text-black dark:text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1c1c1c] w-full max-w-md rounded-3xl p-6 shadow-2xl border border-black/5 dark:border-white/10 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Edit Profile</h3>
              <button 
                onClick={() => setIsEditing(false)}
                className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black/60 dark:text-white/60 mb-1.5">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                  placeholder="Enter your name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-black/60 dark:text-white/60 mb-1.5">Profile Picture URL</label>
                <input
                  type="text"
                  value={photoURL}
                  onChange={(e) => setPhotoURL(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                  placeholder="https://example.com/avatar.jpg"
                />
                <p className="text-xs text-black/40 dark:text-white/40 mt-1.5">
                  Enter a direct link to an image.
                </p>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3 px-4 bg-neutral-100 dark:bg-white/5 hover:bg-neutral-200 dark:hover:bg-white/10 text-black dark:text-white font-medium rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex-1 py-3 px-4 bg-black dark:bg-white text-white dark:text-black font-medium rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
