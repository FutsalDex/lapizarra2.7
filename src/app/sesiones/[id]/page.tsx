
"use client";

import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ArrowLeft, Edit, Printer, Users, Clock, Target, ListChecks, Download } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useDocumentData, useCollection } from 'react-firebase-hooks/firestore';
import { doc, collection, getFirestore, DocumentSnapshot } from 'firebase/firestore';
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

// helpers para escapar (seguridad básica)
function escapeHtml(str: string) {
  if (!str) return '';
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
function escapeAttr(s: string) {
  return escapeHtml(s).replaceAll('"', '&quot;');
}

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

  const handlePrint = async () => {
      if (!sessionSnapshot || !exercisesSnapshot) return;

      const allExercises = exercisesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Exercise));
      const getExercisesByIds = (ids: string[] = []) => ids.map(id => allExercises.find(ex => ex.id === id)).filter(Boolean) as Exercise[];
      
      const session = { id: sessionSnapshot.id, ...sessionSnapshot };
      const initial = getExercisesByIds(session.initialExercises || []);
      const main = getExercisesByIds(session.mainExercises || []);
      const final = getExercisesByIds(session.finalExercises || []);
      const sessionDate = (session.date as Timestamp)?.toDate?.();
      const teamName = teamSnapshot?.name || session.teamId || 'No especificado';

      const exercisesToHtml = (exs: Exercise[]) =>
        exs.map(ex => `
          <div style="page-break-inside: avoid; margin-bottom: 1.5rem; padding:0.75rem; border-radius:6px; border:1px solid #e6e6e6;">
            <h4 style="margin:0 0 .4rem; font-size:1.05rem">${escapeHtml(ex['Ejercicio'] || '')}</h4>
            <div style="display:flex; gap:1rem; align-items:flex-start;">
              ${ex['Imagen'] ? `<img src="${escapeAttr(ex['Imagen'])}" alt="${escapeAttr(ex['Ejercicio'] || '')}" style="max-width:200px; width:30%; height:auto; object-fit:contain;"/>` : ''}
              <div style="flex:1;">
                <p style="margin:.2rem 0;"><strong>Descripción:</strong> ${escapeHtml(ex['Descripción de la tarea'] || '')}</p>
                <p style="margin:.2rem 0;"><strong>Objetivos:</strong> ${escapeHtml(ex['Objetivos'] || '')}</p>
                <p style="margin:.2rem 0;"><strong>Duración:</strong> ${escapeHtml(String(ex['Duración (min)'] || '-'))} min</p>
              </div>
            </div>
          </div>
        `).join('');

      const printHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Ficha - ${escapeHtml(session.name || '')}</title>
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <style>
            body { font-family: Arial, Helvetica, sans-serif; color:#111; padding:16px; }
            h1 { font-size:20px; margin:0 0 8px; }
            h2 { margin-top:16px; }
            img { max-width:100%; height:auto; display:block; }
            @media print {
              body { -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(session.name || '')}</h1>
          <div style="margin:.5rem 0 .75rem; color:#555;">${sessionDate ? format(sessionDate, "eeee, d 'de' MMMM 'de' yyyy", { locale: es }) : ''}</div>
          <div style="margin-bottom: .75rem;">
            <div><strong>Equipo:</strong> ${escapeHtml(teamName)}</div>
            <div><strong>Instalación:</strong> ${escapeHtml(session.facility || '-')}</div>
          </div>

          <h2>Objetivos</h2>
          <div>${Array.isArray(session.objectives) ? `<ul>${session.objectives.map((o:string) => `<li>${escapeHtml(o)}</li>`).join('')}</ul>` : '<p>-</p>'}</div>

          <h2>Fase Inicial</h2>
          ${exercisesToHtml(initial)}

          <h2>Fase Principal</h2>
          ${exercisesToHtml(main)}

          <h2>Fase Final</h2>
          ${exercisesToHtml(final)}
        </body>
      </html>`;

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.visibility = 'hidden';
      document.body.appendChild(iframe);

      const waitForImages = (win: Window, timeout = 3000) => {
        return new Promise<void>((resolve) => {
          try {
            const imgs = Array.from(win.document.images || []);
            if (imgs.length === 0) return resolve();
            let loaded = 0;
            const done = () => { if (++loaded >= imgs.length) resolve(); };
            const timer = setTimeout(() => resolve(), timeout);
            imgs.forEach(img => {
              if (img.complete) done();
              else {
                img.addEventListener('load', done, { once: true });
                img.addEventListener('error', done, { once: true });
              }
            });
          } catch (e) {
            setTimeout(() => resolve(), 300);
          }
        });
      };

      iframe.onload = async () => {
        try {
          const win = iframe.contentWindow!;
          await waitForImages(win, 4000);
          win.focus();
          setTimeout(() => {
            try {
              win.print();
            } catch (err) {
              console.error('Print error:', err);
            } finally {
              setTimeout(() => {
                try { document.body.removeChild(iframe); } catch (e) {}
              }, 500);
            }
          }, 200);
        } catch (err) {
          console.error('Error en onload iframe:', err);
          setTimeout(() => { try { document.body.removeChild(iframe); } catch (e) {} }, 500);
        }
      };

      if ('srcdoc' in iframe) {
        (iframe as HTMLIFrameElement).srcdoc = printHtml;
      } else {
        const doc = iframe.contentWindow?.document;
        doc?.open();
        doc?.write(printHtml);
        doc?.close();
      }
    };
  
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
  
  const session = { id: sessionSnapshot.id, ...sessionSnapshot };
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

  return (
    <>
      <div className="non-printable">
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
                             <Button onClick={handlePrint}>
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
      </div>
      <div className="printable-content">
          <div className="p-8">
            <PrintableContent />
          </div>
      </div>
    </>
  );
}
