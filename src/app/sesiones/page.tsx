
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, doc, deleteDoc, Timestamp, getFirestore } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getAuth } from 'firebase/auth';
import { app } from '@/firebase/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { PlusCircle, Calendar, ListChecks, Filter, ArrowLeft, Eye, Edit, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, getYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import type { Exercise } from '@/lib/data';

const db = getFirestore(app);
const auth = getAuth(app);

type Session = {
    id: string;
    name: string;
    date: Timestamp;
    initialExercises?: string[];
    mainExercises?: string[];
    finalExercises?: string[];
    sessionNumber?: number;
    teamId?: string;
    userId: string;
};

const SessionCard = ({ session, exercises, onDelete }: { session: Session, exercises: Exercise[], onDelete: (sessionId: string) => void }) => {
    const getExerciseName = (id: string) => exercises.find(e => e.id === id)?.['Ejercicio'] || 'Ejercicio no encontrado';
    
    const calculateTotalTime = () => {
        const allIds = [
            ...(session.initialExercises || []),
            ...(session.mainExercises || []),
            ...(session.finalExercises || [])
        ];
        return allIds.reduce((total, id) => {
            const exercise = exercises.find(e => e.id === id);
            return total + (exercise?.['Duración (min)'] || 0);
        }, 0);
    };

    const sessionDate = session.date.toDate();
    
    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="text-primary">{format(sessionDate, "d 'de' MMMM 'de' yyyy", { locale: es })}</CardTitle>
                <CardDescription>
                    Número sesión: {session.sessionNumber || 'N/A'} | Tiempo total: {calculateTotalTime()} min
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                <div>
                    <h4 className="font-semibold">Fase Inicial</h4>
                    <ul className="list-disc pl-5 text-sm text-muted-foreground">
                        {(session.initialExercises && session.initialExercises.length > 0) ? session.initialExercises.map(id => <li key={id}>{getExerciseName(id)}</li>) : <li>N/A</li>}
                    </ul>
                </div>
                 <div>
                    <h4 className="font-semibold">Fase Principal</h4>
                    <ul className="list-disc pl-5 text-sm text-muted-foreground">
                        {(session.mainExercises && session.mainExercises.length > 0) ? session.mainExercises.map(id => <li key={id}>{getExerciseName(id)}</li>) : <li>N/A</li>}
                    </ul>
                </div>
                 <div>
                    <h4 className="font-semibold">Fase Final</h4>
                    <ul className="list-disc pl-5 text-sm text-muted-foreground">
                        {(session.finalExercises && session.finalExercises.length > 0) ? session.finalExercises.map(id => <li key={id}>{getExerciseName(id)}</li>) : <li>N/A</li>}
                    </ul>
                </div>
            </CardContent>
            <CardFooter className="bg-muted/50 p-3 flex justify-between gap-2">
                 <Button variant="outline" asChild className="flex-1">
                    <Link href={`/sesiones/${session.id}`}><Eye className="mr-2"/>Ver Ficha Detallada</Link>
                </Button>
                <div className="flex gap-2">
                    <Button variant="secondary" asChild><Link href={`/sesiones/${session.id}/editar`}><Edit /></Link></Button>
                     <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive"><Trash2 /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar esta sesión?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Se eliminará permanentemente la sesión del {format(sessionDate, 'P', { locale: es })}.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(session.id)}>Sí, eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardFooter>
        </Card>
    );
};

export default function SesionesPage() {
    const { toast } = useToast();
    const [user, loadingAuth] = useAuthState(auth);
    const [sessionsSnapshot, loadingSessions, errorSessions] = useCollection(user ? query(collection(db, 'sessions'), where('userId', '==', user.uid)) : null);
    const [exercisesSnapshot, loadingExercises, errorExercises] = useCollection(collection(db, 'exercises'));

    const [filterYear, setFilterYear] = useState<string>(String(new Date().getFullYear()));
    const [filterMonth, setFilterMonth] = useState<string>('Todos');

    const sessions = useMemo(() => 
        sessionsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session))
        .sort((a,b) => b.date.toDate().getTime() - a.date.toDate().getTime()) 
        || [], [sessionsSnapshot]);

    const exercises = useMemo(() => 
        exercisesSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exercise)) || [],
    [exercisesSnapshot]);

    const availableYears = useMemo(() => {
        if (!sessions) return [String(new Date().getFullYear())];
        const years = new Set(sessions.map(s => getYear(s.date.toDate())));
        return Array.from(years).sort((a, b) => b - a).map(String);
    }, [sessions]);

    const filteredSessions = useMemo(() => {
        return sessions.filter(session => {
            const date = session.date.toDate();
            const matchesYear = getYear(date).toString() === filterYear;
            const matchesMonth = filterMonth === 'Todos' || date.getMonth().toString() === filterMonth;
            return matchesYear && matchesMonth;
        });
    }, [sessions, filterYear, filterMonth]);
    
    const handleDelete = async (sessionId: string) => {
        try {
            await deleteDoc(doc(db, 'sessions', sessionId));
            toast({
                title: "Sesión eliminada",
                description: "La sesión de entrenamiento ha sido eliminada con éxito.",
                variant: "destructive"
            });
        } catch (error: any) {
             toast({
                title: "Error",
                description: "No se pudo eliminar la sesión: " + error.message,
                variant: "destructive"
            });
        }
    };
    
    const isLoading = loadingAuth || loadingSessions || loadingExercises;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                     <div className="bg-muted p-3 rounded-full hidden sm:flex">
                        <ListChecks className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold font-headline">Mis Sesiones</h1>
                        <p className="text-lg text-muted-foreground mt-1">Aquí encontrarás todas las sesiones de entrenamiento que has creado.</p>
                    </div>
                </div>
                <div className="flex w-full md:w-auto gap-2">
                     <Button variant="outline" asChild className="flex-1 md:flex-initial">
                        <Link href="/panel">
                            <ArrowLeft className="mr-2" />Volver al Panel
                        </Link>
                    </Button>
                    <Button asChild className="flex-1 md:flex-initial">
                        <Link href="/sesiones/crear">
                            <PlusCircle className="mr-2" /> Crear Sesión
                        </Link>
                    </Button>
                </div>
            </div>

            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Filter className="w-5 h-5"/>Filtrar Sesiones</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Select value={filterYear} onValueChange={setFilterYear}>
                            <SelectTrigger>
                                <SelectValue placeholder="Año" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                            </SelectContent>
                        </Select>
                         <Select value={filterMonth} onValueChange={setFilterMonth}>
                            <SelectTrigger>
                                <SelectValue placeholder="Mes" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Todos">Todos los meses</SelectItem>
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <SelectItem key={i} value={String(i)}>
                                        {format(new Date(0, i), 'MMMM', { locale: es })}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {/* El botón de aplicar filtro se puede omitir si el filtrado es instantáneo */}
                    </div>
                </CardContent>
            </Card>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-80 w-full"/>)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredSessions.length > 0 ? (
                        filteredSessions.map((session) => (
                            <SessionCard key={session.id} session={session} exercises={exercises} onDelete={handleDelete} />
                        ))
                    ) : (
                        <p className="col-span-full text-center text-muted-foreground py-10">
                            No se encontraron sesiones para los filtros seleccionados.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
