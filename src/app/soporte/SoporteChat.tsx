"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Send, Loader2 } from 'lucide-react';
import { askMisterGlobal } from '@/ai/flows/mister-global-flow';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { collection, doc, addDoc, Timestamp, getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '@/firebase/config';
import { useSearchParams, useRouter } from 'next/navigation';

const db = getFirestore(app);
const auth = getAuth(app);

export default function SoporteChat() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const chatId = searchParams.get('chatId');
    const [user, loadingAuth] = useAuthState(auth);
    const { toast } = useToast();
    const [conversationDoc, loadingConv] = useDocumentData(chatId && user ? doc(db, 'conversations', chatId) : null);
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (conversationDoc?.messages) {
            setMessages([...conversationDoc.messages].sort((a: any, b: any) => a.createdAt.toMillis() - b.createdAt.toMillis()));
        }
    }, [conversationDoc]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isAiLoading || !user) return;
        const msg = input; setInput(''); setIsAiLoading(true);
        try {
            const response = await askMisterGlobal({ history: [], question: msg });
            if (!chatId) {
                const docRef = await addDoc(collection(db, 'conversations'), {
                    userId: user.uid,
                    messages: [{ role: 'user', content: msg, createdAt: Timestamp.now() }],
                });
                router.push(`/soporte?chatId=${docRef.id}`);
            }
        } catch (e) { toast({ title: "Error" }); } finally { setIsAiLoading(false); }
    };

    if (loadingAuth || loadingConv) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

    return (
        <div className="flex flex-col h-[calc(100vh-80px)] p-4">
            <Card className="flex-grow overflow-y-auto mb-4 p-4">
                {messages.map((m, i) => (
                    <div key={i} className={`mb-2 p-2 rounded ${m.role === 'user' ? 'bg-primary/10 text-right' : 'bg-muted'}`}>
                        {m.content}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </Card>
            <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escribe tu mensaje..." />
                <Button type="submit" disabled={isAiLoading}><Send className="h-4 w-4" /></Button>
            </form>
        </div>
    );
}