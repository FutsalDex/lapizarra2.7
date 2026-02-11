"use client";

import { useState, useRef, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, collection, addDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { app } from '@/firebase/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Send } from 'lucide-react';
import { askMisterGlobal } from '@/ai/flows/mister-global-flow';

const db = getFirestore(app);
const auth = getAuth(app);

export default function SoporteChatContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const chatId = searchParams.get('chatId');
    const [user, loadingAuth] = useAuthState(auth);
    
    const [conversationDoc, loadingConv] = useDocumentData(
        chatId && user ? doc(db, 'conversations', chatId) : null
    );

    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (conversationDoc?.messages) {
            setMessages([...conversationDoc.messages].sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis()));
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
                    messages: [{ role: 'user', content: msg, createdAt: Timestamp.now() }, { role: 'assistant', content: response, createdAt: Timestamp.now() }],
                });
                router.push(`/soporte?chatId=${docRef.id}`);
            }
        } catch (e) { console.error(e); } finally { setIsAiLoading(false); }
    };

    if (loadingAuth || loadingConv) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] p-4">
            <Card className="flex-grow overflow-y-auto mb-4 p-4 space-y-4">
                {messages.map((m, i) => (
                    <div key={i} className={`p-3 rounded-lg ${m.role === 'user' ? 'bg-primary text-white ml-auto' : 'bg-muted mr-auto'} max-w-[80%]`}>
                        {typeof m.content === 'string' ? m.content : m.content.answer}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </Card>
            <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escribe..." />
                <Button type="submit" disabled={isAiLoading}><Send className="h-4 w-4" /></Button>
            </form>
        </div>
    );
}