"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, Loader2, MessageSquare, ArrowLeft, Bot, User } from 'lucide-react';
import { askMisterGlobal, MisterGlobalOutput } from '@/ai/flows/mister-global-flow';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';


type Message = {
  role: 'user' | 'assistant';
  content: string | MisterGlobalOutput;
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


export default function SoportePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<null | HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }
  useEffect(scrollToBottom, [messages, loading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInput('');
    setLoading(true);

    try {
      const history = currentMessages.slice(0, -1).map(msg => ({
          role: msg.role,
          content: typeof msg.content === 'string' ? msg.content : stringifyAssistantMessage(msg.content)
      }));

      const response = await askMisterGlobal({
        history: history,
        question: input 
      });

      const assistantMessage: Message = { role: 'assistant', content: response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error(error);
      const errorMessage: Message = { role: 'assistant', content: { answer: "Lo siento, he tenido un problema y no puedo responder ahora mismo." } };
       setMessages(prev => [...prev, errorMessage]);
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
    <Card className="bg-muted/50 border-none shadow-none">
        <CardContent className="p-4 space-y-4">
            {content.contextAnalysis && (
                 <div>
                    <h4 className="font-bold text-primary mb-2">Análisis del Contexto</h4>
                    <p className="text-sm text-muted-foreground">{content.contextAnalysis}</p>
                </div>
            )}
            {content.misterNuance && (
                <div>
                    <h4 className="font-bold text-primary mb-2">El Matiz del Míster</h4>
                    <p className="text-sm text-muted-foreground">{content.misterNuance}</p>
                </div>
            )}
             <div className={cn({"border-t pt-4 mt-4": content.contextAnalysis || content.misterNuance})}>
                <p className="text-sm font-semibold text-foreground">{content.answer}</p>
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
                        <div className={`max-w-2xl rounded-lg ${message.role === 'user' ? 'bg-primary text-primary-foreground px-4 py-2' : 'bg-transparent'}`}>
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
                        disabled={loading}
                    />
                    <Button type="submit" size="icon" disabled={loading || !input.trim()}>
                        <Send className="h-4 w-4" />
                        <span className="sr-only">Enviar mensaje</span>
                    </Button>
                </form>
            </CardFooter>
        </Card>
    </div>
  );
}
