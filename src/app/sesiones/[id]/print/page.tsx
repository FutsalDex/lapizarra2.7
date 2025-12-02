
'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useDocumentData, useCollection } from 'react-firebase-hooks/firestore';
import { doc, collection, getFirestore, Timestamp } from 'firebase/firestore';
import { app } from '@/firebase/config';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Exercise } from '@/lib/data';
import { Loader2 } from 'lucide-react';

const db = getFirestore(app);

export default function PrintSessionPage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [session, loadingSession] = useDocumentData(doc(db, 'sessions', sessionId));
  const [exercises, loadingExercises] = useCollection(collection(db, 'exercises'));
  const teamId = session?.teamId;
  const [team, loadingTeam] = useDocumentData(teamId ? doc(db, 'teams', teamId) : null);

  useEffect(() => {
    if (!loadingSession && !loadingExercises && !loadingTeam && session && exercises) {
      setTimeout(() => {
        window.print();
        window.close();
      }, 500); // Small delay to ensure content is rendered
    }
  }, [loadingSession, loadingExercises, loadingTeam, session, exercises]);

  if (loadingSession || loadingExercises || loadingTeam || !session || !exercises) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <Loader2 className="h-8 w-8 animate-spin" />
        <p style={{ marginLeft: '1rem' }}>Cargando datos para impresión...</p>
      </div>
    );
  }

  const getExercisesByIds = (ids: string[]) => {
    if (!ids || ids.length === 0) return [];
    return ids.map(id => {
      const doc = exercises.docs.find(d => d.id === id);
      return doc ? { id: doc.id, ...doc.data() } as Exercise : null;
    }).filter(Boolean) as Exercise[];
  };

  const initialExercises = getExercisesByIds(session.initialExercises || []);
  const mainExercises = getExercisesByIds(session.mainExercises || []);
  const finalExercises = getExercisesByIds(session.finalExercises || []);
  const allSessionExercises = [...initialExercises, ...mainExercises, ...finalExercises];

  const sessionDate = (session.date as Timestamp)?.toDate();
  const sessionDateFormatted = sessionDate ? format(sessionDate, 'dd/MM/yyyy', { locale: es }) : 'N/A';
  const teamName = team?.name || 'No especificado';

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px' }}>
      <header style={{ border: '2px solid black', padding: '10px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ flex: 1, border: '1px solid black', padding: '5px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>Microciclo</p>
                <p style={{ margin: 0, fontSize: '14px' }}>{session.microcycle || 'N/A'}</p>
            </div>
            <div style={{ flex: 1, border: '1px solid black', padding: '5px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>Fecha</p>
                <p style={{ margin: 0, fontSize: '14px' }}>{sessionDateFormatted}</p>
            </div>
            <div style={{ flex: 1, border: '1px solid black', padding: '5px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>Sesión</p>
                <p style={{ margin: 0, fontSize: '14px' }}>{session.sessionNumber || 'N/A'}</p>
            </div>
            <div style={{ flex: 1, border: '1px solid black', padding: '5px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>Instalación</p>
                <p style={{ margin: 0, fontSize: '14px' }}>{session.facility || 'N/A'}</p>
            </div>
            <div style={{ flex: 2, border: '1px solid black', padding: '5px' }}>
                 <p style={{ margin: 0, fontWeight: 'bold', fontSize: '12px' }}>Objetivos</p>
                 <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px', fontSize: '12px' }}>
                    {(session.objectives || []).map((obj: string, i: number) => <li key={i}>{obj}</li>)}
                 </ul>
            </div>
        </div>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        {allSessionExercises.map(ex => (
          <div key={ex.id} style={{ border: '1px solid #ccc', borderRadius: '8px', overflow: 'hidden', breakInside: 'avoid' }}>
            <div style={{ padding: '10px', backgroundColor: '#f0f0f0', textAlign: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>{ex['Ejercicio']}</h4>
            </div>
            <div style={{ padding: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ backgroundColor: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* Use a standard img tag for printing compatibility */}
                <img src={ex['Imagen']} alt={ex['Ejercicio']} style={{ maxWidth: '100%', maxHeight: '150px', objectFit: 'contain' }} />
              </div>
              <div style={{ fontSize: '11px' }}>
                <p style={{ margin: 0, fontWeight: 'bold' }}>Descripción:</p>
                <p style={{ margin: '2px 0 8px 0' }}>{ex['Descripción de la tarea']}</p>
                <p style={{ margin: 0, fontWeight: 'bold' }}>Objetivos:</p>
                <p style={{ margin: '2px 0 0 0' }}>{ex['Objetivos']}</p>
              </div>
            </div>
             <footer style={{ padding: '8px', borderTop: '1px solid #ccc', fontSize: '10px', display: 'flex', gap: '8px' }}>
                <div style={{ border: '1px solid #ddd', padding: '4px', borderRadius: '4px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>Tiempo</p>
                    <p style={{ margin: 0 }}>{ex['Duración (min)']}'</p>
                </div>
                <div style={{ border: '1px solid #ddd', padding: '4px', borderRadius: '4px', textAlign: 'center' }}>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>Jugadores</p>
                    <p style={{ margin: 0 }}>{ex['Número de jugadores']}</p>
                </div>
                 <div style={{ border: '1px solid #ddd', padding: '4px', borderRadius: '4px', flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 'bold' }}>Material</p>
                    <p style={{ margin: 0 }}>{ex['Espacio y materiales necesarios']}</p>
                </div>
            </footer>
          </div>
        ))}
      </main>

       <p style={{ textAlign: 'center', fontSize: '10px', marginTop: '20px', color: '#888' }}>Powered by LaPizarra</p>
    </div>
  );
}
