'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function Chris() {
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    setStatus("authenticated");
  }, []);

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex h-[100dvh] w-full items-center justify-center bg-white dark:bg-[#000000] text-black dark:text-white">
      <h1>Chris is here (Simplified)</h1>
    </div>
  );
}
