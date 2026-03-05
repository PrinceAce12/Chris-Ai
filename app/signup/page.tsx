"use client"

import { SignupForm } from "@/components/SignupForm"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function SignupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white dark:bg-[#050505] p-4 font-sans text-black dark:text-white">
      <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-sm font-medium text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>
      <SignupForm />
    </div>
  )
}
