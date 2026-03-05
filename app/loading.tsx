import { Mirage } from 'ldrs/react'
import 'ldrs/react/Mirage.css'

export default function Loading() {
  return (
    <div className="flex h-[100dvh] w-full items-center justify-center bg-white dark:bg-[#000000] text-black dark:text-white">
      <Mirage
        size="60"
        speed="2.5"
        color="currentColor" 
      />
    </div>
  )
}
