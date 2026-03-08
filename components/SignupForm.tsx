"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PlanetLogo } from "@/components/PlanetLogo"
import Link from "next/link"

import { auth, db } from "@/lib/firebase"
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"

export function SignupForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError("")
    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      // Sync user to Firestore
      const userData: any = {
        uid: user.uid,
        updatedAt: serverTimestamp(),
      };
      if (user.email) userData.email = user.email;
      if (user.displayName) userData.displayName = user.displayName;
      if (user.photoURL) userData.photoURL = user.photoURL;

      await setDoc(doc(db, "users", user.uid), userData, { merge: true })

      router.push("/")
      router.refresh()
    } catch (err: any) {
      console.error("Google Sign-Up Error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError("Sign-in was cancelled.")
      } else {
        setError(err.message || "Failed to sign in with Google. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="flex flex-col items-center">
        <PlanetLogo className="w-12 h-12 mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Create Account</h1>
        <p className="text-black/50 dark:text-white/50 mt-2">Join Chris and explore the universe</p>
      </div>

      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center">
            {error}
          </div>
        )}
        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-2xl bg-white dark:bg-[#111] border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-all font-bold flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isLoading ? (
            <div className="animate-pulse">
              <PlanetLogo className="w-5 h-5" />
            </div>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
          Continue with Google
        </button>
      </div>

      <div className="text-center">
        <p className="text-sm text-black/50 dark:text-white/50">
          Already have an account?{" "}
          <Link href="/login" className="text-black dark:text-white font-bold hover:underline" replace>
            Log In
          </Link>
        </p>
      </div>
    </div>
  )
}
