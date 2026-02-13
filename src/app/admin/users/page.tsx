
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, doc, deleteDoc, updateDoc, Timestamp, getFirestore, writeBatch, query, where, getDocs } from 'firebase/firestore';
import app from '@/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import AuthGuard from '@/components/auth/AuthGuard';

type User = {
  uid: string;
  displayName: string;
  email: string;
  subscription?: 'Básico' | 'Pro';
  subscriptionEndDate?: Timestamp;
};

const db = getFirestore(app);

export default function GestionUsuariosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'Básico' | 'Pro'>('Pro');

  const { toast } = useToast();
  
  const [usersSnapshot, loading, error] = useCollection(collection(db, 'users'));

  const users: User[] = usersSnapshot?.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User)) || [];

  const filteredUsers = users.filter(user =>
    (user.displayName && user.displayName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDeleteUser = async (userToDelete: User) => {
    const { uid, email } = userToDelete;
    
    if (!uid || !email) {
        toast({ variant: "destructive", title: "Error", description: "Falta información del usuario para eliminar." });
        return;
    }

    toast({ title: "Eliminando usuario...", description: "Este proceso puede tardar un momento." });

    try {
        const batch = writeBatch(db);

        // 1. Delete user's exercises
        const exercisesQuery = query(collection(db, 'exercises'), where('userId', '==', uid));
        const exercisesSnapshot = await getDocs(exercisesQuery);
        exercisesSnapshot.forEach(doc => batch.delete(doc.ref));

        // 2. Delete user's sent invitations
        const invitationsQuery = query(collection(db, 'invitations'), where('inviterEmail', '==', email));
        const invitationsSnapshot = await getDocs(invitationsQuery);
        invitationsSnapshot.forEach(doc => batch.delete(doc.ref));

        // 3. Delete user's sessions
        const sessionsQuery = query(collection(db, 'sessions'), where('userId', '==', uid));
        const sessionsSnapshot = await getDocs(sessionsQuery);
        sessionsSnapshot.forEach(doc => batch.delete(doc.ref));
        
        // 4. Delete user's matches
        const matchesQuery = query(collection(db, 'matches'), where('userId', '==', uid));
        const matchesSnapshot = await getDocs(matchesQuery);
        matchesSnapshot.forEach(doc => batch.delete(doc.ref));
        
        // 5. Delete user's conversations
        const conversationsQuery = query(collection(db, 'conversations'), where('userId', '==', uid));
        const conversationsSnapshot = await getDocs(conversationsQuery);
        conversationsSnapshot.forEach(doc => batch.delete(doc.ref));

        // 6. Delete teams owned by the user
        const ownedTeamsQuery = query(collection(db, 'teams'), where('ownerId', '==', uid));
        const ownedTeamsSnapshot = await getDocs(ownedTeamsQuery);
        ownedTeamsSnapshot.forEach(doc => batch.delete(doc.ref));

        // 7. Remove user from teams they are a member of (but don't own)
        const memberTeamsQuery = query(collection(db, 'teams'), where('memberIds', 'array-contains', uid));
        const memberTeamsSnapshot = await getDocs(memberTeamsQuery);
        memberTeamsSnapshot.forEach(teamDoc => {
            const teamData = teamDoc.data();
            const updatedMemberIds = teamData.memberIds.filter((id: string) => id !== uid);
            batch.update(teamDoc.ref, { memberIds: updatedMemberIds });
        });

        // 8. Finally, delete the user profile
        batch.delete(doc(db, "users", uid));

        await batch.commit();
        
        toast({ variant: "destructive", title: "Usuario eliminado completamente", description: "Se han borrado el perfil y todos sus datos asociados." });

    } catch (error: any) {
        toast({ variant: "destructive", title: "Error al eliminar", description: `Ocurrió un error: ${error.message}` });
    }
  };

  const handleActivateSubscription = async () => {
    if (!selectedUser) return;

    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    try {
      await updateDoc(doc(db, 'users', selectedUser.uid), {
        subscription: selectedPlan,
        subscriptionEndDate: Timestamp.fromDate(endDate),
      });
      toast({ title: 'Suscripción actualizada', description: `Plan ${selectedPlan} activado para ${selectedUser.email}.` });
      setSelectedUser(null);
    } catch(e: any) {
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
          <h1 className="text-4xl font-bold font-headline text-primary">Gestión de Usuarios</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Lista de todos los usuarios de la plataforma y gestión de suscripciones.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Todos los Usuarios</CardTitle>
            <CardDescription>{loading ? 'Cargando...' : `${users.length} usuarios en total.`}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Fin Suscripción</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                      Array.from({length: 5}).map((_, i) => (
                          <TableRow key={i}>
                              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                              <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                              <TableCell><div className="flex gap-2"><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /></div></TableCell>
                          </TableRow>
                      ))
                  )}
                  {!loading && filteredUsers.map((user, index) => (
                    <TableRow key={user.uid}>
                      <TableCell className="font-medium">{user.displayName || '-'}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.subscription ? <Badge>{user.subscription}</Badge> : <Badge variant="outline">N/A</Badge>}
                      </TableCell>
                      <TableCell>{user.subscriptionEndDate ? format(user.subscriptionEndDate.toDate(), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Dialog onOpenChange={(open) => !open && setSelectedUser(null)}>
                            <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => setSelectedUser(user)}>
                                      <Edit className="h-4 w-4" />
                                  </Button>
                            </DialogTrigger>
                            {selectedUser && (
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Gestionar Suscripción</DialogTitle>
                                        <DialogDescription>
                                            Activa un plan anual para {selectedUser.email}.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-4 space-y-4">
                                          <div className="space-y-2">
                                              <Label htmlFor="plan">Plan</Label>
                                              <Select value={selectedPlan} onValueChange={(value) => setSelectedPlan(value as 'Básico' | 'Pro')}>
                                                  <SelectTrigger>
                                                      <SelectValue placeholder="Selecciona un plan..." />
                                                  </SelectTrigger>
                                                  <SelectContent>
                                                      <SelectItem value="Básico">Básico (19.95€/año)</SelectItem>
                                                      <SelectItem value="Pro">Pro (39.95€/año)</SelectItem>
                                                  </SelectContent>
                                              </Select>
                                          </div>
                                    </div>
                                    <DialogFooter>
                                          <DialogClose asChild>
                                              <Button variant="outline">Cancelar</Button>
                                          </DialogClose>
                                        <Button onClick={handleActivateSubscription}>Activar Suscripción por 1 Año</Button>
                                    </DialogFooter>
                                </DialogContent>
                            )}
                          </Dialog>
                          
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
                                  Esta acción eliminará permanentemente al usuario {user.email} y todos sus datos asociados (equipos, ejercicios, etc.). No se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(user)}>
                                  Sí, eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && filteredUsers.length === 0 && (
                      <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">No se encontraron usuarios.</TableCell>
                      </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            {error && <p className="text-destructive mt-4">Error al cargar usuarios: {error.message}</p>}
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
