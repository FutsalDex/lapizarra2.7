
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Exercise, favoriteExerciseIdsStore } from '@/lib/data';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Eye, Heart } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, getFirestore } from 'firebase/firestore';
import app from '@/firebase/config';
import { Skeleton } from '@/components/ui/skeleton';
import AuthGuard from '@/components/auth/AuthGuard';

const db = getFirestore(app);

export default function FavoritosPage() {
  const [favoriteIds, setFavoriteIds] = useState(new Set(favoriteExerciseIdsStore));
  const { toast } = useToast();
  
  const [exercisesSnapshot, loading] = useCollection(collection(db, 'exercises'));
  const exercises = exercisesSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exercise)) || [];

  // This effect will run when the component mounts and also if the user navigates
  // back to this page, ensuring the favorite list is up to date.
  useEffect(() => {
    const updateFavorites = () => setFavoriteIds(new Set(favoriteExerciseIdsStore));
    updateFavorites();

    // Optional: Add a listener if the store can be updated from other tabs (not implemented here)
    window.addEventListener('storage', updateFavorites);
    return () => window.removeEventListener('storage', updateFavorites);
  }, []);

  const handleFavoriteToggle = (exerciseId: string) => {
    const newFavoriteIds = new Set(favoriteIds);
    if (newFavoriteIds.has(exerciseId)) {
      newFavoriteIds.delete(exerciseId);
      toast({
        description: "Ejercicio eliminado de favoritos.",
      });
    } else {
      newFavoriteIds.add(exerciseId);
       toast({
        description: "Ejercicio añadido a favoritos.",
      });
    }
    setFavoriteIds(newFavoriteIds);
    // Actualizar el store simulado
    favoriteExerciseIdsStore.clear();
    newFavoriteIds.forEach(id => favoriteExerciseIdsStore.add(id));
  };

  const favoriteExercises = exercises.filter(ex => favoriteIds.has(ex.id));

  return (
    <AuthGuard>
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold font-headline">Mis Ejercicios Favoritos</h1>
          <p className="text-lg text-muted-foreground mt-2">Aquí encontrarás los ejercicios que has guardado para un acceso rápido.</p>
        </div>

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="overflow-hidden flex flex-col">
                <Skeleton className="w-full aspect-video"/>
                <CardContent className="p-6 flex-grow flex flex-col">
                  <Skeleton className="h-6 w-3/4 mb-4" />
                  <div className="mt-auto pt-4 flex justify-between items-center">
                    <Skeleton className="h-9 w-28" />
                    <Skeleton className="h-10 w-10" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && favoriteExercises.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {favoriteExercises.map((exercise) => (
              <Card key={exercise.id} className="overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col">
                <CardHeader className="p-0">
                  <div className="relative aspect-video w-full bg-primary/80">
                    <Image
                      src={exercise.Imagen}
                      alt={`Táctica para ${exercise.Ejercicio}`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-6 flex-grow flex flex-col">
                  <CardTitle className="font-headline text-xl truncate" title={exercise.Ejercicio}>{exercise.Ejercicio}</CardTitle>
                  <div className="mt-auto pt-4 flex justify-between items-center">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/ejercicios/${exercise.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Ficha
                        </Link>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleFavoriteToggle(exercise.id)}>
                          <Heart className={cn("w-6 h-6 text-destructive/50 transition-colors", {
                              "fill-destructive text-destructive": favoriteIds.has(exercise.id)
                          })} />
                      </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}

        {!loading && favoriteExercises.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
              <p>Aún no has guardado ningún ejercicio como favorito.</p>
              <Button asChild className="mt-4">
                  <Link href="/ejercicios">Explorar ejercicios</Link>
              </Button>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
