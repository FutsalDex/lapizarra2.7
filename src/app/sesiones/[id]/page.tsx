

"use client";

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, Edit, Printer, Users, Clock, Target, ListChecks, Download, Loader2 } from 'lucide-react';
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
import { useState, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const db = getFirestore(app);

const SessionBasicPreview = React.forwardRef<HTMLDivElement, { sessionData: any, exercises: Exercise[], teamName: string }>(({ sessionData, exercises, teamName }, ref) => {
    const getExercisesByIds = (ids: string[]) => {
        if (!ids || ids.length === 0) return [];
        return ids.map(id => exercises.find(ex => ex.id === id)).filter(Boolean) as Exercise[];
    };
    
    const allSessionExercises = [
        ...getExercisesByIds(sessionData.initialExercises),
        ...getExercisesByIds(sessionData.mainExercises),
        ...getExercisesByIds(sessionData.finalExercises)
    ];

    return (
        <div ref={ref} className="bg-white text-gray-900 p-4" style={{ width: '210mm', fontSize: '10px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black', marginBottom: '16px' }}>
                <tbody>
                    <tr>
                        <td style={{ width: '30%', padding: '0', verticalAlign: 'top', borderRight: '2px solid black' }}>
                             <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                    <tr><td style={{ padding: '4px', height: '25%' }}><span className="font-bold">Equipo:</span> {teamName}</td></tr>
                                    <tr><td style={{ padding: '4px', height: '25%', wordBreak: 'break-word' }}><span className="font-bold">Instalación:</span> {sessionData.facility || 'Pista Numancia'}</td></tr>
                                    <tr><td style={{ padding: '4px', height: '25%' }}><span className="font-bold">Microciclo:</span> {sessionData.microcycle || '1'}</td></tr>
                                    <tr><td style={{ padding: '4px', height: '25%' }}><span className="font-bold">Nº Sesión:</span> {sessionData.sessionNumber || '1'}</td></tr>
                                </tbody>
                            </table>
                        </td>
                        <td style={{ width: '70%', padding: '8px', verticalAlign: 'top' }}>
                            <div className="font-bold mb-1">Objetivos</div>
                            <ul className="list-disc list-inside pl-2 leading-tight">
                                {(sessionData.objectives || []).map((obj: string, index: number) => (
                                    <li key={index}>{obj}</li>
                                ))}
                            </ul>
                        </td>
                    </tr>
                </tbody>
            </table>
            <div className="grid grid-cols-2 gap-2">
                {allSessionExercises.map(ex => (
                    <div key={ex.id} className="border border-gray-400 rounded-lg overflow-hidden break-inside-avoid flex flex-col">
                        <div className="px-1 text-center border-b flex-shrink-0">
                            <p className="text-[11px] font-semibold break-words leading-tight">{ex.Ejercicio}</p>
                        </div>
                        <div className="relative aspect-[1.88/1] w-full bg-muted flex-grow">
                            <Image src={ex.Imagen} alt={ex.Ejercicio} layout="fill" objectFit="contain" className="p-4" unoptimized={true} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});
SessionBasicPreview.displayName = "SessionBasicPreview";

const SessionProPreview = React.forwardRef<HTMLDivElement, { sessionData: any, exercises: Exercise[], teamName: string }>(({ sessionData, exercises, teamName }, ref) => {
    const getExercisesByIds = (ids: string[]) => {
        if (!ids || ids.length === 0) return [];
        return ids.map(id => exercises.find(ex => ex.id === id)).filter(Boolean) as Exercise[];
    };

    const PhaseSectionPro = ({ title, exercises }: { title: string; exercises: Exercise[] }) => {
        if (exercises.length === 0) return null;
        return (
            <div className="space-y-4">
                <div className="bg-gray-800 text-white text-center py-1">
                    <h3 className="font-bold tracking-widest">{title}</h3>
                </div>
                {exercises.map(ex => (
                    <Card key={ex.id} className="overflow-hidden">
                       <div className="px-1 text-center border-b">
                            <p className="text-[9px] font-semibold break-words">{ex.Ejercicio}</p>
                        </div>
                        <CardContent className="p-2 grid grid-cols-2 gap-2">
                            <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center">
                                <Image src={ex['Imagen']} alt={ex['Ejercicio']} layout="fill" objectFit="contain" unoptimized={true} />
                            </div>
                            <div className="text-xs space-y-2">
                                <div>
                                    <p className="font-bold">Descripción</p>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm">{ex['Descripción de la tarea']}</p>
                                </div>
                                <div>
                                    <p className="font-bold">Objetivos</p>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm">{ex['Objetivos']}</p>
                                </div>
                            </div>
                        </CardContent>
                         <CardFooter className="p-2 text-xs text-center text-gray-900">
                            <div className="flex gap-2 w-full items-stretch">
                                <div className="border p-1 rounded-sm flex flex-col justify-center w-[15%]">
                                    <p className="font-bold">Tiempo</p>
                                    <p>{ex['Duración (min)']}</p>
                                </div>
                                <div className="border p-1 rounded-sm flex flex-col justify-center w-[15%]">
                                    <p className="font-bold">Jugadores</p>
                                    <p>{ex['Número de jugadores']}</p>
                                </div>
                                <div className="border p-1 rounded-sm flex flex-col justify-center w-[70%]">
                                    <p className="font-bold">Material</p>
                                    <p className="break-words">{ex['Espacio y materiales necesarios']}</p>
                                </div>
                            </div>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        );
    };

    return (
         <div ref={ref} className="bg-white text-gray-900 p-8" style={{ width: '210mm', fontSize: '10px' }}>
            <div className="space-y-6">
                 <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black', marginBottom: '16px' }}>
                    <tbody>
                        <tr>
                            <td style={{ width: '30%', padding: '0', verticalAlign: 'top', borderRight: '2px solid black' }}>
                                <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse' }}>
                                    <tbody>
                                        <tr><td style={{ padding: '4px', height: '25%' }}><span className="font-bold">Equipo:</span> {teamName}</td></tr>
                                        <tr><td style={{ padding: '4px', height: '25%', wordBreak: 'break-word' }}><span className="font-bold">Instalación:</span> {sessionData.facility || 'Pista Numancia'}</td></tr>
                                        <tr><td style={{ padding: '4px', height: '25%' }}><span className="font-bold">Microciclo:</span> {sessionData.microcycle || '1'}</td></tr>
                                        <tr><td style={{ padding: '4px', height: '25%' }}><span className="font-bold">Nº Sesión:</span> {sessionData.sessionNumber || '1'}</td></tr>
                                    </tbody>
                                </table>
                            </td>
                            <td style={{ width: '70%', padding: '8px', verticalAlign: 'top' }}>
                                <div className="font-bold mb-1">Objetivos</div>
                                <ul className="list-disc list-inside pl-2">
                                    {(sessionData.objectives || []).map((obj: string, index: number) => (
                                        <li key={index}>{obj}</li>
                                    ))}
                                </ul>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div className="space-y-6 pt-0">
                    <PhaseSectionPro title="FASE INICIAL" exercises={getExercisesByIds(sessionData.initialExercises)} />
                    <PhaseSectionPro title="FASE PRINCIPAL" exercises={getExercisesByIds(sessionData.mainExercises)} />
                    <PhaseSectionPro title="FASE FINAL" exercises={getExercisesByIds(sessionData.finalExercises)} />
                </div>

                <p className="text-center text-xs mt-8 text-gray-500 pt-0">Powered by LaPizarra</p>
            </div>
        </div>
    );
});
SessionProPreview.displayName = "SessionProPreview";


const SessionView = ({ exercises }: { exercises: Exercise[] }) => {
  if (!exercises || exercises.length === 0) return null;
  
  return (
    <div className="space-y-6">
      {exercises.map((exercise) => (
        <Card key={exercise.id} className="overflow-hidden">
             <div className="grid grid-cols-10 gap-6 p-6">
                <div className="col-span-4 space-y-4">
                    <div className="relative min-h-[190px] bg-muted rounded-md aspect-[1.88/1]">
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
                <div className="col-span-6 space-y-4">
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
  if (!exercises || exercises.length === 0) return null;
  
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
  const { toast } = useToast();
  const basicPrintRef = useRef<HTMLDivElement>(null);
  const proPrintRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  
  const [sessionSnapshot, loadingSession, errorSession] = useDocumentData(doc(db, 'sessions', sessionId));
  const [exercisesSnapshot, loadingExercises, errorExercises] = useCollection(collection(db, 'exercises'));
  
  const teamId = sessionSnapshot?.teamId;
  const [teamSnapshot, loadingTeam, errorTeam] = useDocumentData(teamId ? doc(db, 'teams', teamId) : null);

  const isLoading = loadingSession || loadingExercises || loadingTeam;

  const handleDownloadPdf = async (type: 'basic' | 'pro') => {
    const elementToPrint = type === 'basic' ? basicPrintRef.current : proPrintRef.current;
    if (!elementToPrint) return;

    setIsDownloading(true);
    setIsPrintDialogOpen(false); // Close dialog on download start

    try {
      const canvas = await html2canvas(elementToPrint, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
  
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      const imgProps = pdf.getImageProperties(canvas);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = imgHeight;
      let position = 0;
  
      pdf.addImage(canvas, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();
  
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }
      
      pdf.save(`sesion-${type}-${sessionId}.pdf`);
      toast({
        title: "El archivo PDF se ha descargado",
      });
    } catch (error) {
      console.error('Error al generar el PDF:', error);
      toast({
        variant: 'destructive',
        title: 'Fallo en la Descarga',
        description: 'Hubo un problema al generar el PDF.',
      });
    } finally {
      setIsDownloading(false);
    }
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
            
            <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
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
                            Elige el formato de ficha que deseas descargar. El diseño está optimizado para A4.
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
      <div style={{ position: 'absolute', left: '-9999px', top: '0', zIndex: -100 }}>
         <SessionBasicPreview ref={basicPrintRef} sessionData={session} exercises={allExercises} teamName={teamName} />
         <SessionProPreview ref={proPrintRef} sessionData={session} exercises={allExercises} teamName={teamName} />
      </div>
    </>
  );
}









    
    

