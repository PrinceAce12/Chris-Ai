"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PlanetLogo } from "@/components/PlanetLogo"
import { Mirage } from 'ldrs/react'
import 'ldrs/react/Mirage.css'
import Link from "next/link"

import { auth, db } from "@/lib/firebase"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"

export function SignupForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Update profile with name
      await updateProfile(user, { displayName: name })

      // Create user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: name,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      router.push("/")
      router.refresh()
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError("An account with this email already exists.")
      } else if (err.code === 'auth/weak-password') {
        setError("Password is too weak. Please use at least 6 characters.")
      } else if (err.code === 'auth/invalid-email') {
        setError("Please enter a valid email address.")
      } else {
        setError("Failed to create account. Please try again.")
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

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium px-1">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:border-black/20 dark:focus:border-white/20 outline-none transition-all"
            placeholder="John Doe"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium px-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:border-black/20 dark:focus:border-white/20 outline-none transition-all"
            placeholder="name@example.com"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium px-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:border-black/20 dark:focus:border-white/20 outline-none transition-all"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading && <Mirage size="20" speed="2.5" color="currentColor" />}
          Sign Up
        </button>
      </form>

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
