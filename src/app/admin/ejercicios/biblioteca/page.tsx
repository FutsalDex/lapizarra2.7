
"use client";

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCollection } from 'react-firebase-hooks/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, doc, updateDoc, deleteDoc, getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '@/firebase/config';
import { Exercise } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';

const db = getFirestore(app);
const auth = getAuth(app);


export default function LibraryManagementPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [authorFilter, setAuthorFilter] = useState('Todos');
  const { toast } = useToast();
  
  const [user, loadingAuth] = useAuthState(auth);
  const [exercisesSnapshot, loadingExercises, errorExercises] = useCollection(collection(db, 'exercises'));

  const exercises = useMemo(() => 
    exercisesSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exercise)) || [],
  [exercisesSnapshot]);

  const allCategories = useMemo(() => 
      [...new Set(exercises.map(ex => ex['Categoría']))].sort(),
  [exercises]);

  const handleVisibilityChange = async (id: string, checked: boolean) => {
    try {
      const exerciseRef = doc(db, 'exercises', id);
      await updateDoc(exerciseRef, { Visible: checked });
      toast({
        title: "Visibilidad actualizada",
        description: `El ejercicio ahora es ${checked ? 'visible' : 'oculto'}.`,
      });
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Error al actualizar",
        description: error.message,
      });
    }
  };

  const handleDeleteExercise = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'exercises', id));
      toast({
        variant: "destructive",
        title: "Ejercicio eliminado",
        description: "El ejercicio ha sido eliminado de la biblioteca.",
      });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Error al eliminar",
            description: error.message,
        });
    }
  };
  
  const filteredExercises = useMemo(() => {
      if (loadingExercises || loadingAuth) return [];
      return exercises.filter(exercise => {
        const matchesSearch = exercise['Ejercicio'].toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'Todas' || exercise['Categoría'] === categoryFilter;
        
        let matchesAuthor = true;
        if (authorFilter === 'Mis Ejercicios') {
            matchesAuthor = user ? exercise.userId === user.uid : false;
        } else if (authorFilter === 'Otros Usuarios') {
            matchesAuthor = user ? exercise.userId !== user.uid : true;
        }

        return matchesSearch && matchesCategory && matchesAuthor;
      }).sort((a, b) => (a['Número'] || 0) - (b['Número'] || 0));
  }, [exercises, searchTerm, categoryFilter, authorFilter, user, loadingExercises, loadingAuth]);

  const isLoading = loadingAuth || loadingExercises;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link href="/admin/ejercicios">
            <ArrowLeft className="mr-2" />
            Volver a Gestión de Ejercicios
          </Link>
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-4xl font-bold font-headline text-primary">Gestionar Biblioteca de Ejercicios</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Activa o desactiva la visibilidad de los ejercicios para los usuarios.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Todos los Ejercicios</CardTitle>
          <CardDescription>Usa el interruptor para cambiar la visibilidad de un ejercicio en la biblioteca pública.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="relative flex-grow min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar ejercicio por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
             <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[240px]">
                    <SelectValue placeholder="Todas las Categorías" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Todas">Todas las Categorías</SelectItem>
                    {allCategories.map((cat, index) => (
                        <SelectItem key={`${cat}-${index}`} value={cat}>{cat}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={authorFilter} onValueChange={setAuthorFilter}>
                <SelectTrigger className="w-full sm:w-[240px]">
                    <SelectValue placeholder="Filtrar por autor" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Todos">Todos los Autores</SelectItem>
                    <SelectItem value="Mis Ejercicios">Mis Ejercicios</SelectItem>
                    <SelectItem value="Otros Usuarios">Otros Usuarios</SelectItem>
                </SelectContent>
            </Select>
          </div>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Número</TableHead>
                  <TableHead className="w-24">Imagen</TableHead>
                  <TableHead>Nombre del Ejercicio</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  Array.from({ length: 10 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                      <TableCell><Skeleton className="h-12 w-16 rounded-sm" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                )}
                {!isLoading && filteredExercises.map((exercise) => (
                  <TableRow key={exercise.id}>
                    <TableCell className="font-medium">{exercise['Número']}</TableCell>
                    <TableCell>
                      <Image 
                        src={exercise['Imagen'] || `https://picsum.photos/seed/ex${exercise.id}/64/48`}
                        alt={exercise['Ejercicio']}
                        width={64}
                        height={48}
                        className="rounded-sm object-cover"
                      />
                    </TableCell>
                    <TableCell>{exercise['Ejercicio']}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{exercise['Categoría']}</Badge>
                    </TableCell>
                    <TableCell className="flex items-center justify-end gap-2">
                      <Switch 
                        checked={exercise['Visible']} 
                        onCheckedChange={(checked) => handleVisibilityChange(exercise.id, checked)}
                      />
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/ejercicios/mis-ejercicios?edit=${exercise.id}`}>
                            <Edit className="h-4 w-4" />
                        </Link>
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción eliminará permanentemente el ejercicio "{exercise['Ejercicio']}". No se puede deshacer.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteExercise(exercise.id)}>
                                    Sí, eliminar
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && filteredExercises.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                            No se encontraron ejercicios con los filtros seleccionados.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {errorExercises && (
            <p className="text-destructive mt-4">
              Error al cargar los ejercicios: {errorExercises.message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
