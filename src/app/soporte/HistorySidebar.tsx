
'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, getFirestore, Timestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '@/firebase/config';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const db = getFirestore(app);
const auth = getAuth(app);

type Conversation = {
  id: string;
  title: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

const TimeAgo = ({ date }: { date: Date }) => {
    const [timeAgo, setTimeAgo] = useState('');

    useEffect(() => {
        // This effect runs only on the client, preventing hydration mismatch
        setTimeAgo(formatDistanceToNow(date, { addSuffix: true, locale: es }));
    }, [date]);

    if (!timeAgo) {
        return null; // Render nothing on the server and initial client render
    }

    return <span className="text-xs text-muted-foreground">{timeAgo}</span>;
}

function HistorySidebarContent() {
    const [user, loadingAuth] = useAuthState(auth);
    const searchParams = useSearchParams();
    const chatId = searchParams.get('chatId');

    const conversationsQuery = user ? query(
        collection(db, 'conversations'),
        where('userId', '==', user.uid)
    ) : null;
    
    const [conversationsSnapshot, loadingConversations] = useCollection(conversationsQuery);

    const conversations = React.useMemo(() => {
        const convos = conversationsSnapshot?.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as Conversation)) || [];
        
        // Sort on the client side
        return convos.sort((a, b) => {
            const timeA = a.updatedAt?.toMillis() || 0;
            const timeB = b.updatedAt?.toMillis() || 0;
            return timeB - timeA;
        });
    }, [conversationsSnapshot]);


    if (loadingAuth || loadingConversations) {
        return (
            <div className="flex justify-center items-center h-full p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        );
    }
    
    if (conversations.length === 0) {
        return (
            <div className="text-center text-sm text-muted-foreground p-4">
                No hay conversaciones guardadas.
            </div>
        );
    }

    return (
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
                    {convo.updatedAt && <TimeAgo date={convo.updatedAt.toDate()} />}
                </Link>
            ))}
        </nav>
    );
}

export default function HistorySidebar() {
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
                 <Suspense fallback={
                    <div className="flex justify-center items-center h-full p-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                }>
                    <HistorySidebarContent />
                </Suspense>
            </div>
        </div>
    )
}
