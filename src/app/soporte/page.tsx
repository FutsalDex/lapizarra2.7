
'use client';

import { Suspense } from 'react';
import HistorySidebar from './HistorySidebar';
import SoporteChat from './SoporteChat';
import { Loader2 } from 'lucide-react';

export default function SoportePage() {
    return (
        <div className="h-[calc(100vh-4rem)] grid grid-cols-1 md:grid-cols-[300px_1fr]">
            <aside className="hidden md:block border-r h-full">
                <Suspense fallback={
                    <div className="flex justify-center items-center h-full p-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                }>
                    <HistorySidebar />
                </Suspense>
            </aside>
            <main className="flex-1 h-full overflow-y-auto">
                <Suspense fallback={
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                }>
                    <SoporteChat />
                </Suspense>
            </main>
        </div>
    );
}
