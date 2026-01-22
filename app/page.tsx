'use client';

import dynamic from 'next/dynamic';

// Dynamically import GameApp to ensure it only renders on client
const GameApp = dynamic(() => import('@/components/GameApp'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 font-semibold">Loading StepTrek...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return <GameApp />;
}
