
"use client";

import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, Edit, Printer, Users, Clock, Target, ListChecks, Download } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useDocumentData, useCollection } from 'react-firebase-hooks/firestore';
import { doc, collection, getFirestore } from 'firebase/firestore';
import { app } from '@/firebase/config';
import { Exercise } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

const db = getFirestore(app);

const SessionProView = ({ exercises }: { exercises: Exercise[] }) => {
  if (!exercises || exercises.length === 0) return null;
  
  return (
    <div className="space-y-6">
      {exercises.map((exercise) => (
        <Card key={exercise.id} className="overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
            <div className="md:col-span-1 space-y-4">
              <div className="relative min-h-[200px] bg-muted rounded-md">
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

            <div className="md:col-span-2 space-y-4">
                <div>
                  <h3 className="text-xl font-bold font-headline">{exercise['Ejercicio']}</h3>
                  <p className="text-muted-foreground mt-2 text-justify">{exercise['Descripción de la tarea']}</p>
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


const SessionBasicView = ({ exercises }: { exercises: Exercise[] }) => {
    if (!exercises || exercises.length === 0) return null;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {exercises.map((exercise) => (
                 <Card key={exercise.id} className="overflow-hidden group relative">
                    <div className="relative aspect-video w-full">
                     <Image src={exercise['Imagen']} alt={exercise['Ejercicio']} layout="fill" objectFit="contain" className="p-2" />
                    </div>
                    <CardFooter className="p-2 text-center border-t bg-card">
                         <p className="text-xs font-semibold truncate">{exercise['Ejercicio']}</p>
                    </CardFooter>
                </Card>
            ))}
        </div>
    )
}

const PhaseSection = ({ title, exercises, viewMode }: { title: string; exercises: Exercise[], viewMode: 'pro' | 'basic' }) => {
  if (!exercises || exercises.length === 0) return null;
  
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold font-headline text-primary">{title}</h2>
      {viewMode === 'pro' ? <SessionProView exercises={exercises} /> : <SessionBasicView exercises={exercises} />}
    </div>
  );
};

export default function SesionDetallePage() {
  const params = useParams();
  const sessionId = params.id as string;
  const [viewMode, setViewMode] = useState<'pro' | 'basic'>('pro');
  
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
  
  const session = sessionSnapshot;
  const allExercises = exercisesSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exercise)) || [];

  const getExercisesByIds = (ids: string[]) => {
    if (!ids || ids.length === 0) return [];
    return ids.map(id => allExercises.find(ex => ex.id === id)).filter(Boolean) as Exercise[];
  };

  const initialExercises = getExercisesByIds(session.initialExercises || []);
  const mainExercises = getExercisesByIds(session.mainExercises || []);
  const finalExercises = getExercisesByIds(session.finalExercises || []);
  
  const sessionDate = (session.date as Timestamp)?.toDate();
  const teamName = teamSnapshot?.name || session.teamId || 'No especificado';

  const PrintableContent = () => (
     <div className="space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>Detalles de la Sesión</CardTitle>
            </CardHeader>
            <CardContent>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <p className="font-semibold">Equipo</p>
                        <p className="text-muted-foreground">{teamName}</p>
                    </div>
                    <div>
                        <p className="font-semibold">Instalación</p>
                        <p className="text-muted-foreground">{session.facility}</p>
                    </div>
                     <div>
                        <p className="font-semibold">Microciclo</p>
                        <p className="text-muted-foreground">{session.microcycle || '-'}</p>
                    </div>
                     <div>
                        <p className="font-semibold">Nº Sesión</p>
                        <p className="text-muted-foreground">{session.sessionNumber || '-'}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
        
        <Card>
             <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-primary" />
                  Objetivos de la Sesión
                </CardTitle>
            </CardHeader>
            <CardContent>
                {Array.isArray(session.objectives) && session.objectives.length > 0 ? (
                  <ul className="space-y-2 list-disc pl-5">
                    {session.objectives.map((obj: string, index: number) => (
                      <li key={index} className="text-muted-foreground">{obj}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No hay objetivos específicos definidos para esta sesión.</p>
                )}
            </CardContent>
        </Card>

        <div className="space-y-12">
            <PhaseSection title="Fase Inicial (Calentamiento)" exercises={initialExercises} viewMode={viewMode} />
            <PhaseSection title="Fase Principal" exercises={mainExercises} viewMode={viewMode} />
            <PhaseSection title="Fase Final (Vuelta a la Calma)" exercises={finalExercises} viewMode={viewMode} />
        </div>
    </div>
  );

  const PrintableContentForPrint = () => {
    const exercisesToHtml = (exs: Exercise[]) =>
    exs.map(ex => `
        <div style="page-break-inside: avoid; margin-bottom: 1.5rem; padding:0.75rem; border-radius:6px; border:1px solid #e6e6e6;">
        <h4 style="margin:0 0 .4rem; font-size:1.05rem; font-weight:bold;">${ex['Ejercicio'] || ''}</h4>
        <div style="display:flex; gap:1rem; align-items:flex-start;">
            ${ex['Imagen'] ? `<img src="${ex['Imagen']}" alt="${ex['Ejercicio'] || ''}" style="max-width:200px; width:30%; height:auto; object-fit:contain;"/>` : ''}
            <div style="flex:1;">
            <p style="margin:.2rem 0;"><strong>Descripción:</strong> ${ex['Descripción de la tarea'] || ''}</p>
            <p style="margin:.2rem 0;"><strong>Objetivos:</strong> ${ex['Objetivos'] || ''}</p>
            <p style="margin:.2rem 0;"><strong>Duración:</strong> ${String(ex['Duración (min)'] || '-')} min</p>
            </div>
        </div>
        </div>
    `).join('');

    return (
        <div className="space-y-8 print-page">
            <div>
                <h1 className="text-2xl font-bold">{session.name}</h1>
                <p className="text-sm text-muted-foreground">{sessionDate ? format(sessionDate, "eeee, d 'de' MMMM 'de' yyyy", { locale: es }) : ''}</p>
            </div>
            <div>
                <div><strong>Equipo:</strong> {teamName}</div>
                <div><strong>Instalación:</strong> {session.facility || '-'}</div>
                <div><strong>Microciclo:</strong> {session.microcycle || '-'}</div>
                <div><strong>Nº Sesión:</strong> {session.sessionNumber || '-'}</div>
            </div>
            <div>
                <h3 className="font-semibold">Objetivos</h3>
                {Array.isArray(session.objectives) ? (
                    <ul>{session.objectives.map((o: string, i: number) => <li key={i}>{o}</li>)}</ul>
                ) : <p>-</p>}
            </div>
            <div className="space-y-6">
                <h2>Fase Inicial</h2>
                <div dangerouslySetInnerHTML={{ __html: exercisesToHtml(initialExercises) }} />
                <h2>Fase Principal</h2>
                <div dangerouslySetInnerHTML={{ __html: exercisesToHtml(mainExercises) }} />
                <h2>Fase Final</h2>
                <div dangerouslySetInnerHTML={{ __html: exercisesToHtml(finalExercises) }} />
            </div>
        </div>
    );
  };


  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-4xl font-bold">{session.name}</h1>
            <p className="text-lg text-muted-foreground mt-1">{sessionDate ? format(sessionDate, "eeee, d 'de' MMMM 'de' yyyy", { locale: es }) : 'Fecha no especificada'}</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/sesiones"><ArrowLeft className="mr-2" />Volver</Link>
            </Button>
            
             <Dialog>
                <DialogTrigger asChild>
                    <Button>
                      <Printer className="mr-2" />
                      Imprimir Ficha
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Vista Previa de la Ficha de Sesión</DialogTitle>
                        <DialogDescription>
                            Revisa la sesión antes de imprimirla o guardarla como PDF.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[70vh] p-6 border rounded-md">
                        <PrintableContent />
                    </ScrollArea>
                    <DialogFooter>
                         <Button onClick={() => window.print()}>
                            <Download className="mr-2" />
                            Descargar PDF
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Button asChild>
              <Link href={`/sesiones/${sessionId}/editar`}><Edit className="mr-2" />Editar</Link>
            </Button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex justify-end">
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'pro' | 'basic')}>
                <TabsList>
                    <TabsTrigger value="pro">Vista Pro</TabsTrigger>
                    <TabsTrigger value="basic">Vista Básica</TabsTrigger>
                </TabsList>
            </Tabs>
          </div>
          <PrintableContent />
        </div>
      </div>
      <div id="print-area" className="hidden">
        <PrintableContentForPrint />
      </div>
    </>
  );
}

    