
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ThumbsUp, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
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
import { cn } from '@/lib/utils';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, doc, updateDoc, deleteDoc, Timestamp, getFirestore } from 'firebase/firestore';
import app from '@/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type InvitationStatus = 'pending' | 'completed';

type Invitation = {
  id: string;
  inviterEmail: string;
  inviteeEmail: string;
  createdAt: Timestamp;
  completedAt?: Timestamp;
  status: InvitationStatus;
  isApproved?: boolean;
  teamName?: string;
};

const db = getFirestore(app);

export default function InvitationsPage() {
  const [activeTab, setActiveTab] = useState('Pendiente');
  const { toast } = useToast();

  const [invitationsSnapshot, loading, error] = useCollection(collection(db, 'invitations'));
  
  const invitations = invitationsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invitation)) || [];

  const filteredInvitations = invitations.filter(invitation => {
    if (activeTab === 'Todas') return true;
    if (activeTab === 'Pendiente') return invitation.status === 'pending';
    if (activeTab === 'Completada') return invitation.status === 'completed' || invitation.isApproved;
    return false;
  });

  const handleApprove = async (id: string) => {
    try {
        await updateDoc(doc(db, 'invitations', id), { isApproved: true });
        toast({ title: 'Invitación aprobada', description: 'Se han asignado los puntos al invitador.' });
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  const handleDelete = async (id: string) => {
    try {
        await deleteDoc(doc(db, 'invitations', id));
        toast({ variant: 'destructive', title: 'Invitación eliminada' });
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };
  
  const getBadgeVariant = (status: InvitationStatus, isApproved?: boolean) => {
    if (isApproved) return 'default';
    switch (status) {
      case 'completed':
        return 'secondary';
      case 'pending':
        return 'destructive';
      default:
        return 'outline';
    }
  }

  const getStatusText = (status: InvitationStatus, isApproved?: boolean) => {
    if (isApproved) return 'Aprobada';
    return status === 'completed' ? 'Completada' : 'Pendiente';
  }

  return (
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
        <h1 className="text-4xl font-bold font-headline text-primary">Gestión de Invitaciones</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Revisa, aprueba y gestiona las invitaciones del programa de fidelización.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Invitaciones</CardTitle>
          <CardDescription>
            Aprueba las invitaciones cuando el invitado se haya registrado para dar puntos al invitador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="Pendiente">Pendientes</TabsTrigger>
              <TabsTrigger value="Completada">Completadas y Aprobadas</TabsTrigger>
              <TabsTrigger value="Todas">Todas</TabsTrigger>
            </TabsList>
            <div className="border rounded-lg mt-4 overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Email Invitador</TableHead>
                    <TableHead>Email Invitado</TableHead>
                    <TableHead>Equipo</TableHead>
                    <TableHead>Fecha Invitación</TableHead>
                    <TableHead>Fecha Completada</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading && (
                        Array.from({length: 5}).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                            </TableRow>
                        ))
                    )}
                    {!loading && filteredInvitations.length > 0 ? (
                        filteredInvitations.map((invitation) => (
                            <TableRow key={invitation.id}>
                                <TableCell>{invitation.inviterEmail}</TableCell>
                                <TableCell>{invitation.inviteeEmail}</TableCell>
                                <TableCell>{invitation.teamName || '-'}</TableCell>
                                <TableCell>{invitation.createdAt ? format(invitation.createdAt.toDate(), 'dd/MM/yyyy', { locale: es }) : '-'}</TableCell>
                                <TableCell>{invitation.completedAt ? format(invitation.completedAt.toDate(), 'dd/MM/yyyy', { locale: es }) : '-'}</TableCell>
                                <TableCell>
                                    <Badge variant={getBadgeVariant(invitation.status, invitation.isApproved)}
                                           className={cn({
                                               'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300': invitation.status === 'completed' && !invitation.isApproved,
                                               'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300': invitation.isApproved,
                                           })}>
                                        {getStatusText(invitation.status, invitation.isApproved)}
                                    </Badge>
                                </TableCell>
                                <TableCell className="flex items-center gap-2">
                                     <Button variant="outline" size="sm" onClick={() => handleApprove(invitation.id)} disabled={invitation.isApproved || invitation.status !== 'completed'}>
                                        <ThumbsUp className="mr-2 h-4 w-4" /> 
                                        {invitation.isApproved ? 'Aprobada' : 'Aprobar'}
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Esta acción eliminará permanentemente la invitación de {invitation.inviteeEmail}. No se puede deshacer.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(invitation.id)}>
                                                    Sí, eliminar
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : null}
                    {!loading && filteredInvitations.length === 0 && (
                         <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                No hay invitaciones en esta categoría.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
                </Table>
            </div>
             {error && <p className="text-destructive mt-4">Error al cargar invitaciones: {error.message}</p>}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
