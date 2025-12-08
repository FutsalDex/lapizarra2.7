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

// ====================================================================
// 1. SessionBasicPreview (Mantenido)
// ====================================================================

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
                    <div key={ex.id} className="border border-gray-400 rounded-lg overflow-hidden break-inside-avoid flex flex-col" style={{ pageBreakInside: 'avoid' }}>
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


// ====================================================================
// 2. SessionProPreview (Estructura de paginación correcta)
// ====================================================================

const SessionProPreview = React.forwardRef<HTMLDivElement, { sessionData: any; exercises: Exercise[]; teamName: string }>(
  ({ sessionData, exercises, teamName }, ref) => {

    const getExercisesByIds = (ids: string[]) => {
      if (!ids || ids.length === 0) return [];
      return ids.map(id => exercises.find(ex => ex.id === id)).filter(Boolean) as Exercise[];
    };

    const allSessionExercises = [
      ...getExercisesByIds(sessionData.initialExercises),
      ...getExercisesByIds(sessionData.mainExercises),
      ...getExercisesByIds(sessionData.finalExercises)
    ];

    // --- LÓGICA DE PAGINACIÓN ---
    const pages = [];
    let currentExIndex = 0;

    // 1. Primera Página: Cabecera + 2 Ejercicios
    const firstPageEx = allSessionExercises.slice(currentExIndex, currentExIndex + 2);
    if (firstPageEx.length > 0) {
      pages.push({
        isHeaderPage: true,
        exercises: firstPageEx,
      });
      currentExIndex += 2;
    }

    // 2. Resto de Páginas: Grupos de 3 Ejercicios
    const remainingExercises = allSessionExercises.slice(currentExIndex);
    for (let i = 0; i < remainingExercises.length; i += 3) {
      pages.push({
        isHeaderPage: false,
        exercises: remainingExercises.slice(i, i + 3),
      });
    }

    const ExerciseCard = ({ ex }: { ex: Exercise }) => (
      // Asegurar que la tarjeta no se rompa internamente con CSS en línea
      <div className="border border-black break-inside-avoid text-[10px]" style={{ pageBreakInside: 'avoid', marginBottom: '16px' }}>
        <div className="bg-gray-200 text-center py-1 border-b border-black">
          <h3 className="font-bold uppercase">{ex['Ejercicio']}</h3>
        </div>
        <div className="grid grid-cols-10">
          <div className="col-span-4 border-r border-black">
            <div className="border-b border-black aspect-[1.7/1] flex items-center justify-center p-1">
              <Image src={ex['Imagen']} alt={ex['Ejercicio']} width={200} height={120} unoptimized={true} />
            </div>
            <div className="grid grid-cols-2 border-b border-black">
              <div className="border-r border-black p-1 text-center">
                <p className="font-bold">Tiempo</p>
                <p>{ex['Duración (min)']}'</p>
              </div>
              <div className="p-1 text-center">
                <p className="font-bold">Jugadores</p>
                <p>{ex['Número de jugadores']}</p>
              </div>
            </div>
            <div className="p-1 text-center">
              <p className="font-bold">Material</p>
              <p className="break-words">{ex['Espacio y materiales necesarios']}</p>
            </div>
          </div>

          <div className="col-span-6 space-y-2 p-2">
            <div>
              <p className="font-bold">Descripción:</p>
              <p className="text-justify">{ex['Descripción de la tarea']}</p>
            </div>
            <div>
              <p className="font-bold">Objetivos:</p>
              <p className="text-justify">{ex['Objetivos']}</p>
            </div>
          </div>
        </div>
      </div>
    );

    return (
      <div ref={ref}> {/* Contenedor raíz para que el handler procese sus hijos */}
        {pages.map((page, pageIdx) => (
          // CONTENEDOR DE CADA PÁGINA A4 con SALTO DE PÁGINA FORZADO
          <div 
            key={pageIdx} 
            className="bg-white text-gray-900 p-8" 
            style={{ 
              width: '210mm', 
              minHeight: '297mm',
              boxSizing: 'border-box',
              // Forzar el salto de página en todos excepto en el último
              pageBreakAfter: pageIdx < pages.length - 1 ? 'always' : 'auto' 
            }}
          >
            
            {/* 1. Cabecera (SOLO si es la primera página) */}
            {page.isHeaderPage && (
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px solid black', marginBottom: '16px' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '30%', padding: '0', verticalAlign: 'top', borderRight: '2px solid black' }}>
                      <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                          <tr><td style={{ padding: '4px' }}><span className="font-bold">Equipo:</span> {teamName}</td></tr>
                          <tr><td style={{ padding: '4px' }}><span className="font-bold">Instalación:</span> {sessionData.facility || 'Pista Numancia'}</td></tr>
                          <tr><td style={{ padding: '4px' }}><span className="font-bold">Microciclo:</span> {sessionData.microcycle || '1'}</td></tr>
                          <tr><td style={{ padding: '4px' }}><span className="font-bold">Nº Sesión:</span> {sessionData.sessionNumber || '1'}</td></tr>
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
            )}

            {/* 2. Ejercicios para la página actual */}
            <div className="space-y-4">
              {page.exercises.map(ex => <ExerciseCard ex={ex} key={ex.id} />)}
            </div>

            <p className="text-center text-xs mt-8 text-gray-500">
                {pageIdx === pages.length - 1 ? 'Powered by LaPizarra' : ''}
            </p>
          </div>
        ))}
      </div>
    );
  }
);
SessionProPreview.displayName = "SessionProPreview";


// ====================================================================
// 3. Vistas Normales (Mantenidas)
// ====================================================================

const SessionView = ({ exercises }: { exercises: Exercise[] }) => {
  if (!exercises || exercises.length === 0) return null;
  
  return (
    <div className="space-y-6">
      {exercises.map((exercise) => (
        <Card key={exercise.id} className="overflow-hidden">
             <div className="grid grid-cols-10 gap-6 p-6">
                <div className="col-span-5 space-y-4">
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
                <div className="col-span-5 space-y-4">
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

// ====================================================================
// 4. Página Principal y Handler de Descarga (CORREGIDO)
// ====================================================================

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
    const root = type === 'basic' ? basicPrintRef.current : proPrintRef.current;
    if (!root) return;

    setIsDownloading(true);
    setIsPrintDialogOpen(false);

    try {
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        // CORRECCIÓN CRUCIAL: Filtrar solo nodos de elemento (los divs de página A4)
        const elementPages = Array.from(root.children).filter(
            (node): node is HTMLElement => node.nodeType === 1
        ) as HTMLElement[];

        for (let i = 0; i < elementPages.length; i++) {
            const page = elementPages[i];

            const canvas = await html2canvas(page, {
                scale: 2, // Usar buena resolución
                useCORS: true,
                logging: false,
            });

            const imgData = canvas.toDataURL('image/png');
            const imgWidth = pdf.internal.pageSize.getWidth();
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // Condición corregida: Agregar página SOLO a partir de la segunda iteración (i=1)
            if (i > 0) { 
                pdf.addPage();
            }
            
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        }

        pdf.save(`sesion-${type}-${sessionId}.pdf`);

        toast({
            title: "El archivo PDF se ha descargado",
        });

    } catch (error) {
        console.error("Error al generar PDF", error);
        toast({
            variant: "destructive",
            title: "Fallo al descargar",
            description: "No se pudo generar el PDF.",
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
        {/* Contenedores ocultos para la generación del PDF */}
        <div ref={basicPrintRef}>
            <SessionBasicPreview sessionData={session} exercises={allExercises} teamName={teamName} />
        </div>
        <div ref={proPrintRef}>
            <SessionProPreview sessionData={session} exercises={allExercises} teamName={teamName} />
        </div>
      </div>
    </>
  );
}
