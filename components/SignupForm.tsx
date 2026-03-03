"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PlanetLogo } from "@/components/PlanetLogo"
import { Loader2 } from "lucide-react"
import Link from "next/link"

import { createClient } from "@/utils/supabase/client"

export function SignupForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          }
        }
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      // Create user in Prisma via API
      if (data.user) {
        await fetch("/api/auth/sync-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: data.user.id, email, name })
        })
      }

      router.push("/")
      router.refresh()
    } catch (err) {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="flex flex-col items-center">
        <PlanetLogo className="w-12 h-12 mb-4" />
        <h1 className="text-3xl font-bold tracking-tight">Create Account</h1>
        <p className="text-white/50 mt-2">Join Chris AI and explore the universe</p>
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
            className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-white/20 outline-none transition-all"
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
            className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-white/20 outline-none transition-all"
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
            className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-white/20 outline-none transition-all"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-white text-black rounded-2xl font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          Sign Up
        </button>
      </form>

      <div className="text-center">
        <p className="text-sm text-white/50">
          Already have an account?{" "}
          <Link href="/login" className="text-white font-bold hover:underline" replace>
            Log In
          </Link>
        </p>
      </div>
    </div>
  )
}
