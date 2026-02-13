
"use client";

import { useState, useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, getFirestore } from 'firebase/firestore';
import { app } from '@/firebase/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Star } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import AuthGuard from '@/components/auth/AuthGuard';
import { Badge } from '@/components/ui/badge';

const db = getFirestore(app);

type UserProfile = {
  uid: string;
  displayName: string;
  email: string;
  subscription?: 'Básico' | 'Pro';
};
type Exercise = {
  userId: string;
};
type Invitation = {
  inviterEmail: string;
  isApproved?: boolean;
};

type ProcessedUser = UserProfile & {
  uploadedExercises: number;
  successfulInvites: number;
  points: number;
  savings: number;
};

export default function SuscripcionesPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const [usersSnapshot, loadingUsers] = useCollection(collection(db, 'users'));
  const [exercisesSnapshot, loadingExercises] = useCollection(collection(db, 'exercises'));
  const [invitationsSnapshot, loadingInvitations] = useCollection(collection(db, 'invitations'));

  const processedData: ProcessedUser[] = useMemo(() => {
    if (loadingUsers || loadingExercises || loadingInvitations || !usersSnapshot || !exercisesSnapshot || !invitationsSnapshot) return [];

    const users = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...(doc.data() as Omit<UserProfile, 'uid'>) }));
    const exercises = exercisesSnapshot.docs.map(doc => doc.data() as Exercise);
    const invitations = invitationsSnapshot.docs.map(doc => doc.data() as Invitation);

    return users.map(user => {
      const uploadedExercises = exercises.filter(ex => ex.userId === user.uid).length;
      const successfulInvites = invitations.filter(inv => inv.inviterEmail === user.email && inv.isApproved).length;

      const points = (uploadedExercises * 10) + (successfulInvites * 25);
      const savings = points * (2.50 / 75);

      return {
        ...user,
        uploadedExercises,
        successfulInvites,
        points,
        savings,
      };
    });
  }, [usersSnapshot, exercisesSnapshot, invitationsSnapshot, loadingUsers, loadingExercises, loadingInvitations]);
  
  const filteredData = useMemo(() => {
      return processedData.filter(user => 
        (user.displayName && user.displayName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
      ).sort((a,b) => b.points - a.points);
  }, [processedData, searchTerm]);

  const isLoading = loadingUsers || loadingExercises || loadingInvitations;

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
          <h1 className="text-4xl font-bold font-headline text-primary">Gestión de Suscripciones</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Consulta el estado del programa de fidelización, puntos y actividad de cada usuario.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resumen de Fidelización de Usuarios</CardTitle>
            <CardDescription>{isLoading ? 'Cargando datos...' : `Mostrando datos de ${filteredData.length} usuarios.`}</CardDescription>
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
                    <TableHead>Usuario</TableHead>
                    <TableHead className="text-center">Plan</TableHead>
                    <TableHead className="text-center">Ejercicios</TableHead>
                    <TableHead className="text-center">Invitados</TableHead>
                    <TableHead className="text-center">Puntos</TableHead>
                    <TableHead className="text-right">Ahorro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell className="text-center"><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
                        <TableCell className="text-center"><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                        <TableCell className="text-center"><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                        <TableCell className="text-center"><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  )}
                  {!isLoading && filteredData.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell>
                        <div className="font-medium">{user.displayName}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        {user.subscription ? <Badge>{user.subscription}</Badge> : <Badge variant="outline">N/A</Badge>}
                      </TableCell>
                      <TableCell className="text-center font-medium">{user.uploadedExercises}</TableCell>
                      <TableCell className="text-center font-medium">{user.successfulInvites}</TableCell>
                      <TableCell className="text-center">
                        <div className="font-bold text-lg flex items-center justify-center gap-1">
                          {user.points} <Star className="w-4 h-4 text-yellow-500"/>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {user.savings.toFixed(2)}€
                      </TableCell>
                    </TableRow>
                  ))}
                   {!isLoading && filteredData.length === 0 && (
                      <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                              No se encontraron usuarios con ese criterio.
                          </TableCell>
                      </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthGuard>
  );
}
