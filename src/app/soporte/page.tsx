import { Suspense } from 'react';
import SoporteClient from './SoporteClient';
import { Loader2 } from 'lucide-react';

// Forzamos que la página no se intente pre-renderizar de forma estática
export const dynamic = 'force-dynamic';

export default function SoportePage() {
  return (
    <main>
      <Suspense fallback={
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <SoporteClient />
      </Suspense>
    </main>
  );
}