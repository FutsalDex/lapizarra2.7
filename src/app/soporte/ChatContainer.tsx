"use client";

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const ChatInterface = dynamic(() => import('./SoporteChat'), {
  ssr: false,
  loading: () => <LoadingState />
});

function LoadingState() {
  return (
    <div className="flex justify-center items-center h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function ChatContainer() {
  // Aquí es donde el hook useSearchParams() quedará encapsulado
  return <ChatInterface />;
}