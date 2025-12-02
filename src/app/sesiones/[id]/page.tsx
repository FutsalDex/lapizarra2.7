
"use client";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const db = getFirestore(app);

// Componente oculto para la impresión de la página completa
const SessionPageForPrint = ({ session, exercises, teamName, printRef }: { session: any; exercises: Exercise[]; teamName: string; printRef: React.RefObject<HTMLDivElement> }) => {
    if (!session) return null;
    const sessionDate = (session.date as Timestamp)?.toDate();

    const getExercisesByIds = (ids: string[] = []) => ids.map(id => exercises.find(ex => ex.id === id)).filter(Boolean) as Exercise[];

    const initialExercises = getExercisesByIds(session.initialExercises);
    const mainExercises = getExercisesByIds(session.mainExercises);
    const finalExercises = getExercisesByIds(session.finalExercises);
    
    return (
        <div ref={printRef} className="bg-white text-black p-8" style={{ width: '210mm' }}>
             <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Detalles y Objetivos de la Sesión</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-10 gap-6">
                            <div className="col-span-3 space-y-2 text-sm">
                                <div className="flex gap-2">
                                    <span className="font-semibold">Equipo:</span>
                                    <span className="text-gray-600">{teamName}</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="font-semibold">Instalación:</span>
                                    <span className="text-gray-600">{session.facility}</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="font-semibold">Microciclo:</span>
                                    <span className="text-gray-600">{session.microcycle || '-'}</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className="font-semibold">Nº Sesión:</span>
                                    <span className="text-gray-600">{session.sessionNumber || '-'}</span>
                                </div>
                            </div>
                            <div className="col-span-7">
                                <div className="flex items-center gap-2 mb-2">
                                    <ListChecks className="w-5 h-5 text-primary" />
                                    <h4 className="font-semibold">Objetivos</h4>
                                </div>
                                <ul className="space-y-2 list-disc pl-5 text-sm">
                                    {(session.objectives || []).map((obj: string, i: number) => (
                                        <li key={i} className="text-gray-600">{obj}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {initialExercises.length > 0 && (
                    <div>
                        <h2 className="text-2xl font-bold font-headline text-primary mb-4">Fase Inicial (Calentamiento)</h2>
                        <SessionProView exercises={initialExercises} />
                    </div>
                )}
                {mainExercises.length > 0 && (
                    <div>
                        <h2 className="text-2xl font-bold font-headline text-primary mb-4">Fase Principal</h2>
                        <SessionProView exercises={mainExercises} />
                    </div>
                )}
                {finalExercises.length > 0 && (
                    <div>
                        <h2 className="text-2xl font-bold font-headline text-primary mb-4">Fase Final (Vuelta a la Calma)</h2>
                        <SessionProView exercises={finalExercises} />
                    </div>
                )}
            </div>
        </div>
    );
};


const SessionPrintPreview = ({ session, exercises, teamName, sessionRef }: { session: any, exercises: Exercise[], teamName: string, sessionRef: React.RefObject<HTMLDivElement> }) => {
  if (!session) return null;

  const getExercisesByIds = (ids: string[] = []) => ids.map(id => exercises.find(ex => ex.id === id)).filter(Boolean) as Exercise[];

  const initialExercises = getExercisesByIds(session.initialExercises);
  const mainExercises = getExercisesByIds(session.mainExercises);
  const finalExercises = getExercisesByIds(session.finalExercises);
  
  const sessionDate = (session.date as Timestamp)?.toDate();
  
  const pages = useMemo(() => {
    const allPhases = [
      { title: 'Fase Inicial', exercises: initialExercises },
      { title: 'Fase Principal', exercises: mainExercises },
      { title: 'Fase Final', exercises: finalExercises },
    ];

    const pagesContent: { title?: string; exercises: Exercise[] }[][] = [];
    let currentPageContent: { title?: string; exercises: Exercise[] }[] = [];
    let exerciseCountOnPage = 0;
    
    const exercisesPerPage = (isFirstPage: boolean) => isFirstPage ? 2 : 3;

    allPhases.forEach(phase => {
        if (phase.exercises.length === 0) return;

        let phaseTitleAdded = false;
        let exercisesInPhase = [...phase.exercises];
        
        while(exercisesInPhase.length > 0) {
            const limit = exercisesPerPage(pagesContent.length === 0);
            
            if (!phaseTitleAdded) {
                currentPageContent.push({ title: phase.title, exercises: [] });
                phaseTitleAdded = true;
            }

            const spaceOnPage = limit - exerciseCountOnPage;
            const exercisesToAdd = exercisesInPhase.splice(0, spaceOnPage);
            currentPageContent.push({ exercises: exercisesToAdd });
            exerciseCountOnPage += exercisesToAdd.length;

            if (exerciseCountOnPage >= limit && exercisesInPhase.length > 0) {
                pagesContent.push(currentPageContent);
                currentPageContent = [];
                exerciseCountOnPage = 0;
                phaseTitleAdded = false;
            }
        }
    });

    if (currentPageContent.length > 0) {
        pagesContent.push(currentPageContent);
    }
    
    return pagesContent;

  }, [initialExercises, mainExercises, finalExercises]);


  return (
    <div ref={sessionRef} className="bg-white text-black">
      {pages.map((pageItems, pageIndex) => (
        <div key={pageIndex} className="p-8" style={{ width: '210mm', minHeight: '297mm', pageBreakAfter: 'always', position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <div className="flex-grow">
            {pageIndex === 0 && (
                 <div className="border-b-2 border-black pb-4 mb-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-3xl font-bold" style={{ letterSpacing: '0.5px' }}>{session.name}</h1>
                            <p className="text-lg text-gray-700" style={{ letterSpacing: '0.5px' }}>{teamName}</p>
                            <p className="text-md text-gray-600" style={{ letterSpacing: '0.5px' }}>{session.facility || 'Instalación no especificada'}</p>
                        </div>
                        <div className="text-right text-base">
                            <p>{sessionDate ? format(sessionDate, "d 'de' MMMM 'de' yyyy", { locale: es }) : ''}</p>
                            <p><span className="font-semibold">Sesión:</span> #{session.sessionNumber}</p>
                        </div>
                    </div>
                    <div>
                        <h2 className="font-bold text-xl mb-2">Objetivos</h2>
                        <ul className="list-disc pl-5 text-base space-y-1 text-gray-800" style={{ lineHeight: 1.6, letterSpacing: '0.5px', wordSpacing: '1px' }}>
                            {(session.objectives || []).map((obj: string, i: number) => <li key={i}>{obj}</li>)}
                        </ul>
                    </div>
                </div>
            )}
            
            {pageItems.map((item, itemIndex) => (
              <div key={itemIndex} className="space-y-4">
                {item.title && <h3 className="font-bold text-2xl mt-6 border-b-2 border-gray-400 pb-1">{item.title}</h3>}
                {item.exercises.map(ex => (
                    <div key={ex.id} className="p-3 border border-gray-300 rounded-lg" style={{ breakInside: 'avoid', marginBottom: '1.5rem' }}>
                        <h4 className="font-bold text-lg mb-2" style={{ letterSpacing: '0.5px' }}>{ex['Ejercicio']}</h4>
                        <div className="flex gap-4">
                        <div className="w-1/3">
                            <div className="relative aspect-video bg-gray-100 rounded-md">
                            <Image src={ex['Imagen']} alt={ex['Ejercicio']} layout="fill" objectFit="contain" />
                            </div>
                        </div>
                        <div className="w-2/3 text-sm space-y-2">
                            <div>
                                <p className="font-semibold" style={{ letterSpacing: '0.5px' }}>Descripción:</p>
                                <p className="text-gray-600" style={{ lineHeight: 1.6, letterSpacing: '0.5px', wordSpacing: '1px' }}>{ex['Descripción de la tarea']}</p>
                            </div>
                            <div>
                                <p className="font-semibold" style={{ letterSpacing: '0.5px' }}>Detalles:</p>
                                <p className="text-gray-600" style={{ lineHeight: 1.6, letterSpacing: '0.5px', wordSpacing: '1px' }}>Duración: {ex['Duración (min)']} min | Jugadores: {ex['Número de jugadores']}</p>
                            </div>
                        </div>
                        </div>
                    </div>
                ))}
              </div>
            ))}
           </div>
          <div style={{ position: 'absolute', bottom: '1rem', right: '2rem', fontSize: '0.8rem', color: '#666' }}>
            página {pageIndex + 1} de {pages.length}
          </div>
        </div>
      ))}
    </div>
  );
};


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
  const { toast } = useToast();
  const fichaPrintRef = useRef<HTMLDivElement>(null);
  const pagePrintRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPageDownloading, setIsPageDownloading] = useState(false);
  
  const [sessionSnapshot, loadingSession, errorSession] = useDocumentData(doc(db, 'sessions', sessionId));
  const [exercisesSnapshot, loadingExercises, errorExercises] = useCollection(collection(db, 'exercises'));
  
  const teamId = sessionSnapshot?.teamId;
  const [teamSnapshot, loadingTeam, errorTeam] = useDocumentData(teamId ? doc(db, 'teams', teamId) : null);

  const isLoading = loadingSession || loadingExercises || loadingTeam;

  const handleDownloadPdf = async () => {
    if (!fichaPrintRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await html2canvas(fichaPrintRef.current, {
        scale: 2,
        useCORS: true,
      });
  
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(canvas);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = imgHeight;
      let position = 0;
  
      pdf.addImage(canvas, 'PNG', 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;
  
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(canvas, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }
      
      pdf.save(`sesion-${sessionId}.pdf`);
      toast({
        title: 'Descarga Completa',
        description: 'Tu PDF ha sido descargado con éxito.',
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

  const handleDownloadPageAsPdf = async () => {
    const elementToCapture = pagePrintRef.current;
    if (!elementToCapture) return;

    setIsPageDownloading(true);
    try {
        const canvas = await html2canvas(elementToCapture, {
            scale: 2,
            useCORS: true,
            backgroundColor: window.getComputedStyle(document.body).getPropertyValue('background-color'),
        });
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const canvasAspectRatio = canvas.width / canvas.height;
        let imgWidth = pdfWidth;
        let imgHeight = pdfWidth / canvasAspectRatio;

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(canvas, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
            position -= pdfHeight;
            pdf.addPage();
            pdf.addImage(canvas, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
        }
        
        pdf.save(`pagina-sesion-${sessionId}.pdf`);

        toast({
            title: "Descarga de página completa",
            description: "La captura de la página se ha descargado como PDF."
        });

    } catch (error) {
        console.error("Error al generar PDF de la página:", error);
        toast({
            variant: "destructive",
            title: "Fallo en la descarga",
            description: "Hubo un problema al generar el PDF de la página."
        });
    } finally {
        setIsPageDownloading(false);
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
  const teamName = teamSnapshot?.name || session.teamId || 'No especificado';

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
                            Revisa la sesión antes de guardarla como PDF. El diseño está optimizado para un formato A4.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[70vh] p-4 border rounded-md bg-gray-100">
                        <div className="flex justify-center">
                           <div style={{ display: 'none' }}>
                                <SessionPrintPreview session={session} exercises={allExercises} teamName={teamName} sessionRef={fichaPrintRef} />
                            </div>
                             <p>Vista previa no disponible en este modo.</p>
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                         <Button onClick={handleDownloadPdf} disabled={isDownloading}>
                            {isDownloading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Descargando...
                              </>
                            ) : (
                              <>
                                <Download className="mr-2" />
                                Descargar PDF
                              </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Button onClick={handleDownloadPageAsPdf} disabled={isPageDownloading}>
                {isPageDownloading ? <Loader2 className="mr-2 animate-spin" /> : <Download className="mr-2" />}
                Prueba PDF
            </Button>

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
          <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Detalles y Objetivos de la Sesión</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-10 gap-6">
                        <div className="col-span-10 md:col-span-3 space-y-2 text-sm">
                            <div className="flex gap-2">
                                <span className="font-semibold">Equipo:</span>
                                <span className="text-muted-foreground">{teamName}</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="font-semibold">Instalación:</span>
                                <span className="text-muted-foreground">{session.facility}</span>
                            </div>
                             <div className="flex gap-2">
                                <span className="font-semibold">Microciclo:</span>
                                <span className="text-muted-foreground">{session.microcycle || '-'}</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="font-semibold">Nº Sesión:</span>
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
                <PhaseSection title="Fase Inicial (Calentamiento)" exercises={initialExercises} viewMode={viewMode} />
                <PhaseSection title="Fase Principal" exercises={mainExercises} viewMode={viewMode} />
                <PhaseSection title="Fase Final (Vuelta a la Calma)" exercises={finalExercises} viewMode={viewMode} />
            </div>
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: '-9999px', top: '0' }}>
         <SessionPageForPrint session={session} exercises={allExercises} teamName={teamName} printRef={pagePrintRef} />
      </div>
    </>
  );
}
