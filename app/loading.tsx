import { PlanetLogo } from '@/components/PlanetLogo'

export default function Loading() {
  return (
    <div className="flex h-[100dvh] w-full items-center justify-center bg-white dark:bg-[#000000] text-black dark:text-white">
      <div className="animate-pulse">
        <PlanetLogo className="w-16 h-16" />
      </div>
    </div>
  )
}
