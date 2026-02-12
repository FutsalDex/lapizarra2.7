import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import SoporteChat from './SoporteChat';

// Esta línea obliga a Next.js a no intentar hacer la página estática
export const dynamic = 'force-dynamic';

export default function SoportePage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={
        <div className="flex justify-center items-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <SoporteChat />
      </Suspense>
    </div>
  );
}