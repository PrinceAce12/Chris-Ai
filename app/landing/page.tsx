'use client';

import React from 'react';
import Link from 'next/link';
import { PlanetLogo } from '@/components/PlanetLogo';

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-[#000000] text-black dark:text-white">
      <PlanetLogo className="w-16 h-16 mb-8" />
      <h1 className="text-4xl font-bold mb-4">Welcome to Chris</h1>
      <p className="text-lg text-black/60 dark:text-white/60 mb-8">Your intelligent AI assistant.</p>
      <Link href="/login" className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg font-semibold hover:bg-black/80 dark:hover:bg-white/80 transition-colors">
        Log In
      </Link>
    </div>
  );
}
