"use client";

import { useParams } from 'next/navigation';
import { useDocumentData, useCollection } from 'react-firebase-hooks/firestore';
import { doc, Timestamp, getFirestore, collection } from 'firebase/firestore';
import app from '@/firebase/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { ArrowLeft, BarChart, History, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import Image from 'next/image';
import { Clock, Users, Target, ListChecks, Edit, Printer, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import React, { useRef, useState } from 'react';
import type { Exercise } from '@/lib/data';


const db = getFirestore(app);


const SessionView = ({ exercises }: { exercises: Exercise[] }) => {
  if (!exercises || exercises.length === 0) return null;
  
  return (
    <div className="space-y-6">
      {exercises.map((exercise) => (
        <Card key={exercise.id} className="overflow-hidden">
             <div className="grid grid-cols-10 gap-6 p-6">
                <div className="col-span-10 md:col-span-5 space-y-4">
                    <div className="relative min-h-[190px] bg-muted rounded-md aspect-video">
                        <Image
                        src={exercise['Imagen']}
                        alt={`Táctica para ${exercise['Ejercicio']}`}
                        fill
                        className="object-contain p-2"
                        />
                    </div>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span><span className="font-semibold">Duración:</span> {exercise['Duración (min)']} min</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span><span className="font-semibold">Jugadores:</span> {exercise['Número de jugadores']}</span>
                        </div>
                    </div>
                </div>
                <div className="col-span-10 md:col-span-5 space-y-4">
                    <h3 className="text-xl font-bold font-headline break-words">{exercise['Ejercicio']}</h3>
                    <div>
                        <h4 className="font-semibold text-lg">Descripción</h4>
                        <p className="text-sm text-muted-foreground mt-2 text-justify">{exercise['Descripción de la tarea']}</p>
                    </div>
                    <div className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Target className="w-4 h-4 text-primary" />
                            <h4 className="font-semibold">Objetivos del Ejercicio</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">{exercise['Objetivos']}</p>
                    </div>
                </div>
            </div>
        </Card>
      ))}
    </div>
  );
};


const PhaseSection = ({ title, exercises }: { title: string; exercises: Exercise[] }) => {
  if (!exercises || exercises.length === 0) {
    return (
         <div className="space-y-6">
            <h2 className="text-2xl font-bold font-headline text-primary">{title}</h2>
            <p className="text-muted-foreground text-sm">No hay ejercicios asignados a esta fase.</p>
        </div>
    )
  };
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold font-headline text-primary">{title}</h2>
      <SessionView exercises={exercises} />
    </div>
  );
};


export default function SesionDetallePage() {
  const params = useParams();
  const sessionId = params.id as string;
  
  const [sessionSnapshot, loadingSession, errorSession] = useDocumentData(doc(db, 'sessions', sessionId));
  const [exercisesSnapshot, loadingExercises, errorExercises] = useCollection(collection(db, 'exercises'));
  
  const teamId = sessionSnapshot?.teamId;
  const [teamSnapshot, loadingTeam, errorTeam] = useDocumentData(teamId ? doc(db, 'teams', teamId) : null);

  const isLoading = loadingSession || loadingExercises || loadingTeam;


  if (isLoading) {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="flex justify-between items-center mb-6">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-48" />
            </div>
            <div className="space-y-8">
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
    );
  }

  if (errorSession || !sessionSnapshot) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold">Sesión no encontrada</h1>
        <p className="text-muted-foreground mt-2">{errorSession?.message || 'La sesión que buscas no existe.'}</p>
        <Link href="/sesiones">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Mis Sesiones
          </Button>
        </Link>
      </div>
    );
  }
  
  const session = { id: sessionId, ...sessionSnapshot };
  const allExercises = exercisesSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exercise)) || [];

  const getExercisesByIds = (ids: string[]) => {
    if (!ids || ids.length === 0) return [];
    return ids.map(id => allExercises.find(ex => ex.id === id)).filter(Boolean) as Exercise[];
  };

  const initialExercises = getExercisesByIds(session.initialExercises || []);
  const mainExercises = getExercisesByIds(session.mainExercises || []);
  const finalExercises = getExercisesByIds(session.finalExercises || []);
  
  const sessionDate = (session.date as Timestamp)?.toDate();
  const teamName = teamSnapshot?.name || 'No especificado';

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold font-headline">Sesión de entrenamiento</h1>
            <p className="text-lg text-muted-foreground mt-1">{sessionDate ? format(sessionDate, "eeee, d 'de' MMMM 'de' yyyy", { locale: es }) : 'Fecha no especificada'}</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/sesiones"><ArrowLeft className="mr-2" />Volver</Link>
            </Button>
            
            <Button asChild>
              <Link href={`/sesiones/${sessionId}/editar`}><Edit className="mr-2" />Editar</Link>
            </Button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          
          <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Detalles y Objetivos de la Sesión</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-10 gap-6">
                        <div className="col-span-10 md:col-span-3 space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="font-semibold w-24">Equipo:</span>
                                <span className="text-muted-foreground">{teamName}</span>
                            </div>
                             <div className="flex items-center gap-2">
                                <span className="font-semibold w-24">Instalación:</span>
                                <span className="text-muted-foreground">{session.facility}</span>
                            </div>
                             <div className="flex items-center gap-2">
                                <span className="font-semibold w-24">Microciclo:</span>
                                <span className="text-muted-foreground">{session.microcycle || '-'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold w-24">Nº Sesión:</span>
                                <span className="text-muted-foreground">{session.sessionNumber || '-'}</span>
                            </div>
                        </div>
                        <div className="col-span-10 md:col-span-7">
                            <div className="flex items-center gap-2 mb-2">
                                <ListChecks className="w-5 h-5 text-primary" />
                                <h4 className="font-semibold">Objetivos</h4>
                            </div>
                            {Array.isArray(session.objectives) && session.objectives.length > 0 ? (
                                <ul className="space-y-2 list-disc pl-5 text-sm">
                                    {session.objectives.map((obj: string, index: number) => (
                                        <li key={index} className="text-muted-foreground">{obj}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-muted-foreground text-sm">No hay objetivos específicos definidos.</p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-12">
                <PhaseSection title="Fase Inicial (Calentamiento)" exercises={initialExercises} />
                <PhaseSection title="Fase Principal" exercises={mainExercises} />
                <PhaseSection title="Fase Final (Vuelta a la Calma)" exercises={finalExercises} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}