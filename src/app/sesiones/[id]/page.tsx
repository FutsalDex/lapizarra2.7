

"use client";

import { useParams } from 'next/navigation';
import { useDocumentData, useCollection } from 'react-firebase-hooks/firestore';
import { doc, Timestamp, getFirestore, collection } from 'firebase/firestore';
import app from '@/firebase/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Clock, Users, Target, ListChecks, Edit, Printer, Download, ArrowLeft, Loader2, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import React, { useRef, useState, useMemo } from 'react';
import type { Exercise } from '@/lib/data';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';


const db = getFirestore(app);

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
      {exercises.map((exercise) => (
        <Card key={exercise.id} className="overflow-hidden">
             <div className="grid grid-cols-10 gap-6 p-6">
                <div className="col-span-10 md:col-span-3 space-y-4">
                    <div className="relative aspect-video w-full mx-auto">
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
                         <div className="flex items-start gap-2">
                            <Package className="w-4 h-4 text-muted-foreground mt-1" />
                            <span><span className="font-semibold">Material:</span> {exercise['Espacio y materiales necesarios']}</span>
                        </div>
                    </div>
                </div>
                <div className="col-span-10 md:col-span-7 space-y-4">
                    <h3 className="text-xl font-bold font-headline break-words">{exercise['Ejercicio']}</h3>
                    <div>
                        <h4 className="font-semibold text-lg">Descripción</h4>
                        <p className="text-sm text-muted-foreground mt-2 text-justify">{exercise['Descripción de la tarea']}</p>
                    </div>
                    <div className="pt-2">
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

const SessionProPreview = React.forwardRef<
  HTMLDivElement,
  { sessionData: any; exercises: Exercise[]; teamName: string; }
>(({ sessionData, exercises, teamName }, ref) => {
  
  const getExercisesByIds = (ids: string[] = []): Exercise[] => {
    return ids.map(id => exercises.find(ex => ex.id === id)).filter((ex): ex is Exercise => !!ex);
  };

  const allSessionExercises = [
    ...getExercisesByIds(sessionData.initialExercises),
    ...getExercisesByIds(sessionData.mainExercises),
    ...getExercisesByIds(sessionData.finalExercises),
  ];

  const firstPageExercises = allSessionExercises.slice(0, 3);
  const remainingExercises = allSessionExercises.slice(3);
  const exercisePages: Exercise[][] = [];
  for (let i = 0; i < remainingExercises.length; i += 4) {
    exercisePages.push(remainingExercises.slice(i, i + 4));
  }

  const sessionDateFormatted = sessionData.date ? format(new Date(sessionData.date), 'dd/MM/yyyy', { locale: es }) : 'N/A';

  const ExerciseCard = ({ exercise }: { exercise: Exercise }) => (
    <div className="exercise-block">
        <img src={exercise['Imagen']} alt={exercise['Ejercicio']} className="exercise-img" />
        <div className="exercise-info">
            <p className="exercise-title">{exercise['Ejercicio']}</p>
            <div className="exercise-meta">
                <p><strong>Duración:</strong> {exercise['Duración (min)']} min</p>
                <p><strong>Jugadores:</strong> {exercise['Número de jugadores']}</p>
            </div>
            <p className="exercise-sub">Descripción</p>
            <p>{exercise['Descripción de la tarea']}</p>
            <p className="exercise-sub">Objetivos</p>
            <p>{exercise['Objetivos']}</p>
        </div>
    </div>
  );

  return (
    <div ref={ref}>
        {/* First Page */}
        <div className="print-page p-8 bg-white text-black">
            <div className="session-title">Sesión de Entrenamiento</div>
            <div className="grid grid-cols-10 gap-x-4 mb-4 text-sm">
                <div className="col-span-3 space-y-1">
                    <p><strong>Equipo:</strong> {teamName}</p>
                    <p><strong>Instalación:</strong> {sessionData.facility || 'N/A'}</p>
                </div>
                <div className="col-span-3 space-y-1">
                     <p><strong>Microciclo:</strong> {sessionData.microcycle || 'N/A'}</p>
                    <p><strong>Nº Sesión:</strong> {sessionData.sessionNumber || 'N/A'}</p>
                </div>
                <div className="col-span-4 space-y-1">
                    <p><strong>Fecha:</strong> {sessionDateFormatted}</p>
                </div>
            </div>
            <div className="border-t-2 border-b-2 border-black py-2 mb-4">
                <h4 className="font-bold text-center">Objetivos de la Sesión</h4>
                 <ul className="list-disc list-inside text-sm mt-1">
                    {(sessionData.objectives || []).map((obj: string, index: number) => (
                        <li key={index}>{obj}</li>
                    ))}
                </ul>
            </div>
            <div className="space-y-4">
                {firstPageExercises.map(ex => <ExerciseCard key={ex.id} exercise={ex} />)}
            </div>
        </div>

        {/* Subsequent Pages */}
        {exercisePages.map((page, pageIndex) => (
            <div key={pageIndex} className="print-page p-8 bg-white text-black">
                 <div className="space-y-4">
                    {page.map(ex => <ExerciseCard key={ex.id} exercise={ex} />)}
                </div>
            </div>
        ))}
    </div>
  );
});
SessionProPreview.displayName = 'SessionProPreview';


export default function SesionDetallePage() {
  const params = useParams();
  const sessionId = params.id as string;
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  
  const proLayoutRef = useRef<HTMLDivElement>(null);
  
  const [sessionSnapshot, loadingSession, errorSession] = useDocumentData(doc(db, 'sessions', sessionId));
  const [exercisesSnapshot, loadingExercises, errorExercises] = useCollection(collection(db, 'exercises'));
  
  const teamId = sessionSnapshot?.teamId;
  const [teamSnapshot, loadingTeam, errorTeam] = useDocumentData(teamId ? doc(db, 'teams', teamId) : null);

  const isLoading = loadingSession || loadingExercises || loadingTeam;
  
  const handleDownloadPdf = async (layout: 'basic' | 'pro') => {
    toast({
        title: 'Preparando PDF...',
        description: 'La descarga comenzará en breve. Por favor, espera.',
    });
    setIsDownloading(true);
    setIsPrintDialogOpen(false);

    const content = layout === 'pro'
        ? document.querySelector('#session-pro-layout-for-print')
        : document.querySelector('#session-visible-layout');

    if (!content) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudo encontrar el contenido para generar el PDF.',
        });
        setIsDownloading(false);
        return;
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();

    const pagesToPrint = content.querySelectorAll('.print-page');

    for (let i = 0; i < pagesToPrint.length; i++) {
        const page = pagesToPrint[i] as HTMLElement;

        // Wait for images on the current page to load
        const images = Array.from(page.getElementsByTagName('img'));
        const promises = images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise<void>(resolve => {
                img.onload = () => resolve();
                img.onerror = () => resolve(); // Resolve even if image fails to load
            });
        });
        await Promise.all(promises);
        
        const canvas = await html2canvas(page, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
        });

        const imgData = canvas.toDataURL('image/png');
        const height = (canvas.height * pdfWidth) / canvas.width;

        if (i > 0) {
            pdf.addPage();
        }
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, height);
    }
    
    pdf.save(`sesion-${layout}-${sessionId}.pdf`);
    setIsDownloading(false);
  };


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
  
  const sessionDataForPreview = {
      ...session,
      date: sessionDate,
  };


  return (
    <>
      <div id="session-visible-layout" className="container mx-auto px-4 py-8">
        <div className="print-page">
            <div className="flex justify-between items-center mb-6 no-print">
              <div>
                <h1 className="text-4xl font-bold font-headline">Sesión de entrenamiento</h1>
                <p className="text-lg text-muted-foreground mt-1">{sessionDate ? format(sessionDate, "eeee, d 'de' MMMM 'de' yyyy", { locale: es }) : 'Fecha no especificada'}</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <Link href="/sesiones"><ArrowLeft className="mr-2" />Volver</Link>
                </Button>
                
                <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                          <Printer className="mr-2" />
                          Descargar PDF
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-xl">
                        <DialogHeader>
                            <DialogTitle>Elige Formato de Ficha</DialogTitle>
                            <DialogDescription>
                                Selecciona la plantilla para descargar tu sesión en formato PDF.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <div className="flex flex-col gap-2 items-center">
                                <Image src="https://i.ibb.co/hJ2DscG7/basico.png" alt="Ficha Básica" width={200} height={283} className="rounded-md border"/>
                                <Button className="w-full" onClick={() => handleDownloadPdf('basic')} disabled={isDownloading}>
                                    {isDownloading ? <Loader2 className="mr-2 animate-spin"/> : <Download className="mr-2" />}
                                    Descargar Básica
                                </Button>
                            </div>
                            <div className="flex flex-col gap-2 items-center">
                                <Image src="https://i.ibb.co/pBKy6D20/pro.png" alt="Ficha Pro" width={200} height={283} className="rounded-md border"/>
                                <Button className="w-full" onClick={() => handleDownloadPdf('pro')} disabled={isDownloading}>
                                    {isDownloading ? <Loader2 className="mr-2 animate-spin"/> : <Download className="mr-2" />}
                                    Descargar Pro
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                <Button asChild>
                  <Link href={`/sesiones/${sessionId}/editar`}><Edit className="mr-2" />Editar</Link>
                </Button>
              </div>
            </div>
            
            <div className="max-w-4xl mx-auto space-y-8 bg-background">
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

       {/* Hidden div for PDF generation content */}
       <div id="session-pro-layout-for-print" className="hidden">
         <SessionProPreview ref={proLayoutRef} sessionData={sessionDataForPreview} exercises={allExercises} teamName={teamName} />
       </div>
    </>
  );
}
