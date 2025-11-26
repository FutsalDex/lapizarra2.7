
"use client";

import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, getFirestore } from 'firebase/firestore';
import { app } from '@/firebase/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

const db = getFirestore(app);

type Team = {
  id: string;
  name: string;
  club: string;
  competition: string;
  ownerId: string; // Assuming we'll want to maybe show owner info later
};

export default function TeamsPage() {
  const [teamsSnapshot, loading, error] = useCollection(collection(db, 'teams'));
  
  const teamsData = teamsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team)) || [];

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
        <h1 className="text-4xl font-bold font-headline text-primary">Gestión de Equipos</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Lista de todos los equipos creados en la plataforma.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todos los Equipos</CardTitle>
          <CardDescription>{loading ? 'Cargando equipos...' : `${teamsData.length} equipos en total.`}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre del Equipo</TableHead>
                  <TableHead>Club</TableHead>
                  <TableHead>Competición</TableHead>
                  <TableHead>Propietario (ID)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                    Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                        </TableRow>
                    ))
                )}
                {!loading && teamsData.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell>{team.club}</TableCell>
                    <TableCell>{team.competition || '-'}</TableCell>
                    <TableCell className="font-mono text-xs">{team.ownerId}</TableCell>
                  </TableRow>
                ))}
                 {!loading && teamsData.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            No se encontraron equipos.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
            {error && <p className="text-destructive mt-4">Error: {error.message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
