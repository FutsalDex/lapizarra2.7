
"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Calendar as CalendarIcon, Clock, Search, Eye, Save, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';
import { exercises, Exercise } from '@/lib/data';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type SessionPhase = 'warmup' | 'main' | 'cooldown';

const phaseLimits = {
  warmup: 2,
  main: 4,
  cooldown: 2,
};

export default function CrearSesionPage() {
  const [date, setDate] = useState<Date>();
  const [selectedExercises, setSelectedExercises] = useState<Record<SessionPhase, Exercise[]>>({
    warmup: [],
    main: [],
    cooldown: [],
  });
  const [selectedFormat, setSelectedFormat] = useState('basico');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const addExercise = (phase: SessionPhase, exercise: Exercise) => {
    setSelectedExercises(prev => {
      if (prev[phase].length < phaseLimits[phase]) {
        return {
          ...prev,
          [phase]: [...prev[phase], exercise]
        };
      }
      return prev;
    });
  };

  const removeExercise = (phase: SessionPhase, index: number) => {
    setSelectedExercises(prev => {
      const newPhaseExercises = [...prev[phase]];
      newPhaseExercises.splice(index, 1);
      return {
        ...prev,
        [phase]: newPhaseExercises
      };
    });
  };
  
    const allCategories = [...new Set(exercises.map(e => e['Categoría']))];
    const allEdades = [...new Set(exercises.flatMap(e => e['Edad']))];
    const uniqueEdades = [...new Set(allEdades)].filter(Boolean);

  const ExercisePicker = ({ phase }: { phase: SessionPhase }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('Todos');
    const [edadFilter, setEdadFilter] = useState('Todos');

    const filteredExercises = exercises.filter(exercise => {
      const matchesSearch = exercise['Ejercicio'].toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'Todos' || exercise['Categoría'] === categoryFilter;
      const matchesEdad = edadFilter === 'Todos' || (Array.isArray(exercise['Edad']) && exercise['Edad'].includes(edadFilter));
      return matchesSearch && matchesCategory && matchesEdad;
    });

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
          <CardDescription>Busca y selecciona un ejercicio de tu biblioteca.</CardDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nombre..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select onValueChange={setCategoryFilter} defaultValue="Todos">
              <SelectTrigger>
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todas las Categorías</SelectItem>
                 {allCategories.map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select onValueChange={setEdadFilter} defaultValue="Todos">
                <SelectTrigger>
                  <SelectValue placeholder="Edad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todas las Edades</SelectItem>
                  {uniqueEdades.map(edad => <SelectItem key={edad} value={edad}>{edad}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
        <ScrollArea className="h-[60vh]">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            {filteredExercises.map(exercise => (
              <DialogClose key={exercise.id} asChild>
                <Card 
                  className="cursor-pointer hover:shadow-lg overflow-hidden flex flex-col"
                  onClick={() => addExercise(phase, exercise)}
                >
                  <CardContent className="p-0 flex flex-col flex-grow">
                    <div className="relative aspect-video w-full bg-primary/80">
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
                {exercisesForPhase.map((ex, index) => (
                     <Card key={ex.id} className="overflow-hidden group relative">
                        <div className="relative aspect-video w-full bg-primary/80">
                         <Image src={ex['Imagen']} alt={ex['Ejercicio']} layout="fill" objectFit="contain" className="p-2" />
                        </div>
                        <div className="p-2 text-center border-t bg-card">
                             <p className="text-xs font-semibold truncate">{ex['Ejercicio']}</p>
                        </div>
                        <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeExercise(phase, index)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </Card>
                ))}
                {placeholders.map((_, index) => (
                    <div key={index}>
                        <ExercisePicker phase={phase} />
                    </div>
                ))}
            </div>
            </CardContent>
        </Card>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold font-headline">Crear Sesión</h1>
            <p className="text-base md:text-lg text-muted-foreground mt-2">Planifica tu próximo entrenamiento paso a paso.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Detalles de la Sesión</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="session-name">Nombre</Label>
                <Input id="session-name" placeholder="Ej: Sesión 01" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facility">Instalación</Label>
                <Input id="facility" placeholder="Ej: Polideportivo Municipal" />
              </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                  <Label>Fecha</Label>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(newDate) => {
                            setDate(newDate);
                            setIsCalendarOpen(false);
                        }}
                        initialFocus
                        locale={es}
                        weekStartsOn={1}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Hora</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="time" type="time" className="pl-10" />
                  </div>
                </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="main-objectives">Objetivos Principales</Label>
              <Textarea id="main-objectives" placeholder="Define los objetivos clave para este entrenamiento..." />
            </div>
          </CardContent>
        </Card>
        
        <PhaseSection phase="warmup" title="Fase Inicial (Calentamiento)" subtitle="Ejercicios para preparar al equipo." />
        <PhaseSection phase="main" title="Fase Principal" subtitle="El núcleo del entrenamiento, enfocado en los objetivos." />
        <PhaseSection phase="cooldown" title="Fase Final (Vuelta a la Calma)" subtitle="Ejercicios de baja intensidad para la recuperación." />


        <Card>
            <CardHeader>
                <CardTitle>Finalizar y Guardar</CardTitle>
                <CardDescription>Una vez que hayas añadido todos los ejercicios, puedes previsualizar la ficha de la sesión y guardarla.</CardDescription>
            </CardHeader>
            <CardContent>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button className="w-full" size="lg">Ver ficha y Guardar Sesión</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>¿Qué tipo de sesión quieres guardar?</DialogTitle>
                            <DialogDescription>
                            Elige el formato para tu ficha de sesión. La versión Pro requiere una suscripción.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                            <div 
                                className={cn(
                                    "border-2 rounded-lg p-4 cursor-pointer",
                                    selectedFormat === 'basico' ? 'border-primary' : 'border-border'
                                )}
                                onClick={() => setSelectedFormat('basico')}
                            >
                                <h3 className="font-semibold text-center mb-4">Básico</h3>
                                <div className="bg-muted rounded-md p-4 aspect-[4/3] flex items-center justify-center">
                                    <div className="w-full h-full bg-card border rounded-sm p-2 grid grid-cols-2 gap-2">
                                        <div className="bg-muted rounded-sm"></div>
                                        <div className="bg-muted rounded-sm"></div>
                                        <div className="bg-muted rounded-sm"></div>
                                        <div className="bg-muted rounded-sm"></div>
                                    </div>
                                </div>
                            </div>
                             <div 
                                className={cn(
                                    "border-2 rounded-lg p-4 cursor-pointer",
                                    selectedFormat === 'pro' ? 'border-primary' : 'border-border'
                                )}
                                onClick={() => setSelectedFormat('pro')}
                            >
                                <h3 className="font-semibold text-center mb-4">Pro</h3>
                                <div className="bg-muted rounded-md p-4 aspect-[4/3] flex items-center justify-center">
                                    <div className="w-full h-full bg-card border rounded-sm p-2 flex gap-2">
                                        <div className="w-1/3 space-y-2">
                                            <div className="bg-muted rounded-sm h-1/4"></div>
                                            <div className="bg-muted rounded-sm h-1/4"></div>
                                        </div>
                                        <div className="w-2/3 space-y-2">
                                           <div className="bg-muted rounded-sm h-1/4"></div>
                                           <div className="bg-muted rounded-sm h-1/2"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline">
                                <Eye className="mr-2 h-4 w-4" />
                                Previsualizar PDF
                            </Button>
                            <Button>
                                <Save className="mr-2 h-4 w-4" />
                                Guardar Sesión
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>

      </div>
    </div>
  );
}
