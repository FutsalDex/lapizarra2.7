
'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, getFirestore, Timestamp, deleteDoc, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '@/firebase/config';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";


const db = getFirestore(app);
const auth = getAuth(app);

type Conversation = {
  id: string;
  title: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

const TimeAgo = ({ date }: { date: Date | undefined }) => {
    const [timeAgo, setTimeAgo] = useState('');

    useEffect(() => {
        if (date) {
            setTimeAgo(formatDistanceToNow(date, { addSuffix: true, locale: es }));
        }
    }, [date]);

    if (!timeAgo) {
        return null;
    }

    return <span className="text-xs text-muted-foreground">{timeAgo}</span>;
}

function HistorySidebarContent() {
    const [user, loadingAuth] = useAuthState(auth);
    const searchParams = useSearchParams();
    const router = useRouter();
    const chatId = searchParams.get('chatId');
    const { toast } = useToast();

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
        
        const sortedConvos = convos.sort((a, b) => {
            const timeA = a.updatedAt?.toMillis() || a.createdAt?.toMillis() || 0;
            const timeB = b.updatedAt?.toMillis() || b.createdAt?.toMillis() || 0;
            return timeB - timeA;
        });

        return sortedConvos.slice(0, 10);
    }, [conversationsSnapshot]);

    const handleDelete = async (e: React.MouseEvent, conversationId: string) => {
        e.stopPropagation();
        e.preventDefault();

        try {
            await deleteDoc(doc(db, 'conversations', conversationId));
            toast({
                title: "Conversación eliminada",
            });
            if (chatId === conversationId) {
                router.push('/soporte');
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error al eliminar",
                description: error.message,
            });
        }
    };


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
                 <div key={convo.id} className="group flex items-center justify-between gap-1 rounded-lg hover:bg-accent"
                 >
                    <Link
                        href={`/soporte?chatId=${convo.id}`}
                        scroll={false}
                        className={cn(
                            "flex flex-col items-start p-2 rounded-l-lg text-left flex-1",
                            chatId === convo.id && "bg-accent"
                        )}
                    >
                        <span className="text-sm font-medium truncate w-full">{convo.title}</span>
                        <TimeAgo date={(convo.updatedAt || convo.createdAt)?.toDate()} />
                    </Link>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                <Trash2 className="h-4 w-4 text-destructive"/>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar conversación?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción es permanente. Se eliminará el chat "{convo.title}".
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={(e) => handleDelete(e, convo.id)}>Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
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
