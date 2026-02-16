"use client";

import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ClipboardList, Target, Youtube, Tag, Workflow, Clock, Users, Lightbulb, Repeat, Package } from 'lucide-react';
import Link from 'next/link';
import { useDocument } from 'react-firebase-hooks/firestore';
import { doc, getFirestore } from 'firebase/firestore';
import app from '@/firebase/config';
import { Exercise } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';

const db = getFirestore(app);

const getYouTubeEmbedUrl = (url: string | undefined): string | null => {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        let videoId: string | null = null;

        if (urlObj.hostname === 'youtu.be') {
            videoId = urlObj.pathname.slice(1);
        } else if (urlObj.hostname.includes('youtube.com')) {
            if (urlObj.pathname.startsWith('/watch')) {
                videoId = urlObj.searchParams.get('v');
            } else if (urlObj.pathname.startsWith('/embed/')) {
                videoId = urlObj.pathname.split('/')[2];
            } else if (urlObj.pathname.startsWith('/shorts/')) {
                videoId = urlObj.pathname.split('/')[2];
            }
        }
        
        if (videoId) {
            // Clean up potential extra params from videoId
            return `https://www.youtube.com/embed/${videoId.split('?')[0].split('&')[0]}`;
        }
    } catch (e) {
        console.error("Invalid YouTube URL", e);
    }
    return null;
};

const DetailItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: React.ReactNode }) => (
    <div className="flex items-start gap-3">
        <div className="text-primary mt-1">{icon}</div>
        <div>
            <p className="font-semibold">{label}</p>
            <p className="text-muted-foreground text-sm">{value}</p>
        </div>
    </div>
);


export default function EjercicioDetallePage() {
  const params = useParams();
  const exerciseId = params.id as string;

  const [snapshot, loading, error] = useDocument(doc(db, 'exercises', exerciseId));

  if (loading) {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8">
                <Skeleton className="h-10 w-64" />
            </div>
             <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <Skeleton className="aspect-video w-full rounded-lg" />
                    <Skeleton className="aspect-video w-full rounded-lg" />
                </div>
                <div className="space-y-6">
                    <Skeleton className="h-12 w-3/4 mb-4" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
             </div>
        </div>
    );
  }

  if (error || !snapshot || !snapshot.exists()) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold">Ejercicio no encontrado</h1>
        <p className="text-muted-foreground">
            {error ? `Error: ${error.message}` : 'El ejercicio que buscas no existe o ha sido eliminado.'}
        </p>
        <Link href="/ejercicios">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a la Biblioteca
          </Button>
        </Link>
      </div>
    );
  }

  const exercise = { id: snapshot.id, ...snapshot.data() } as Exercise;
  const embedUrl = getYouTubeEmbedUrl(exercise.youtubeUrl);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Button asChild variant="outline">
          <Link href="/ejercicios">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a la Biblioteca
          </Link>
        </Button>
      </div>

       <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-x-12 gap-y-8">
            <div className="space-y-8">
                <div className="relative aspect-video w-full rounded-lg overflow-hidden border">
                    <Image
                        src={exercise['Imagen'] || `https://picsum.photos/seed/ex${exercise.id}/600/400`}
                        alt={exercise['Ejercicio']}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-contain p-2"
                    />
                </div>
                {embedUrl && (
                    <Card id="video" className="scroll-mt-24">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl font-headline">
                                <Youtube className="w-5 h-5 text-primary" />
                                Vídeo del Ejercicio
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="aspect-video">
                                <iframe
                                    width="100%"
                                    height="100%"
                                    src={embedUrl}
                                    title="YouTube video player"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    allowFullScreen
                                    className="rounded-lg"
                                ></iframe>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <div className="space-y-6">
                <div>
                    <div className="flex flex-wrap gap-2 mb-2">
                        <Badge variant="secondary" className="flex items-center gap-1.5">
                            <Tag className="w-3 h-3"/>
                            {exercise['Categoría']}
                        </Badge>
                         <Badge variant="outline" className="flex items-center gap-1.5">
                            <Workflow className="w-3 h-3"/>
                            Fase: {exercise['Fase']}
                        </Badge>
                    </div>
                    <h1 className="font-headline text-3xl md:text-4xl font-bold text-foreground">
                    {exercise['Ejercicio']}
                    </h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">Detalles</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                        <DetailItem icon={<Clock className="w-4 h-4"/>} label="Duración" value={`${exercise['Duración (min)']} min`} />
                        <DetailItem icon={<Users className="w-4 h-4"/>} label="Nº Jugadores" value={exercise['Número de jugadores']} />
                        <div className="sm:col-span-2">
                            <DetailItem icon={<Package className="w-4 h-4"/>} label="Espacio y Materiales" value={exercise['Espacio y materiales necesarios']} />
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <ClipboardList className="w-5 h-5" />
                            Descripción
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-sm">{exercise['Descripción de la tarea']}</p>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                             <Target className="w-5 h-5" />
                            Objetivos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-sm">{exercise['Objetivos']}</p>
                    </CardContent>
                </Card>
                
                {exercise['Variantes'] && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Repeat className="w-5 h-5" />
                                Variantes
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground text-sm">{exercise['Variantes']}</p>
                        </CardContent>
                    </Card>
                )}

                {exercise['Consejos para el entrenador'] && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <Lightbulb className="w-5 h-5" />
                                Consejos para el entrenador
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground text-sm">{exercise['Consejos para el entrenador']}</p>
                        </CardContent>
                    </Card>
                )}
            </div>
      </div>
    </div>
  );
}
