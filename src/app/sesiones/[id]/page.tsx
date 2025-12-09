"use client";

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useDocumentData, useCollection } from 'react-firebase-hooks/firestore';
import { doc, collection, getFirestore } from 'firebase/firestore';
import { app } from '@/firebase/config';
import { Exercise } from '@/lib/data';
import { Timestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';

const db = getFirestore(app);

const ExerciseBlock = ({ exercise }: { exercise: Exercise }) => (
    <div className="exercise-block">
        <div className="exercise-row">
            {exercise.Imagen && (
                <div className="exercise-img">
                     <Image src={exercise.Imagen} alt={exercise.Ejercicio} width={300} height={180} className="rounded-md object-contain" />
                     <div className="meta mt-2">
                        <p><strong>Duración:</strong> {exercise['Duración (min)']} min</p>
                        <p><strong>Jugadores:</strong> {exercise['Número de jugadores']}</p>
                        <p><strong>Material:</strong> {exercise['Espacio y materiales necesarios']}</p>
                    </div>
                </div>
            )}
            <div className="exercise-text">
                <h3 className="ex-title">{exercise.Ejercicio}</h3>
                <h4 className="sub-title">Descripción</h4>
                <p className="ex-desc">{exercise['Descripción de la tarea']}</p>
                <h4 className="sub-title">Objetivos del Ejercicio</h4>
                <p className="ex-desc">{exercise['Objetivos']}</p>
            </div>
        </div>
    </div>
);


const PhaseSection = ({ title, exercises }: { title: string; exercises: Exercise[] }) => {
    if (!exercises || exercises.length === 0) return null;
    return (
        <>
            <h2 className="phase-header">{title}</h2>
            {exercises.map(ex => <ExerciseBlock key={ex.id} exercise={ex} />)}
        </>
    );
};


export default function SesionDetalleFinal() {
    const params = useParams();
    const sessionId = params.id as string;

    const [sessionSnapshot, loadingSession, errorSession] = useDocumentData(doc(db, 'sessions', sessionId));
    const [exercisesSnapshot, loadingExercises, errorExercises] = useCollection(collection(db, 'exercises'));
    
    const teamId = sessionSnapshot?.teamId;
    const [teamSnapshot, loadingTeam] = useDocumentData(teamId ? doc(db, 'teams', teamId) : null);

    const isLoading = loadingSession || loadingExercises || loadingTeam;

    if (isLoading) {
        return (
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <Skeleton className="h-10 w-48 mb-6" />
                <Skeleton className="h-24 w-full mb-8" />
                <Skeleton className="h-48 w-full mb-8" />
                <Skeleton className="h-48 w-full" />
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
    const allExercises = exercisesSnapshot?.docs.map(d => ({ id: d.id, ...d.data() } as Exercise)) || [];

    const getExercisesByIds = (ids: string[] = []) => ids.map(id => allExercises.find(ex => ex.id === id)).filter(Boolean) as Exercise[];

    const initialExercises = getExercisesByIds(session.initialExercises);
    const mainExercises = getExercisesByIds(session.mainExercises);
    const finalExercises = getExercisesByIds(session.finalExercises);
    const teamName = teamSnapshot?.name || 'No especificado';
    
    return (
        <div className="container mx-auto px-4 py-8">
            <div id="print-area" className="bg-white text-black p-6 rounded-lg shadow-lg max-w-4xl mx-auto">
                 <h2 className="section-title">Detalles & Objetivos de la Sesión</h2>
                 <table className="session-table w-full mb-6">
                     <tbody>
                         <tr>
                             <td className="w-1/2 align-top pr-4">
                                <p><strong>Equipo:</strong> {teamName}</p>
                                <p><strong>Instalación:</strong> {session.facility}</p>
                                <p><strong>Microciclo:</strong> {session.microcycle}</p>
                                <p><strong>Nº Sesión:</strong> {session.sessionNumber}</p>
                             </td>
                             <td className="w-1/2 align-top">
                                <h3 className="obj-title">Objetivos</h3>
                                <ul className="obj-list">
                                    {(session.objectives || []).map((obj: string, i: number) => <li key={i}>{obj}</li>)}
                                </ul>
                             </td>
                         </tr>
                     </tbody>
                 </table>
                 
                 <PhaseSection title="Fase Inicial (Calentamiento)" exercises={initialExercises} />
                 <PhaseSection title="Fase Principal" exercises={mainExercises} />
                 <PhaseSection title="Fase Final (Vuelta a la Calma)" exercises={finalExercises} />

            </div>
        </div>
    );
}