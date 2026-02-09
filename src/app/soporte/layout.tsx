
'use client';

import { useCollection } from 'react-firebase-hooks/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, orderBy, getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '@/firebase/config';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const db = getFirestore(app);
const auth = getAuth(app);

type Conversation = {
  id: string;
  title: string;
  createdAt: any;
};

function HistorySidebar() {
    const [user, loadingAuth] = useAuthState(auth);
    const searchParams = useSearchParams();
    const chatId = searchParams.get('chatId');

    const conversationsQuery = user ? query(
        collection(db, 'conversations'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
    ) : null;
    
    const [conversationsSnapshot, loadingConversations] = useCollection(conversationsQuery);

    const conversations = conversationsSnapshot?.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
    } as Conversation)) || [];

    return (
        <div className="flex flex-col h-full bg-muted/50">
            <div className="p-4 flex justify-between items-center border-b">
                <h2 className="text-lg font-semibold">Historial</h2>
                <Button asChild size="sm">
                    <Link href="/soporte">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Nuevo Chat
                    </Link>
                </Button>
            </div>
            <div className="flex-grow overflow-y-auto">
                {loadingAuth || loadingConversations ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                ) : conversations.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground p-4">
                        No hay conversaciones guardadas.
                    </div>
                ) : (
                    <nav className="p-2 space-y-1">
                        {conversations.map((convo) => (
                            <Link
                                key={convo.id}
                                href={`/soporte?chatId=${convo.id}`}
                                scroll={false}
                                className={cn(
                                    "flex flex-col items-start p-2 rounded-lg text-left",
                                    "hover:bg-accent hover:text-accent-foreground",
                                    chatId === convo.id && "bg-accent text-accent-foreground"
                                )}
                            >
                                <span className="text-sm font-medium truncate w-full">{convo.title}</span>
                                {convo.createdAt && <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(convo.createdAt.toDate(), { addSuffix: true, locale: es })}
                                </span>}
                            </Link>
                        ))}
                    </nav>
                )}
            </div>
        </div>
    )
}

export default function SoporteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="h-[calc(100vh-4rem)] grid grid-cols-1 md:grid-cols-[300px_1fr]">
        <aside className="hidden md:block border-r h-full">
            <HistorySidebar />
        </aside>
        <main className="flex-1 h-full">
            {children}
        </main>
    </div>
  )
}
