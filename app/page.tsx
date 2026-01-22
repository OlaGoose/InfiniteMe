'use client';

import dynamic from 'next/dynamic';

// Dynamically import GameApp to ensure it only renders on client
// Loading state is handled internally by GameApp component
const GameApp = dynamic(() => import('@/components/GameApp'), {
  ssr: false,
});

export default function Home() {
  return <GameApp />;
}
