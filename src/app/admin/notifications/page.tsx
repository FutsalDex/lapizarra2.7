
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Trash2, Send, Loader2, Megaphone } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, getFirestore } from 'firebase/firestore';
import app from '@/firebase/config';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import AuthGuard from '@/components/auth/AuthGuard';
import { Skeleton } from '@/components/ui/skeleton';

const db = getFirestore(app);

type Notification = {
    id: string;
    title: string;
    message: string;
    target: 'all' | 'Pro' | 'Básico' | 'trial';
    active: boolean;
    createdAt: any;
};

export default function NotificationsPage() {
    const { toast } = useToast();
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [target, setTarget] = useState<'all' | 'Pro' | 'Básico' | 'trial'>('all');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [notificationsSnapshot, loading, error] = useCollection(collection(db, 'notifications'));
    const notifications = notificationsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification))
        .sort((a,b) => b.createdAt.toMillis() - a.createdAt.toMillis()) || [];

    const handleCreateNotification = async () => {
        if (!title || !message) {
            toast({ variant: 'destructive', title: 'Campos requeridos', description: 'El título y el mensaje son obligatorios.' });
            return;
        }
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, 'notifications'), {
                title,
                message,
                target,
                active: true,
                createdAt: serverTimestamp(),
            });
            toast({ title: 'Notificación creada', description: 'La notificación se ha enviado.' });
            setTitle('');
            setMessage('');
            setTarget('all');
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleNotificationStatus = async (id: string, currentStatus: boolean) => {
        try {
            await updateDoc(doc(db, 'notifications', id), { active: !currentStatus });
            toast({ title: `Notificación ${!currentStatus ? 'activada' : 'desactivada'}.` });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'notifications', id));
            toast({ variant: 'destructive', title: 'Notificación eliminada.' });
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        }
    };


  return (
    <AuthGuard>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="outline" asChild>
            <Link href="/admin">
              <ArrowLeft className="mr-2" />
              Volver al Panel de Admin
            </Link>
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold font-headline text-primary">Enviar Notificaciones</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Crea y gestiona las notificaciones que se mostrarán a los usuarios.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Crear Nueva Notificación</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Título</Label>
                            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Nueva función disponible" />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="message">Mensaje</Label>
                            <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe la notificación..." />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="target">Destinatario</Label>
                             <Select value={target} onValueChange={(v) => setTarget(v as any)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar destinatario"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos los usuarios</SelectItem>
                                    <SelectItem value="Pro">Solo usuarios PRO</SelectItem>
                                    <SelectItem value="Básico">Solo usuarios Básico</SelectItem>
                                    <SelectItem value="trial">Solo usuarios de prueba</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                    <CardFooter>
                         <Button onClick={handleCreateNotification} disabled={isSubmitting} className="w-full">
                            {isSubmitting ? <Loader2 className="mr-2 animate-spin"/> : <Send className="mr-2"/>}
                            Enviar Notificación
                        </Button>
                    </CardFooter>
                </Card>
            </div>
            <div className="lg:col-span-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Historial de Notificaciones</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Título</TableHead>
                                        <TableHead>Destinatario</TableHead>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading && Array.from({length: 5}).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-8 w-12" /></TableCell>
                                            <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                                        </TableRow>
                                    ))}
                                    {!loading && notifications.map((notif) => (
                                        <TableRow key={notif.id}>
                                            <TableCell className="font-medium">{notif.title}</TableCell>
                                            <TableCell>{notif.target}</TableCell>
                                            <TableCell>{notif.createdAt ? format(notif.createdAt.toDate(), 'dd/MM/yy HH:mm') : '-'}</TableCell>
                                            <TableCell>
                                                <Switch 
                                                    checked={notif.active} 
                                                    onCheckedChange={() => toggleNotificationStatus(notif.id, notif.active)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" onClick={() => deleteNotification(notif.id)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                     {!loading && notifications.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                No se han enviado notificaciones.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        {error && <p className="text-destructive mt-4">{error.message}</p>}
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>
    </AuthGuard>
  );
}
