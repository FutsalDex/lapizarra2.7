import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

// 1. Forzamos modo dinámico
export const dynamic = 'force-dynamic';

// 2. Importamos el cliente de forma dinámica desactivando el SSR
// IMPORTANTE: El archivo debe llamarse SoporteChat.tsx en tu carpeta
const ChatInterface = dynamic(() => import('./SoporteChat'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-screen bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
});

export default function SoportePage() {
  return (
    <main className="min-h-screen bg-background">
      <Suspense fallback={
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <ChatInterface />
      </Suspense>
    </main>
  );
}