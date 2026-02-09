
"use client";

import { useState, useRef, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Loader2, Bot, User, MessageSquare } from 'lucide-react';
import { askMisterGlobal, MisterGlobalOutput } from '@/ai/flows/mister-global-flow';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    getDoc,
    Timestamp,
    getFirestore
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '@/firebase/config';
import { useSearchParams, useRouter } from 'next/navigation';

const db = getFirestore(app);
const auth = getAuth(app);


type Message = {
    role: 'user' | 'assistant';
    content: string | MisterGlobalOutput;
    createdAt: Timestamp;
};

function stringifyAssistantMessage(content: MisterGlobalOutput): string {
    let result = "";
    if (content.contextAnalysis) {
        result += `Análisis del Contexto: ${content.contextAnalysis}\n`;
    }
    if (content.misterNuance) {
        result += `El Matiz del Mister: ${content.misterNuance}\n`;
    }
    result += `Respuesta: ${content.answer}`;
    return result;
}

const AssistantMessage = ({ content }: { content: MisterGlobalOutput }) => {
    const renderFormattedText = (text: string | undefined, baseClassName: string) => {
      if (!text) return null;

      const renderInline = (line: string) => {
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i}>{part.slice(2, -2)}</strong>;
          }
          return part;
        });
      };

      const blocks = text.split('\n');

      return (
        <div className="space-y-2">
          {blocks.map((block, index) => {
            if (block.trim() === '') {
              return null;
            }
            
            const numberedMatch = block.match(/^(\d+\.)\s*(.*)/);
            if (numberedMatch) {
              return (
                <div key={index} className="flex text-sm ml-2">
                  <span className="font-bold w-6">{numberedMatch[1]}</span>
                  <p className={baseClassName}>{renderInline(numberedMatch[2])}</p>
                </div>
              );
            }

            const bulletMatch = block.match(/^- \s*(.*)/);
            if (bulletMatch) {
              return (
                <div key={index} className="flex text-sm ml-2">
                  <span className="font-bold w-6">&bull;</span>
                  <p className={baseClassName}>{renderInline(bulletMatch[1])}</p>
                </div>
              );
            }
            
            if (block.endsWith(':') && block.length < 100) {
                return (
                    <h4 key={index} className="font-semibold text-md mt-4 mb-1 text-foreground">
                        {renderInline(block.slice(0, -1))}
                    </h4>
                );
            }

            return (
              <p key={index} className={baseClassName}>
                {renderInline(block)}
              </p>
            );
          })}
        </div>
      );
    };

    return (
        <Card className="bg-muted/50 border-none shadow-none">
            <CardContent className="p-4 space-y-4">
                {content.contextAnalysis && (
                     <div>
                        <h3 className="font-bold text-primary mb-2">Análisis del Contexto</h3>
                        {renderFormattedText(content.contextAnalysis, "text-sm text-muted-foreground")}
                    </div>
                )}
                {content.misterNuance && (
                    <div>
                        <h3 className="font-bold text-primary mb-2">El Matiz del Míster</h3>
                        {renderFormattedText(content.misterNuance, "text-sm text-muted-foreground")}
                    </div>
                )}
                 <div className={cn("border-t pt-4 mt-4", {"border-none pt-0 mt-0": !content.contextAnalysis && !content.misterNuance})}>
                    {renderFormattedText(content.answer, "text-sm text-foreground")}
                </div>
            </CardContent>
        </Card>
    );
  };


function SoporteChat() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const chatId = searchParams.get('chatId');

    const [user, loadingAuth] = useAuthState(auth);
    const { toast } = useToast();

    const [conversationDoc, loadingConv] = useDocumentData(
        chatId && user ? doc(db, 'conversations', chatId) : null
    );

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (conversationDoc) {
            const sortedMessages = (conversationDoc.messages || []).sort(
                (a: Message, b: Message) => a.createdAt.toDate().getTime() - b.createdAt.toDate().getTime()
            );
            setMessages(sortedMessages);
        } else {
            setMessages([]);
        }
    }, [conversationDoc]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isAiLoading]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isAiLoading || !user) return;
    
        const userMessageContent = input;
        setInput('');
        
        const userMessage: Message = { role: 'user', content: userMessageContent, createdAt: Timestamp.now() };
        
        setMessages(prev => [...prev, userMessage]);
        setIsAiLoading(true);
        
        try {
            const historyForAI = messages.map(msg => ({
                role: msg.role,
                content: typeof msg.content === 'string' ? msg.content : stringifyAssistantMessage(msg.content as MisterGlobalOutput)
            }));

            const response = await askMisterGlobal({
                history: historyForAI,
                question: userMessageContent,
            });

            const assistantMessage: Message = { role: 'assistant', content: response, createdAt: Timestamp.now() };

            if (!chatId) {
                const newConvRef = await addDoc(collection(db, 'conversations'), {
                    userId: user.uid,
                    title: userMessageContent.substring(0, 40) + (userMessageContent.length > 40 ? '...' : ''),
                    createdAt: Timestamp.now(),
                    messages: [userMessage, assistantMessage],
                });
                router.push(`/soporte?chatId=${newConvRef.id}`, { scroll: false });
            } else {
                const convRef = doc(db, 'conversations', chatId);
                const convSnap = await getDoc(convRef);
                if (convSnap.exists()) {
                    const existingMessages = convSnap.data().messages || [];
                    await updateDoc(convRef, {
                        messages: [...existingMessages, userMessage, assistantMessage],
                        updatedAt: Timestamp.now(),
                    });
                }
            }
            // Let the listener update the UI from the DB change
        } catch (error: any) {
            console.error("Error sending message:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar el mensaje o recibir respuesta.' });
            setMessages(prev => prev.filter(m => m.createdAt !== userMessage.createdAt)); // rollback
        } finally {
            setIsAiLoading(false);
        }
    };
    
    if (loadingAuth || loadingConv) {
         return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!chatId) {
        return (
             <div className="h-full flex flex-col items-center justify-center bg-background p-4 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
                <h2 className="mt-4 text-2xl font-semibold">Míster Global</h2>
                <p className="mt-2 text-muted-foreground">Selecciona una conversación o comienza un nuevo chat para recibir consejos.</p>
                <div className="mt-6 w-full max-w-md">
                     <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
                        <Input
                            id="message"
                            placeholder="Escribe tu pregunta a Míster Global..."
                            autoComplete="off"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isAiLoading}
                        />
                        <Button type="submit" size="icon" disabled={isAiLoading || !input.trim()}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full">
            <Card className="flex-grow flex flex-col m-0 shadow-none border-none rounded-none">
                <CardContent className="flex-grow p-6 space-y-6 overflow-y-auto">
                    {messages.map((message, index) => (
                        <div key={index} className={`flex items-start gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}>
                            {message.role === 'assistant' && (
                                <Avatar className="w-8 h-8"><AvatarFallback><Bot /></AvatarFallback></Avatar>
                            )}
                            <div className={`max-w-2xl rounded-lg ${message.role === 'user' ? 'bg-primary text-primary-foreground px-4 py-2' : 'w-full'}`}>
                                {typeof message.content === 'string' ? <p>{message.content}</p> : <AssistantMessage content={message.content} />}
                            </div>
                            {message.role === 'user' && (
                                <Avatar className="w-8 h-8"><AvatarFallback><User /></AvatarFallback></Avatar>
                            )}
                        </div>
                    ))}
                    {isAiLoading && (
                        <div className="flex items-start gap-4">
                            <Avatar className="w-8 h-8"><AvatarFallback><Bot /></AvatarFallback></Avatar>
                            <div className="bg-muted rounded-lg px-4 py-3 flex items-center gap-2">
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                <span className="text-sm text-muted-foreground">Míster Global está pensando...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </CardContent>
                <CardFooter className="p-4 border-t">
                    <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
                        <Input
                            id="message"
                            placeholder="Escribe tu pregunta a Míster Global..."
                            className="flex-1"
                            autoComplete="off"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isAiLoading}
                        />
                        <Button type="submit" size="icon" disabled={isAiLoading || !input.trim()}>
                            <Send className="h-4 w-4" />
                            <span className="sr-only">Enviar mensaje</span>
                        </Button>
                    </form>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function SoportePage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <SoporteChat />
        </Suspense>
    )
}
