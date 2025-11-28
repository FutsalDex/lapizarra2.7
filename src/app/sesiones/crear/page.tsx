

"use client";

import { useState, useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Calendar as CalendarIcon, Clock, Search, Save, X, Loader2, ChevronDown, Eye, ListChecks, Shield, Download, Repeat, Layers, Pause } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCollection, useDocumentData } from 'react-firebase-hooks/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, addDoc, Timestamp, getFirestore, query, where, or, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '@/firebase/config';
import { Exercise } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const db = getFirestore(app);
const auth = getAuth(app);

type SessionPhase = 'initialExercises' | 'mainExercises' | 'finalExercises';

const phaseLimits: Record<SessionPhase, number> = {
  initialExercises: 2,
  mainExercises: 4,
  finalExercises: 2,
};

const objectivesByCategory = {
  Técnicos: [
    "Perfeccionar el control de balón en espacios reducidos para mayor precisión.",
    "Mejorar pases cortos y largos con ambas piernas para fluidez en el juego.",
    "Desarrollar regates y fintas para superar rivales en uno contra uno.",
    "Potenciar la finalización variada (tiros, vaselinas, colocados) en situaciones de gol.",
    "Reforzar el dominio aéreo y el cabezazo ofensivo/defensivo en corners.",
    "Mejorar la recepción orientada para iniciar contraataques rápidos.",
    "Entrenar el toque de primera en pases y centros para velocidad de juego.",
    "Desarrollar el uso del cuerpo para proteger el balón bajo presión.",
    "Potenciar disparos a portería desde ángulos cerrados.",
    "Reforzar la técnica de volea y media volea en finalizaciones aéreas.",
  ],
  Tácticos: [
    "Desarrollar patrones de juego posicional para superioridad numérica.",
    "Implementar presión alta y robo de balón en zonas avanzadas.",
    "Optimizar transiciones rápidas de ataque a defensa y viceversa.",
    "Entrenar sistemas defensivos como el 2-2 o pressing zonal.",
    "Fomentar el uso de paredes y triangulaciones para desequilibrar defensas.",
    "Mejorar la construcción desde atrás con el portero como iniciador.",
    "Entrenar la amplitud en ataque para estirar la defensa rival.",
    "Desarrollar bloqueos y pantallas para crear espacios en el área.",
    "Implementar rotaciones posicionales para confundir al pressing.",
    "Optimizar el contraataque en inferioridad numérica temporal.",
  ],
  Físicos: [
    "Aumentar la resistencia aeróbica para mantener intensidad durante todo el partido.",
    "Mejorar la velocidad explosiva en sprints cortos y cambios de dirección.",
    "Desarrollar agilidad y coordinación motora en pista limitada.",
    "Fortalecer el core y las piernas para mayor potencia en disparos y saltos.",
    "Trabajar la recuperación activa para minimizar fatiga entre acciones.",
    "Potenciar la fuerza explosiva en saltos y duelos aéreos.",
    "Mejorar la flexibilidad dinámica para movimientos fluidos.",
    "Entrenar la capacidad anaeróbica para ráfagas de alta intensidad.",
    "Desarrollar el equilibrio en situaciones de contacto.",
    "Fomentar la resistencia a la fatiga muscular en fases finales de partido.",
  ],
  Colectivos: [
    "Fomentar la comunicación verbal y no verbal entre líneas.",
    "Mejorar la coordinación en movimientos sincronizados de equipo.",
    "Desarrollar toma de decisiones colectivas bajo presión temporal.",
    "Promover el apoyo mutuo en ataque y cobertura en defensa.",
    "Cultivar el espíritu de equipo mediante rotaciones y roles intercambiables.",
    "Entrenar la sincronía en el pressing colectivo.",
    "Mejorar la lectura mutua de espacios y apoyos.",
    "Fomentar el liderazgo distribuido en momentos clave.",
    "Desarrollar la empatía en la cobertura de compañeros.",
    "Promover la celebración colectiva para reforzar la cohesión.",
  ],
  Mentales: [
    "Aumentar la concentración sostenida en fases de alta intensidad.",
    "Desarrollar adaptabilidad a cambios tácticos o imprevistos del rival.",
    "Potenciar la motivación intrínseca para superar errores en juego.",
    "Entrenar la gestión emocional para mantener la calma en momentos clave.",
    "Fomentar la visualización y preparación mental pre-partido.",
    "Mejorar la resiliencia ante derrotas parciales o fallos.",
    "Entrenar la confianza en la toma de riesgos calculados.",
    "Desarrollar la percepción de fatiga para autocontrol.",
    "Potenciar la gratitud y el disfrute en el proceso de entrenamiento.",
    "Fomentar la reflexión post-sesión para aprendizaje continuo",
  ],
};


const sessionSchema = z.object({
  sessionNumber: z.coerce.number().min(1, "El número de sesión es obligatorio."),
  facility: z.string().min(1, "La instalación es obligatoria."),
  date: z.date({ required_error: "La fecha es obligatoria." }),
  time: z.string().min(1, "La hora es obligatoria."),
  objectives: z.array(z.string()).min(1, "Debes seleccionar al menos un objetivo.").max(5, "Puedes seleccionar un máximo de 5 objetivos."),
  teamId: z.string().optional(),
  microcycle: z.string().optional(),
});

type SessionFormData = z.infer<typeof sessionSchema>;

const ExercisePicker = ({ phase, allExercises, allCategories, loadingExercises, onAddExercise }: {
  phase: SessionPhase;
  allExercises: Exercise[];
  allCategories: string[];
  loadingExercises: boolean;
  onAddExercise: (phase: SessionPhase, exercise: Exercise) => void;
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [edadFilter, setEdadFilter] = useState('Todos');

  const filteredExercises = useMemo(() => allExercises.filter(exercise => {
    const matchesSearch = exercise['Ejercicio'].toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'Todos' || exercise['Categoría'] === categoryFilter;
    const matchesEdad = edadFilter === 'Todos' || (Array.isArray(exercise['Edad']) && exercise['Edad'].includes(edadFilter));
    return matchesSearch && matchesCategory && matchesEdad;
  }), [searchTerm, categoryFilter, edadFilter, allExercises]);
  
  const allEdades = ["Benjamín", "Alevín", "Infantil", "Cadete", "Juvenil", "Senior"];

  return (
  <Dialog>
    <DialogTrigger asChild>
      <button className="w-full h-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 text-muted-foreground hover:bg-muted transition-colors">
        <PlusCircle className="h-8 w-8 mb-2" />
        <span className="text-sm">Añadir Tarea</span>
      </button>
    </DialogTrigger>
    <DialogContent className="max-w-5xl">
      <DialogHeader>
        <DialogTitle>Seleccionar Ejercicio</DialogTitle>
        <DialogDescription>Busca y selecciona un ejercicio de tu biblioteca.</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Buscar por nombre..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Select onValueChange={setCategoryFilter} defaultValue="Todos">
            <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todas las Categorías</SelectItem>
               {allCategories.map((category, index) => <SelectItem key={'${category}-${index}'} value={category}>{category}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select onValueChange={setEdadFilter} defaultValue="Todos">
              <SelectTrigger>
                <SelectValue placeholder="Edad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todas las Edades</SelectItem>
                {allEdades.map((edad, index) => <SelectItem key={'${edad}-${index}'} value={edad}>{edad}</SelectItem>)}
              </SelectContent>
          </Select>
      </div>
      <ScrollArea className="h-[60vh]">
        <div className="grid grid-cols-3 gap-4 p-4">
          {loadingExercises ? <p>Cargando ejercicios...</p> : filteredExercises.map(exercise => (
            <DialogClose key={exercise.id} asChild>
              <Card className="cursor-pointer hover:shadow-lg overflow-hidden flex flex-col" onClick={() => onAddExercise(phase, exercise)}>
                <CardContent className="p-0 flex flex-col flex-grow">
                  <div className="relative aspect-video w-full">
                    <Image src={exercise['Imagen']} alt={exercise['Ejercicio']} layout="fill" objectFit="contain" className="p-2" />
                  </div>
                  <div className="p-2 text-center border-t bg-card">
                      <p className="text-xs font-semibold truncate">{exercise['Ejercicio']}</p>
                  </div>
                </CardContent>
              </Card>
            </DialogClose>
          ))}
        </div>
      </ScrollArea>
    </DialogContent>
  </Dialog>
  );
};

const SessionBasicPreview = ({ sessionData, exercises, teamName }: { sessionData: any, exercises: Exercise[], teamName: string }) => {
    const getExercisesByIds = (ids: string[]) => {
        if (!ids || ids.length === 0) return [];
        return ids.map(id => exercises.find(ex => ex.id === id)).filter(Boolean) as Exercise[];
    };
    
    const allSessionExercises = [
        ...getExercisesByIds(sessionData.initialExercises),
        ...getExercisesByIds(sessionData.mainExercises),
        ...getExercisesByIds(sessionData.finalExercises)
    ];

    const sessionDateFormatted = sessionData.date ? format(new Date(sessionData.date), 'dd/MM/yyyy', { locale: es }) : 'N/A';

    return (
        <div className="overflow-y-auto px-6">
            <div className="space-y-6">
                <div className="flex items-stretch gap-2 border-2 border-gray-800 p-2 mb-4 text-gray-900">
                    <div className="flex w-full space-x-2">
                        <div className="flex flex-col gap-1 basis-1/5">
                            <div className="border border-gray-800 text-center p-1 flex-1 flex flex-col justify-center">
                                <p className="text-xs font-bold">Microciclo</p>
                                <p className="text-sm truncate">{sessionData.microcycle || 'N/A'}</p>
                            </div>
                            <div className="border border-gray-800 text-center p-1 flex-1 flex flex-col justify-center">
                                <p className="text-xs font-bold">Fecha</p>
                                <p className="text-sm">{sessionDateFormatted}</p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1 basis-1/5">
                            <div className="border border-gray-800 text-center p-1 flex-1 flex flex-col justify-center">
                                <p className="text-xs font-bold">Sesión</p>
                                <p className="text-sm">{sessionData.sessionNumber || 'N/A'}</p>
                            </div>
                            <div className="border border-gray-800 text-center p-1 flex-1 flex flex-col justify-center">
                                <p className="text-xs font-bold">Instalación</p>
                                <p className="text-sm truncate">{sessionData.facility || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="border border-gray-800 text-left p-1 flex-grow">
                            <p className="text-xs font-bold">Objetivos</p>
                            <ul className="text-sm space-y-1 mt-1">
                                {(sessionData.objectives || []).map((obj: string, index: number) => (
                                    <li key={index} className="truncate list-disc list-inside">{obj}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-0">
                    {allSessionExercises.map(ex => (
                        <Card key={ex.id} className="overflow-hidden">
                            <div className="relative aspect-video w-full bg-muted">
                                <Image src={ex.Imagen} alt={ex.Ejercicio} layout="fill" objectFit="contain" className="p-2" />
                            </div>
                            <CardFooter className="p-2 bg-card border-t">
                                <p className="text-xs font-semibold truncate text-center w-full">{ex.Ejercicio}</p>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
};

const SessionProPreview = ({ sessionData, exercises }: { sessionData: any, exercises: Exercise[] }) => {
    const getExercisesByIds = (ids: string[]) => {
        if (!ids || ids.length === 0) return [];
        return ids.map(id => exercises.find(ex => ex.id === id)).filter(Boolean) as Exercise[];
    };
    
    const sessionDateFormatted = sessionData.date ? format(new Date(sessionData.date), 'dd/MM/yyyy', { locale: es }) : 'N/A';

    const PhaseSectionPro = ({ title, exercises }: { title: string; exercises: Exercise[] }) => (
        <div className="space-y-4">
            <div className="bg-gray-800 text-white text-center py-1">
                <h3 className="font-bold tracking-widest">{title}</h3>
            </div>
            {exercises.length > 0 ? exercises.map(ex => (
                <Card key={ex.id} className="overflow-hidden">
                    <CardHeader className="bg-gray-200 dark:bg-gray-700 p-2">
                         <CardTitle className="text-sm text-center font-bold">{ex['Ejercicio']}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 grid grid-cols-2 gap-2">
                        <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-md flex items-center justify-center">
                            <Image src={ex['Imagen']} alt={ex['Ejercicio']} layout="fill" objectFit="contain" />
                        </div>
                        <div className="text-xs space-y-2">
                            <div>
                                <p className="font-bold">Descripción</p>
                                <p className="text-gray-600 dark:text-gray-400 text-justify">{ex['Descripción de la tarea']}</p>
                            </div>
                            <div>
                                <p className="font-bold">Objetivos</p>
                                <p className="text-gray-600 dark:text-gray-400 text-justify">{ex['Objetivos']}</p>
                            </div>
                        </div>
                    </CardContent>
                     <CardFooter className="p-2 text-xs text-center text-gray-900">
                        <div className="flex gap-2 w-full items-stretch">
                            <div className="border p-1 rounded-sm flex flex-col justify-center w-[15%]">
                                <p className="font-bold">Tiempo</p>
                                <p>{ex['Duración (min)']}</p>
                            </div>
                            <div className="border p-1 rounded-sm flex flex-col justify-center w-[15%]">
                                <p className="font-bold">Jugadores</p>
                                <p>{ex['Número de jugadores']}</p>
                            </div>
                            <div className="border p-1 rounded-sm flex flex-col justify-center w-[70%]">
                                <p className="font-bold">Material</p>
                                <p className="break-words">{ex['Espacio y materiales necesarios']}</p>
                            </div>
                        </div>
                    </CardFooter>
                </Card>
            )) : <p className="text-sm text-muted-foreground p-4 text-center">No hay ejercicios en esta fase.</p>}
        </div>
    );

    return (
        <div className="overflow-y-auto">
            <div className="p-8 bg-white text-gray-900">
                <div className="flex items-stretch gap-2 border-2 border-gray-800 p-2 mb-4">
                    <div className="flex w-full space-x-2">
                        <div className="flex flex-col justify-between gap-1 basis-1/5">
                            <div className="border border-gray-800 text-center p-1 flex-1 flex flex-col justify-center">
                                <p className="text-xs font-bold">Microciclo</p>
                                <p className="text-sm truncate">{sessionData.microcycle || 'N/A'}</p>
                            </div>
                            <div className="border border-gray-800 text-center p-1 flex-1 flex flex-col justify-center">
                                <p className="text-xs font-bold">Fecha</p>
                                <p className="text-sm">{sessionDateFormatted}</p>
                            </div>
                        </div>
                        <div className="flex flex-col justify-between gap-1 basis-1/5">
                            <div className="border border-gray-800 text-center p-1 flex-1 flex flex-col justify-center">
                                <p className="text-xs font-bold">Sesión</p>
                                <p className="text-sm">{sessionData.sessionNumber || 'N/A'}</p>
                            </div>
                            <div className="border border-gray-800 text-center p-1 flex-1 flex flex-col justify-center">
                                <p className="text-xs font-bold">Instalación</p>
                                <p className="text-sm truncate">{sessionData.facility || 'N/A'}</p>
                            </div>
                        </div>
                        <div className="border border-gray-800 text-left p-1 flex-grow">
                            <p className="text-xs font-bold">Objetivos</p>
                            <ul className="text-sm space-y-1 mt-1">
                                {(sessionData.objectives || []).map((obj: string, index: number) => (
                                    <li key={index} className='list-disc list-inside'>{obj}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="space-y-6 pt-0">
                    <PhaseSectionPro title="FASE INICIAL" exercises={getExercisesByIds(sessionData.initialExercises)} />
                    <PhaseSectionPro title="FASE PRINCIPAL" exercises={getExercisesByIds(sessionData.mainExercises)} />
                    <PhaseSectionPro title="FASE FINAL" exercises={getExercisesByIds(sessionData.finalExercises)} />
                </div>

                <p className="text-center text-xs mt-8 text-gray-500 pt-0">Powered by LaPizarra</p>
            </div>
        </div>
    );
};


export default function CrearSesionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, loadingAuth] = useAuthState(auth);
  
  const [selectedExercises, setSelectedExercises] = useState<Record<SessionPhase, Exercise[]>>({
    initialExercises: [],
    mainExercises: [],
    finalExercises: [],
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [printContent, setPrintContent] = useState<{type: 'Básica' | 'Pro'} | null>(null);

  useEffect(() => {
    if (printContent) {
      setTimeout(() => {
        window.print();
        setPrintContent(null);
      }, 100);
    }
  }, [printContent]);


  const { register, handleSubmit, control, formState: { errors }, setValue, watch } = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      objectives: [],
      sessionNumber: 1,
    },
  });

  const watchedValues = watch();
  
  const [exercisesSnapshot, loadingExercises] = useCollection(collection(db, 'exercises'));
  const allExercises = useMemo(() => exercisesSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exercise)) || [], [exercisesSnapshot]);
  const allCategories = useMemo(() => [...new Set(allExercises.map(e => e['Categoría']))].sort(), [allExercises]);
  
  const [userProfile, loadingProfile] = useDocumentData(user ? doc(db, 'users', user.uid) : null);
  const isProUser = userProfile?.subscription === 'Pro';

  const teamsQuery = user ? query(collection(db, 'teams'), or(where('ownerId', '==', user.uid), where('memberIds', 'array-contains', user.uid))) : null;
  const [teamsSnapshot, loadingTeams] = useCollection(teamsQuery);
  const userTeams = useMemo(() => teamsSnapshot?.docs.map(doc => ({ id: doc.id, name: doc.data().name })) || [], [teamsSnapshot]);

  const addExercise = (phase: SessionPhase, exercise: Exercise) => {
    // Check if exercise already exists in any phase
    const isAlreadySelected = Object.values(selectedExercises).flat().some(ex => ex.id === exercise.id);

    if (isAlreadySelected) {
      toast({ variant: 'default', title: 'Ejercicio duplicado', description: 'Este ejercicio ya ha sido añadido a la sesión.' });
      return;
    }

    if (selectedExercises[phase].length < phaseLimits[phase]) {
      setSelectedExercises(prev => ({ ...prev, [phase]: [...prev[phase], exercise] }));
    } else {
      toast({ variant: 'destructive', title: 'Límite alcanzado', description: `No puedes añadir más ejercicios a esta fase.` });
    }
  };

  const removeExercise = (phase: SessionPhase, exerciseId: string) => {
    setSelectedExercises(prev => ({
      ...prev,
      [phase]: prev[phase].filter(ex => ex.id !== exerciseId)
    }));
  };

  const handleObjectiveChange = (objective: string) => {
    const currentObjectives = watchedValues.objectives || [];
    const newObjectives = currentObjectives.includes(objective)
      ? currentObjectives.filter(o => o !== objective)
      : [...currentObjectives, objective];

    if (newObjectives.length > 5) {
      toast({
        variant: "destructive",
        title: "Límite alcanzado",
        description: "Solo puedes seleccionar un máximo de 5 objetivos.",
      });
      return;
    }

    setValue("objectives", newObjectives, { shouldValidate: true });
  };

  const onSubmit = async (data: SessionFormData) => {
    if (!user) {
        toast({ variant: "destructive", title: "Error", description: "Debes iniciar sesión para crear una sesión." });
        return;
    }

    setIsSaving(true);
    const [hours, minutes] = data.time.split(':').map(Number);
    const sessionDate = new Date(data.date);
    sessionDate.setHours(hours, minutes);

    const sessionData = {
        ...data,
        name: `Sesión ${data.sessionNumber}`, // Adding name for compatibility
        date: Timestamp.fromDate(sessionDate),
        userId: user.uid,
        initialExercises: selectedExercises.initialExercises.map(ex => ex.id),
        mainExercises: selectedExercises.mainExercises.map(ex => ex.id),
        finalExercises: selectedExercises.finalExercises.map(ex => ex.id),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
    };

    try {
        const docRef = await addDoc(collection(db, 'sessions'), sessionData);
        toast({ title: "Sesión guardada", description: "Tu sesión de entrenamiento ha sido creada con éxito." });
        router.push(`/sesiones/${docRef.id}`);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error al guardar", description: error.message });
        setIsSaving(false);
    }
  };

  const sessionDataForPreview = {
      ...watchedValues,
      initialExercises: selectedExercises.initialExercises.map(e => e.id),
      mainExercises: selectedExercises.mainExercises.map(e => e.id),
      finalExercises: selectedExercises.finalExercises.map(e => e.id)
  };
  const teamNameForPreview = userTeams.find(t => t.id === watchedValues.teamId)?.name || '';

  const PhaseSection = ({ phase, title, subtitle }: { phase: SessionPhase; title: string; subtitle: string }) => {
    const exercisesForPhase = selectedExercises[phase];
    const limit = phaseLimits[phase];
    const placeholders = Array.from({ length: limit - exercisesForPhase.length });

    return (
        <Card>
            <CardHeader>
            <CardTitle>{title} <span className="text-muted-foreground font-normal">({exercisesForPhase.length}/{limit})</span></CardTitle>
            <CardDescription>{subtitle}</CardDescription>
            </CardHeader>
            <CardContent>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {exercisesForPhase.map((ex) => (
                     <Card key={ex.id} className="overflow-hidden group relative">
                        <div className="relative aspect-video w-full">
                         <Image src={ex['Imagen']} alt={ex['Ejercicio']} layout="fill" objectFit="contain" className="p-2" />
                        </div>
                        <div className="p-2 text-center border-t bg-card">
                             <p className="text-xs font-semibold truncate">{ex['Ejercicio']}</p>
                        </div>
                        <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeExercise(phase, ex.id)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </Card>
                ))}
                {placeholders.map((_, index) => (
                    <div key={'${phase}-placeholder-${index}'}>
                      <ExercisePicker 
                        phase={phase} 
                        allExercises={allExercises} 
                        allCategories={allCategories}
                        loadingExercises={loadingExercises}
                        onAddExercise={addExercise}
                      />
                    </div>
                ))}
            </div>
            </CardContent>
        </Card>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="hidden print:block">
        {printContent?.type === 'Básica' && (
          <div id="print-basic">
            <SessionBasicPreview sessionData={sessionDataForPreview} exercises={allExercises} teamName={teamNameForPreview} />
          </div>
        )}
        {printContent?.type === 'Pro' && (
          <div id="print-pro">
            <SessionProPreview sessionData={sessionDataForPreview} exercises={allExercises} />
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto space-y-8 print:hidden">
        <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold font-headline">Crear Sesión</h1>
            <p className="text-base md:text-lg text-muted-foreground mt-2">Planifica tu próximo entrenamiento paso a paso.</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Detalles de la Sesión</CardTitle></CardHeader>
          <CardContent className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <Label htmlFor="teamId">Equipo</Label>
                  <Controller
                      name="teamId"
                      control={control}
                      render={({ field }) => (
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingTeams}>
                              <SelectTrigger><SelectValue placeholder={loadingTeams ? "Cargando..." : "Seleccionar equipo"} /></SelectTrigger>
                              <SelectContent>
                                  {userTeams.map(team => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
                              </SelectContent>
                          </Select>
                      )}
                  />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="session-number">Número de Sesión</Label>
                    <Input id="session-number" type="number" placeholder="Ej: 1" {...register('sessionNumber')} />
                    {errors.sessionNumber && <p className="text-sm text-destructive">{errors.sessionNumber.message}</p>}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="facility">Instalación</Label>
                <Input id="facility" placeholder="Ej: Polideportivo Municipal" {...register('facility')} />
                {errors.facility && <p className="text-sm text-destructive">{errors.facility.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="microcycle">Microciclo</Label>
                <Input id="microcycle" placeholder="Ej: Semana 3 - Competitivo" {...register('microcycle')} />
                {errors.microcycle && <p className="text-sm text-destructive">{errors.microcycle.message}</p>}
              </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label>Fecha</Label>
                    <Controller
                        name="date"
                        control={control}
                        render={({ field }) => (
                            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                            <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={field.value} onSelect={(date) => { field.onChange(date); setIsCalendarOpen(false); }} initialFocus locale={es} weekStartsOn={1} />
                            </PopoverContent>
                            </Popover>
                        )}
                    />
                    {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="time">Hora</Label>
                    <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="time" type="time" className="pl-10" {...register('time')} />
                    </div>
                    {errors.time && <p className="text-sm text-destructive">{errors.time.message}</p>}
                </div>
            </div>
            <div className="space-y-2">
              <Label>Objetivos Principales ({watchedValues.objectives?.length || 0}/5)</Label>
               <div className="p-4 border rounded-lg space-y-4">
                  {Object.entries(objectivesByCategory).map(([category, objectives]) => (
                    <Collapsible key={category}>
                      <CollapsibleTrigger className="flex justify-between items-center w-full font-semibold">
                        {category}
                        <ChevronDown className="h-4 w-4" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 pt-2">
                        {objectives.map(objective => (
                          <div key={objective} className="flex items-start space-x-2 p-2 rounded-md hover:bg-muted">
                            <Checkbox
                              id={objective}
                              checked={(watchedValues.objectives || []).includes(objective)}
                              onCheckedChange={() => handleObjectiveChange(objective)}
                            />
                            <Label htmlFor={objective} className="text-sm font-normal cursor-pointer">
                              {objective}
                            </Label>
                          </div>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
               </div>
              {watchedValues.objectives && watchedValues.objectives.length > 0 && (
                <div className="space-y-2 pt-2">
                    <Label>Objetivos seleccionados:</Label>
                    <div className="flex flex-wrap gap-2">
                        {watchedValues.objectives.map(obj => <Badge key={obj} variant="secondary">{obj}</Badge>)}
                    </div>
                </div>
              )}
              {errors.objectives && <p className="text-sm text-destructive">{errors.objectives.message}</p>}
            </div>
          </CardContent>
        </Card>
        
        <PhaseSection phase="initialExercises" title="Fase Inicial (Calentamiento)" subtitle="Ejercicios para preparar al equipo." />
        <PhaseSection phase="mainExercises" title="Fase Principal" subtitle="El núcleo del entrenamiento, enfocado en los objetivos." />
        <PhaseSection phase="finalExercises" title="Fase Final (Vuelta a la Calma)" subtitle="Ejercicios de baja intensidad para la recuperación." />

        <Card>
            <CardContent className="p-6">
                <div className="flex justify-end items-center gap-4">
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Eye className="mr-2" />
                                Ver Ficha de Sesión
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Elige el tipo de ficha</DialogTitle>
                                <DialogDescription>
                                    Sesión de entrenamiento
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <div className="flex flex-col gap-2 items-center">
                                    <Image src="https://i.ibb.co/hJ2DscG7/basico.png" alt="Ficha Básica" width={200} height={283} className="rounded-md border"/>
                                    <Button onClick={() => setPrintContent({type: 'Básica'})} className="w-full">
                                      <Download className="mr-2" />
                                      Descargar Básica
                                    </Button>
                                </div>
                                 <div className="flex flex-col gap-2 items-center">
                                    <Image src="https://i.ibb.co/pBKy6D20/pro.png" alt="Ficha Pro" width={200} height={283} className="rounded-md border"/>
                                     <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="w-full">
                                                    <Button onClick={() => isProUser && setPrintContent({type: 'Pro'})} className="w-full" disabled={!isProUser}>
                                                        <Download className="mr-2" />
                                                        Descargar Pro
                                                    </Button>
                                                </div>
                                            </TooltipTrigger>
                                            {!isProUser && (
                                                <TooltipContent>
                                                    <p>Mejora al Plan Pro para acceder a esta función.</p>
                                                </TooltipContent>
                                            )}
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Button type="submit" size="lg" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                        Guardar Sesión
                    </Button>
                </div>
            </CardContent>
        </Card>
      </form>
    </div>
  );
}
