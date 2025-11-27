
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Calendar as CalendarIcon, Clock, Search, Save, X, Loader2, ChevronDown, ArrowLeft, Eye, ListChecks } from 'lucide-react';
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
import { collection, doc, updateDoc, Timestamp, getFirestore, query, where, or } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '@/firebase/config';
import { Exercise } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const db = getFirestore(app);
const auth = getAuth(app);

type SessionPhase = 'initialExercises' | 'mainExercises' | 'finalExercises';

const phaseLimits: Record<SessionPhase, number> = {
  initialExercises: 2,
  mainExercises: 4,
  finalExercises: 2,
};

const objectivesByCategory = {
  Técnicos: ["Perfeccionar el control de balón en espacios reducidos para mayor precisión.","Mejorar pases cortos y largos con ambas piernas para fluidez en el juego.","Desarrollar regates y fintas para superar rivales en uno contra uno.","Potenciar la finalización variada (tiros, vaselinas, colocados) en situaciones de gol.","Reforzar el dominio aéreo y el cabezazo ofensivo/defensivo en corners.","Mejorar la recepción orientada para iniciar contraataques rápidos.","Entrenar el toque de primera en pases y centros para velocidad de juego.","Desarrollar el uso del cuerpo para proteger el balón bajo presión.","Potenciar disparos a portería desde ángulos cerrados.","Reforzar la técnica de volea y media volea en finalizaciones aéreas."],
  Tácticos: ["Desarrollar patrones de juego posicional para superioridad numérica.","Implementar presión alta y robo de balón en zonas avanzadas.","Optimizar transiciones rápidas de ataque a defensa y viceversa.","Entrenar sistemas defensivos como el 2-2 o pressing zonal.","Fomentar el uso de paredes y triangulaciones para desequilibrar defensas.","Mejorar la construcción desde atrás con el portero como iniciador.","Entrenar la amplitud en ataque para estirar la defensa rival.","Desarrollar bloqueos y pantallas para crear espacios en el área.","Implementar rotaciones posicionales para confundir al pressing.","Optimizar el contraataque en inferioridad numérica temporal."],
  Físicos: ["Aumentar la resistencia aeróbica para mantener intensidad durante todo el partido.","Mejorar la velocidad explosiva en sprints cortos y cambios de dirección.","Desarrollar agilidad y coordinación motora en pista limitada.","Fortalecer el core y las piernas para mayor potencia en disparos y saltos.","Trabajar la recuperación activa para minimizar fatiga entre acciones.","Potenciar la fuerza explosiva en saltos y duelos aéreos.","Mejorar la flexibilidad dinámica para movimientos fluidos.","Entrenar la capacidad anaeróbica para ráfagas de alta intensidad.","Desarrollar el equilibrio en situaciones de contacto.","Fomentar la resistencia a la fatiga muscular en fases finales de partido."],
  Colectivos: ["Fomentar la comunicación verbal y no verbal entre líneas.","Mejorar la coordinación en movimientos sincronizados de equipo.","Desarrollar toma de decisiones colectivas bajo presión temporal.","Promover el apoyo mutuo en ataque y cobertura en defensa.","Cultivar el espíritu de equipo mediante rotaciones y roles intercambiables.","Entrenar la sincronía en el pressing colectivo.","Mejorar la lectura mutua de espacios y apoyos.","Fomentar el liderazgo distribuido en momentos clave.","Desarrollar la empatía en la cobertura de compañeros.","Promover la celebración colectiva para reforzar la cohesión."],
  Mentales: ["Aumentar la concentración sostenida en fases de alta intensidad.","Desarrollar adaptabilidad a cambios tácticos o imprevistos del rival.","Potenciar la motivación intrínseca para superar errores en juego.","Entrenar la gestión emocional para mantener la calma en momentos clave.","Fomentar la visualización y preparación mental pre-partido.","Mejorar la resiliencia ante derrotas parciales o fallos.","Entrenar la confianza en la toma de riesgos calculados.","Desarrollar la percepción de fatiga para autocontrol.","Potenciar la gratitud y el disfrute en el proceso de entrenamiento.","Fomentar la reflexión post-sesión para aprendizaje continuo"],
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

const SessionPreview = ({ sessionData, exercises }: { sessionData: any, exercises: Exercise[] }) => {
    const getExercisesByIds = (ids: string[]) => {
        if (!ids || ids.length === 0) return [];
        return ids.map(id => exercises.find(ex => ex.id === id)).filter(Boolean) as Exercise[];
    };

    const PhaseSectionPreview = ({ title, exercises }: { title: string; exercises: Exercise[] }) => (
        <div className="space-y-4">
            <h3 className="text-xl font-bold font-headline text-primary">{title}</h3>
            {exercises.length > 0 ? exercises.map(ex => (
                <div key={ex.id} className="p-3 border rounded-md">
                    <p className="font-semibold">{ex['Ejercicio']}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{ex['Descripción de la tarea']}</p>
                </div>
            )) : <p className="text-sm text-muted-foreground">No hay ejercicios en esta fase.</p>}
        </div>
    );

    return (
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>Previsualización de la Sesión</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] p-4">
                <div className="space-y-6">
                    <PhaseSectionPreview title="Fase Inicial" exercises={getExercisesByIds(sessionData.initialExercises)} />
                    <PhaseSectionPreview title="Fase Principal" exercises={getExercisesByIds(sessionData.mainExercises)} />
                    <PhaseSectionPreview title="Fase Final" exercises={getExercisesByIds(sessionData.finalExercises)} />
                </div>
            </ScrollArea>
        </DialogContent>
    );
};

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
               {allCategories.map((category, index) => <SelectItem key={`${category}-${index}`} value={category}>{category}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select onValueChange={setEdadFilter} defaultValue="Todos">
              <SelectTrigger>
                <SelectValue placeholder="Edad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todas las Edades</SelectItem>
                {allEdades.map((edad, index) => <SelectItem key={`${edad}-${index}`} value={edad}>{edad}</SelectItem>)}
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


export default function EditarSesionPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id as string;

  const { toast } = useToast();
  const [user, loadingAuth] = useAuthState(auth);
  
  const [session, loadingSession, errorSession] = useDocumentData(doc(db, 'sessions', sessionId));
  
  const [selectedExercises, setSelectedExercises] = useState<Record<SessionPhase, Exercise[]>>({
    initialExercises: [],
    mainExercises: [],
    finalExercises: [],
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewType, setPreviewType] = useState<'Básica' | 'Pro' | null>(null);

  const { register, handleSubmit, control, formState: { errors }, setValue, watch, reset } = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema),
  });
  const watchedValues = watch();
  
  const [allExercisesSnapshot, loadingExercises] = useCollection(collection(db, 'exercises'));
  const allExercises = useMemo(() => allExercisesSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exercise)) || [], [allExercisesSnapshot]);
  const allCategories = useMemo(() => [...new Set(allExercises.map(e => e['Categoría']))].sort(), [allExercises]);

  const teamsQuery = user ? query(collection(db, 'teams'), or(where('ownerId', '==', user.uid), where('memberIds', 'array-contains', user.uid))) : null;
  const [teamsSnapshot, loadingTeams] = useCollection(teamsQuery);
  const userTeams = useMemo(() => teamsSnapshot?.docs.map(doc => ({ id: doc.id, name: doc.data().name })) || [], [teamsSnapshot]);

  useEffect(() => {
    if (session && allExercises.length > 0) {
      const sessionDate = (session.date as Timestamp).toDate();
      reset({
        sessionNumber: session.sessionNumber,
        facility: session.facility,
        date: sessionDate,
        time: format(sessionDate, 'HH:mm'),
        objectives: session.objectives || [],
        teamId: session.teamId,
        microcycle: session.microcycle,
      });

      setSelectedExercises({
        initialExercises: (session.initialExercises || []).map((id: string) => allExercises.find(ex => ex.id === id)).filter(Boolean),
        mainExercises: (session.mainExercises || []).map((id: string) => allExercises.find(ex => ex.id === id)).filter(Boolean),
        finalExercises: (session.finalExercises || []).map((id: string) => allExercises.find(ex => ex.id === id)).filter(Boolean),
      });
    }
  }, [session, allExercises, reset]);


  const addExercise = (phase: SessionPhase, exercise: Exercise) => {
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
        toast({ variant: "destructive", title: "Error", description: "Debes iniciar sesión para editar una sesión." });
        return;
    }

    setIsSaving(true);
    const [hours, minutes] = data.time.split(':').map(Number);
    const sessionDate = new Date(data.date);
    sessionDate.setHours(hours, minutes);

    const sessionData = {
        ...data,
        name: `Sesión ${data.sessionNumber}`,
        date: Timestamp.fromDate(sessionDate),
        initialExercises: selectedExercises.initialExercises.map(ex => ex.id),
        mainExercises: selectedExercises.mainExercises.map(ex => ex.id),
        finalExercises: selectedExercises.finalExercises.map(ex => ex.id),
        updatedAt: Timestamp.now(),
    };

    try {
        await updateDoc(doc(db, 'sessions', sessionId), sessionData);
        toast({ title: "Sesión guardada", description: "Tu sesión de entrenamiento ha sido actualizada con éxito." });
        router.push(`/sesiones/${sessionId}`);
    } catch (error: any) {
        toast({ variant: "destructive", title: "Error al guardar", description: error.message });
        setIsSaving(false);
    }
  };
  
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
                  <div key={`${phase}-placeholder-${index}`}>
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

  const isLoading = loadingAuth || loadingSession || loadingExercises || loadingTeams;

  if (isLoading) {
    return (
        <div className="container mx-auto px-4 py-8">
             <div className="max-w-4xl mx-auto space-y-8">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-12 w-full" />
             </div>
        </div>
    )
  }

   if (errorSession) {
    return <p>Error: {errorSession.message}</p>
  }

  return (
    <div className="container mx-auto px-4 py-8">
        <Button variant="outline" asChild className="mb-6">
            <a href={`/sesiones/${sessionId}`}><ArrowLeft className="mr-2" />Volver a la Sesión</a>
        </Button>
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold font-headline">Editar Sesión</h1>
            <p className="text-base md:text-lg text-muted-foreground mt-2">Modifica los detalles de tu entrenamiento.</p>
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
                          <Select onValueChange={field.onChange} value={field.value} disabled={loadingTeams}>
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
                              checked={watchedValues.objectives?.includes(objective)}
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

        <div className="flex justify-end items-center gap-4">
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogTrigger asChild>
                    <Button variant="outline">
                        <Eye className="mr-2" />
                        Ver Ficha de Sesión
                    </Button>
                </DialogTrigger>
                {previewType ? (
                     <SessionPreview 
                           sessionData={{
                                ...watchedValues,
                                initialExercises: selectedExercises.initialExercises.map(e => e.id),
                                mainExercises: selectedExercises.mainExercises.map(e => e.id),
                                finalExercises: selectedExercises.finalExercises.map(e => e.id)
                            }}
                            exercises={allExercises}
                        />
                ) : (
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Elige el tipo de ficha</DialogTitle>
                            <DialogDescription>
                                Selecciona qué versión de la ficha de sesión quieres generar.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <div className="flex flex-col gap-2 items-center">
                                <Image src="https://i.ibb.co/hJ2DscG7/basico.png" alt="Ficha Básica" width={200} height={283} className="rounded-md border"/>
                                <Button onClick={() => setPreviewType('Básica')} className="w-full">Generar Ficha Básica</Button>
                            </div>
                            <div className="flex flex-col gap-2 items-center">
                                <Image src="https://i.ibb.co/pBKy6D20/pro.png" alt="Ficha Pro" width={200} height={283} className="rounded-md border"/>
                                <Button onClick={() => setPreviewType('Pro')} className="w-full">Generar Ficha Pro</Button>
                            </div>
                        </div>
                    </DialogContent>
                )}
            </Dialog>

            <Button type="submit" size="lg" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                Guardar Cambios
            </Button>
        </div>
      </form>
    </div>
  );
}
