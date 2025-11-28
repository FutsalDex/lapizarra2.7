
"use client";

import { useState } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, getFirestore } from 'firebase/firestore';
import app from '@/firebase/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Exercise, favoriteExerciseIdsStore } from '@/lib/data';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Search, Eye, Heart } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const ITEMS_PER_PAGE = 12;
const db = getFirestore(app);

export default function EjerciciosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [faseFilter, setFaseFilter] = useState('Todos');
  const [edadFilter, setEdadFilter] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [favoriteIds, setFavoriteIds] = useState(favoriteExerciseIdsStore);
  const { toast } = useToast();

  const [exercisesSnapshot, loading, error] = useCollection(
    query(collection(db, 'exercises'))
  );

  const exercises = exercisesSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exercise)) || [];

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

  const allCategories = [...new Set(exercises.map(ex => ex['Categoría']))].sort();
  
  const allEdades = [
      "Benjamín", "Alevín", "Infantil",
      "Cadete", "Juvenil", "Senior"
  ];


  const filteredExercises = exercises.filter(exercise => {
    const matchesSearch = exercise['Ejercicio'].toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (exercise['Descripción de la tarea'] && exercise['Descripción de la tarea'].toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'Todos' || exercise['Categoría'] === categoryFilter;
    
    let matchesFase = true;
    if (faseFilter !== 'Todos') {
        if (faseFilter === 'Fase Inicial') {
            matchesFase = exercise['Fase'] === 'Calentamiento' || exercise['Fase'] === 'Preparación Física';
        } else if (faseFilter === 'Fase Principal') {
            matchesFase = exercise['Fase'] === 'Principal' || exercise['Fase'] === 'Específico';
        } else if (faseFilter === 'Fase Final') {
            matchesFase = exercise['Fase'] === 'Vuelta a la Calma';
        } else {
            matchesFase = exercise['Fase'] === faseFilter;
        }
    }
    
    const matchesEdad = edadFilter === 'Todos' || (Array.isArray(exercise['Edad']) && exercise['Edad'].includes(edadFilter));
    
    return matchesSearch && matchesCategory && matchesFase && matchesEdad;
  });

  const totalPages = Math.ceil(filteredExercises.length / ITEMS_PER_PAGE);
  const paginatedExercises = filteredExercises.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };
  
  const allFases = ["Fase Inicial", "Fase Principal", "Fase Final"];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold font-headline">Biblioteca de Ejercicios</h1>
        <p className="text-lg text-muted-foreground mt-2">Encuentra la inspiración para tu próximo entrenamiento.</p>
      </div>
      
      <div className="mb-8 p-4 bg-card rounded-lg border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Buscar ejercicio por nombre..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
            <Select onValueChange={value => { setFaseFilter(value); setCurrentPage(1); }} defaultValue="Todos">
                <SelectTrigger>
                  <SelectValue placeholder="Fase" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todas las Fases</SelectItem>
                  {allFases.map((fase, index) => <SelectItem key={`${fase}-${index}`} value={fase}>{fase}</SelectItem>)}
                </SelectContent>
            </Select>
            <Select onValueChange={value => { setCategoryFilter(value); setCurrentPage(1); }} defaultValue="Todos">
              <SelectTrigger>
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todas las Categorías</SelectItem>
                {allCategories.map((cat, index) => <SelectItem key={`${cat}-${index}`} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select onValueChange={value => { setEdadFilter(value); setCurrentPage(1); }} defaultValue="Todos">
                <SelectTrigger>
                  <SelectValue placeholder="Edad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todas las Edades</SelectItem>
                  {allEdades.map((edad, index) => <SelectItem key={`${edad}-${index}`} value={edad}>{edad}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
        <div className="text-sm text-muted-foreground mt-4">
          Mostrando {paginatedExercises.length} de {filteredExercises.length} ejercicios. Página {currentPage} de {totalPages}.
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
            <Card key={index} className="flex flex-col">
              <Skeleton className="h-48 w-full" />
              <CardContent className="p-6 flex-grow flex flex-col">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-full" />
                <div className="mt-auto pt-4 flex justify-between items-center">
                  <Skeleton className="h-9 w-28" />
                  <Skeleton className="h-10 w-10 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedExercises.map((exercise) => (
            <Card key={exercise.id} className="overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col">
              <CardHeader className="p-0">
                <div className="relative h-48 w-full">
                  <Image
                    src={exercise['Imagen']}
                    alt={exercise['Ejercicio']}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-contain"
                    data-ai-hint={exercise.imageHint}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-6 flex-grow flex flex-col">
                <CardTitle className="font-headline text-lg truncate mb-2" title={exercise['Ejercicio']}>{exercise['Ejercicio']}</CardTitle>
                
                <div className="space-y-1 text-sm text-muted-foreground mb-4">
                  <p><span className="font-semibold text-foreground">Fase:</span> {exercise['Fase']}</p>
                  <p><span className="font-semibold text-foreground">Edad:</span> {Array.isArray(exercise['Edad']) ? exercise['Edad'].join(', ') : ''}</p>
                  <p><span className="font-semibold text-foreground">Duración:</span> {exercise['Duración (min)']} min</p>
                   <p className="line-clamp-2"><span className="font-semibold text-foreground">Descripción:</span> {exercise['Descripción de la tarea']}</p>
                </div>

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
      )}

      {error && <p className="text-center text-destructive py-8">Error: {error.message}</p>}

      {!loading && filteredExercises.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
            <p>No se encontraron ejercicios con los filtros seleccionados.</p>
        </div>
      )}
      
      {totalPages > 1 && (
        <div className="flex items-center justify-center mt-8 space-x-2">
            <Button variant="outline" size="icon" onClick={handlePrevPage} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
            </span>
            <Button variant="outline" size="icon" onClick={handleNextPage} disabled={currentPage === totalPages}>
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
      )}
    </div>
  );
}
