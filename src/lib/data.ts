
import placeholderImages from './placeholder-images.json';

const exerciseImages = placeholderImages.placeholderImages.filter(p => p.id.startsWith('exercise-'));

export type Exercise = {
  id: string; // Firestore document ID
  'Número': number;
  'Ejercicio': string; // Title
  'Descripción de la tarea': string;
  'Categoría': string;
  'Fase': string;
  'Edad': string[];
  'Duración (min)': number;
  'Número de jugadores': number;
  'Objetivos': string;
  'Consejos para el entrenador': string;
  'Variantes': string;
  'Imagen': string; // imageUrl
  'youtubeUrl'?: string;
  'Visible': boolean;
  'Espacio y materiales necesarios': string;
  userId: string;
  createdAt: any; // Firestore Timestamp
  imageHint?: string; // Optional, can be derived or fixed
  tacticsUrl?: string; // Optional, maybe same as Imagen for now
  intensity?: 'Baja' | 'Media' | 'Alta';
};

// Simulación de un estado de favoritos compartido (en una app real sería un context o una store)
export let favoriteExerciseIdsStore = new Set(['1', '6']);

export const exercises: Exercise[] = [
  // This mock data is now deprecated and will be replaced by Firestore data.
  // Kept for reference or as fallback if needed during development.
];

export type Session = {
    id: string;
    name: string;
    date: string;
    exercises: any[]; // Using any for now as exercise structure changed.
    objectives?: string;
    club?: string;
    team?: string;
    facility?: string;
    // New fields from DB schema
    microcycle?: string;
    sessionNumber?: number;
    initialExercises?: any[];
    mainExercises?: any[];
    finalExercises?: any[];
}

export const sessions: Session[] = [
    {
        id: '1',
        name: 'Sesión 1',
        date: '2025-11-01',
        exercises: [], // Populated for detail page
        objectives: 'Mejorar la finalización y el juego bajo presión.',
        club: 'FS Ràpid Santa Coloma',
        team: 'Juvenil B',
        facility: 'Polideportivo Municipal',
    },
    {
        id: '2',
        name: 'Sesión 2',
        date: '2025-11-03',
        exercises: [],
        objectives: 'Fomentar la posesión y la táctica a balón parado.',
        club: 'FS Ràpid Santa Coloma',
        team: 'Juvenil B',
        facility: 'Polideportivo Municipal',
    },
    {
        id: '3',
        name: 'Sesión 3',
        date: '2025-11-05',
        exercises: [],
        objectives: 'Trabajo de resistencia y defensa en inferioridad.',
        club: 'FS Ràpid Santa Coloma',
        team: 'Juvenil B',
        facility: 'Polideportivo Municipal',
    }
]

export const matches: any[] = [];
