
"use client";

import { useState, useRef, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Send, Loader2 } from 'lucide-react';
import { askMisterGlobal, type MisterGlobalOutput } from '@/ai/flows/mister-global-flow';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { collection, doc, addDoc, updateDoc, Timestamp, getFirestore, serverTimestamp } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '@/firebase/config';
import { useSearchParams, useRouter } from 'next/navigation';

const db = getFirestore(app);
const auth = getAuth(app);

type Message = {
    role: 'user' | 'assistant';
    content: string | MisterGlobalOutput;
    createdAt: Timestamp;
}

function Chat() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const chatId = searchParams.get('chatId');
    const [user, loadingAuth] = useAuthState(auth);
    const { toast } = useToast();
    
    const [conversationDoc, loadingConv, errorConv] = useDocumentData(
        chatId && user ? doc(db, 'conversations', chatId) : null
    );

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (conversationDoc?.messages) {
            const sortedMessages = [...conversationDoc.messages].sort((a: any, b: any) => {
                const timeA = a.createdAt?.toMillis() || 0;
                const timeB = b.createdAt?.toMillis() || 0;
                return timeA - timeB;
            });
            setMessages(sortedMessages);
        } else if (!chatId) {
            setMessages([]);
        }
    }, [conversationDoc, chatId]);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isAiLoading || !user) return;
        
        const userMessageContent = input;
        const userMessage: Message = { role: 'user', content: userMessageContent, createdAt: Timestamp.now() };

        const currentMessages = messages;
        const newMessages = [...currentMessages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsAiLoading(true);

        try {
            const historyForAI = currentMessages.map(m => ({
              role: m.role,
              content: typeof m.content === 'string' ? m.content : (m.content as MisterGlobalOutput).answer
            }));
            
            const response = await askMisterGlobal({ history: historyForAI, question: userMessageContent });
            
            const aiMessage: Message = { role: 'assistant', content: response, createdAt: Timestamp.now() };

            const finalMessages = [...newMessages, aiMessage];
            setMessages(finalMessages);
            
            const messagesToSave = finalMessages.map(msg => {
                const content = typeof msg.content === 'string'
                  ? msg.content
                  : {
                      contextAnalysis: (msg.content as MisterGlobalOutput).contextAnalysis || "",
                      misterNuance: (msg.content as MisterGlobalOutput).misterNuance || "",
                      answer: (msg.content as MisterGlobalOutput).answer || ""
                    };
                return {
                  role: msg.role,
                  content: content,
                  createdAt: msg.createdAt,
                };
            });

            if (chatId) {
                await updateDoc(doc(db, 'conversations', chatId), {
                    messages: messagesToSave,
                    updatedAt: serverTimestamp(),
                });
            } else {
                const docRef = await addDoc(collection(db, 'conversations'), {
                    userId: user.uid,
                    title: userMessageContent.substring(0, 30) + '...',
                    messages: messagesToSave,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                router.push(`/soporte?chatId=${docRef.id}`);
            }
        } catch (e: any) {
            toast({ title: "Error del Asistente", description: e.message || "No se pudo obtener una respuesta.", variant: 'destructive' });
            setMessages(currentMessages);
        } finally {
            setIsAiLoading(false);
        }
    };
    
    if (loadingAuth || loadingConv) {
         return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
    }
     if (errorConv) {
        return <div className="p-10 text-center text-destructive">Error: {errorConv.message}</div>
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] p-4">
            <Card className="flex-grow overflow-y-auto mb-4 p-4 space-y-4">
                 {messages.length === 0 && !isAiLoading && (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center text-muted-foreground">
                            <p className="font-semibold">Míster Global</p>
                            <p className="text-sm">¿En qué puedo ayudarte hoy?</p>
                        </div>
                    </div>
                )}
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                       <div className={`max-w-[80%] p-3 rounded-lg ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                            {typeof m.content === 'string' ? <p className="whitespace-pre-wrap">{m.content}</p> : (
                                <div className="space-y-4 text-sm">
                                    {m.content.contextAnalysis && <div><h4 className="font-bold text-base mb-2 uppercase tracking-wider">ANÁLISIS DE CONTEXTO</h4><p className="whitespace-pre-wrap">{m.content.contextAnalysis}</p></div>}
                                    {m.content.misterNuance && <div className="mt-4"><h4 className="font-bold text-base mb-2 uppercase tracking-wider">EL MATIZ DEL MÍSTER</h4><p className="whitespace-pre-wrap">{m.content.misterNuance}</p></div>}
                                    {m.content.answer && <div className="mt-4"><h4 className="font-bold text-base mb-2 uppercase tracking-wider">RESPUESTA</h4><p className="whitespace-pre-wrap">{m.content.answer}</p></div>}
                                </div>
                            )}
                       </div>
                    </div>
                ))}
                 {isAiLoading && (
                    <div className="flex justify-start">
                         <div className="max-w-[80%] p-3 rounded-lg bg-muted flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin"/>
                            <span>Pensando...</span>
                         </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </Card>
            <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escribe tu mensaje..." disabled={isAiLoading}/>
                <Button type="submit" disabled={isAiLoading || !input.trim()}>
                    {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
            </form>
        </div>
    );
}

export default function SoporteChat() {
    return (
        <Suspense fallback={<div className="p-10 text-center"><Loader2 className="animate-spin mx-auto" /></div>}>
            <Chat />
        </Suspense>
    );
}
