
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Loader2, MessageSquare, ArrowLeft, Bot, User } from 'lucide-react';
import { askMisterGlobal, MisterGlobalOutput } from '@/ai/flows/mister-global-flow';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

type Message = {
  role: 'user' | 'assistant';
  content: string | MisterGlobalOutput;
};

export default function SoportePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await askMisterGlobal({ question: input });
      const assistantMessage: Message = { role: 'assistant', content: response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error del Asistente',
        description: error.message || 'No se pudo obtener una respuesta. Inténtalo de nuevo.',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const AssistantMessage = ({ content }: { content: MisterGlobalOutput }) => (
    <Card className="bg-muted/50">
        <CardContent className="p-6 space-y-4">
            <div>
                <h4 className="font-bold text-primary mb-2">Análisis del Contexto</h4>
                <p className="text-sm text-muted-foreground">{content.contextAnalysis}</p>
            </div>
            <div>
                <h4 className="font-bold text-primary mb-2">Propuesta Táctica/Sesión</h4>
                <div className="pl-4 border-l-2 border-primary/50 space-y-3">
                    <div>
                        <h5 className="font-semibold">Objetivo</h5>
                        <p className="text-sm text-muted-foreground">{content.tacticalProposal.objective}</p>
                    </div>
                     <div>
                        <h5 className="font-semibold">Descripción</h5>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{content.tacticalProposal.description}</p>
                    </div>
                     <div>
                        <h5 className="font-semibold">Variantes</h5>
                        <p className="text-sm text-muted-foreground">{content.tacticalProposal.variants}</p>
                    </div>
                </div>
            </div>
             <div>
                <h4 className="font-bold text-primary mb-2">El Matiz del Míster</h4>
                <p className="text-sm text-muted-foreground">{content.misterNuance}</p>
            </div>
             <div className="border-t pt-4 mt-4">
                <h4 className="font-bold text-primary mb-2">La "Regla del 40x20"</h4>
                <p className="text-sm font-semibold italic text-muted-foreground">"{content.rule40x20}"</p>
            </div>
        </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col h-[calc(100vh-4rem)]">
        <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
                <div className="bg-muted p-3 rounded-full">
                    <Bot className="w-8 h-8 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold font-headline">Soporte Técnico con Míster Global</h1>
                    <p className="text-md text-muted-foreground">Tu mentor de futsal 360°. Pregúntale cualquier duda táctica o de gestión.</p>
                </div>
            </div>
             <Button variant="outline" asChild>
                <Link href="/panel">
                    <ArrowLeft className="mr-2" />
                    Volver al Panel
                </Link>
            </Button>
        </div>

        <Card className="flex-grow flex flex-col">
            <CardContent className="flex-grow p-6 space-y-6 overflow-y-auto">
                {messages.length === 0 && (
                    <div className="text-center text-muted-foreground h-full flex flex-col justify-center items-center">
                        <MessageSquare className="w-12 h-12 mb-4" />
                        <p>No hay mensajes todavía.</p>
                        <p className="text-sm">Escribe tu pregunta abajo para empezar a chatear con Míster Global.</p>
                        <p className="text-xs mt-4">Ej: "¿Cómo puedo entrenar la salida de presión con mi equipo alevín?"</p>
                    </div>
                )}
                {messages.map((message, index) => (
                    <div key={index} className={`flex items-start gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}>
                         {message.role === 'assistant' && (
                             <Avatar className="w-8 h-8">
                                <AvatarFallback><Bot /></AvatarFallback>
                            </Avatar>
                         )}
                        <div className={`max-w-2xl rounded-lg px-4 py-2 ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                             {typeof message.content === 'string' ? (
                                <p>{message.content}</p>
                            ) : (
                                <AssistantMessage content={message.content} />
                            )}
                        </div>
                        {message.role === 'user' && (
                             <Avatar className="w-8 h-8">
                                <AvatarFallback><User /></AvatarFallback>
                            </Avatar>
                         )}
                    </div>
                ))}
                 {loading && (
                    <div className="flex items-start gap-4">
                        <Avatar className="w-8 h-8">
                            <AvatarFallback><Bot /></AvatarFallback>
                        </Avatar>
                        <div className="bg-muted rounded-lg px-4 py-3 flex items-center gap-2">
                             <Loader2 className="h-5 w-5 animate-spin text-primary" />
                             <span className="text-sm text-muted-foreground">Míster Global está pensando...</span>
                        </div>
                    </div>
                )}
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
                        disabled={loading}
                    />
                    <Button type="submit" size="icon" disabled={loading}>
                        <Send className="h-4 w-4" />
                        <span className="sr-only">Enviar mensaje</span>
                    </Button>
                </form>
            </CardFooter>
        </Card>
    </div>
  );
}
