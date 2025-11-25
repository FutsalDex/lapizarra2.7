
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Play, Pause, RotateCcw, Plus, Minus, Goal, ShieldAlert, BarChart3, Settings } from "lucide-react";
import Link from 'next/link';
import { cn } from '@/lib/utils';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


type Stat = {
    goles: number;
    faltas: number;
    amarillas: number;
    rojas: number;
};

type Periodo = '1ª Parte' | '2ª Parte';

type PeriodStats = {
    local: Stat;
    visitante: Stat;
    localTimeout: boolean;
    visitanteTimeout: boolean;
}

const initialStats: Stat = {
    goles: 0,
    faltas: 0,
    amarillas: 0,
    rojas: 0,
};

const getInitialPeriodStats = (): PeriodStats => ({
    local: { ...initialStats },
    visitante: { ...initialStats },
    localTimeout: false,
    visitanteTimeout: false
});


const StatCounter = ({ title, value, onIncrement, onDecrement, icon }: { title: string; value: number; onIncrement: () => void; onDecrement: () => void; icon: React.ReactNode }) => (
    <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            {icon}
            <span className="font-medium text-sm">{title}</span>
        </div>
        <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={onDecrement} disabled={value <= 0}>
                <Minus className="h-4 w-4" />
            </Button>
            <span className="w-6 text-center text-base font-bold">{value}</span>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={onIncrement}>
                <Plus className="h-4 w-4" />
            </Button>
        </div>
    </div>
);

export default function MarcadorRapidoPage() {
    const { toast } = useToast();
    const [periodo, setPeriodo] = useState<Periodo>('1ª Parte');
    
    const [stats, setStats] = useState<Record<Periodo, PeriodStats>>({
        '1ª Parte': getInitialPeriodStats(),
        '2ª Parte': getInitialPeriodStats(),
    });

    const [localTeamName, setLocalTeamName] = useState('Local');
    const [visitorTeamName, setVisitorTeamName] = useState('Visitante');
    const [matchDuration, setMatchDuration] = useState(25);

    const [tempLocalTeamName, setTempLocalTeamName] = useState('');
    const [tempVisitorTeamName, setTempVisitorTeamName] = useState('');
    const [tempMatchDuration, setTempMatchDuration] = useState(matchDuration);

    const [time, setTime] = useState(matchDuration * 60);
    const [isActive, setIsActive] = useState(false);
    
    const currentStats = stats[periodo];

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isActive && time > 0) {
            interval = setInterval(() => {
                setTime((prevTime) => prevTime - 1);
            }, 1000);
        } else if (time === 0 && isActive) {
            setIsActive(false);
            toast({ title: `Final de la ${periodo}` });
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive, time, periodo, toast]);

    const toggleTimer = () => setIsActive(!isActive);

    const resetTimer = useCallback(() => {
        setIsActive(false);
        setTime(matchDuration * 60);
    }, [matchDuration]);
    
    const handleStatChange = (
        team: 'local' | 'visitante', 
        stat: keyof Stat, 
        delta: number
    ) => {
        setStats(prev => {
            const newStats = JSON.parse(JSON.stringify(prev));
            const currentVal = newStats[periodo][team][stat];
             if (stat === 'faltas' && currentVal >= 5 && delta > 0) {
                toast({
                    title: "Límite de faltas",
                    description: `El equipo ${team === 'local' ? localTeamName : visitorTeamName} ha alcanzado el límite de 5 faltas.`,
                });
                return newStats;
            }
            newStats[periodo][team][stat] = Math.max(0, currentVal + delta);
            return newStats;
        });
    };
    
    const handlePeriodChange = (newPeriod: Periodo) => {
        if(periodo === newPeriod) return;
        setIsActive(false);
        setPeriodo(newPeriod);
        resetTimer();
    }
    
    const handleTimeout = (team: 'local' | 'visitante') => {
        if (currentStats[team === 'local' ? 'localTimeout' : 'visitanteTimeout']) return;

        setStats(prev => {
            const newStats = JSON.parse(JSON.stringify(prev));
            newStats[periodo][team === 'local' ? 'localTimeout' : 'visitanteTimeout'] = true;
            return newStats;
        });
        toast({
            title: "Tiempo Muerto",
            description: `El equipo ${team === 'local' ? localTeamName : visitorTeamName} ha solicitado tiempo muerto.`,
        });
    }

    const resetAll = () => {
        resetTimer();
        setStats({
             '1ª Parte': getInitialPeriodStats(),
             '2ª Parte': getInitialPeriodStats(),
        });
        setPeriodo('1ª Parte');
        toast({
            title: "Marcador reiniciado",
            description: "Todas las estadísticas y el tiempo han sido restablecidos.",
        });
    }

    const applySettings = () => {
        if (tempLocalTeamName) setLocalTeamName(tempLocalTeamName);
        if (tempVisitorTeamName) setVisitorTeamName(tempVisitorTeamName);
        if (matchDuration !== tempMatchDuration) {
          setMatchDuration(tempMatchDuration);
          setTime(tempMatchDuration * 60);
          setIsActive(false);
        }
        setTempLocalTeamName('');
        setTempVisitorTeamName('');
        
        toast({
            title: "Configuración guardada",
            description: "Los cambios se han aplicado al marcador.",
        });
    }

    const formatTime = (timeInSeconds: number) => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = timeInSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const SquareIcon = ({ className }: { className?: string }) => (
        <div className={cn("w-3 h-4", className)} />
    );

    const totalGolesLocal = stats['1ª Parte'].local.goles + stats['2ª Parte'].local.goles;
    const totalGolesVisitante = stats['1ª Parte'].visitante.goles + stats['2ª Parte'].visitante.goles;

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
            <Button variant="outline" asChild>
                <Link href="/panel">
                    <ArrowLeft className="mr-2" />
                    Volver al Panel
                </Link>
            </Button>
        </div>
        <div className="text-center mb-8 max-w-lg mx-auto">
            <div className="flex justify-center mb-4">
                <div className="bg-muted p-3 rounded-full inline-flex">
                    <BarChart3 className="w-8 h-8 text-primary" />
                </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold font-headline">Marcador Rápido</h1>
            <p className="text-base md:text-lg text-muted-foreground mt-2">
                Usa el marcador para un partido rápido o un entrenamiento.
            </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
            <Card>
                <CardContent className="p-4 md:p-6">
                    <div className="grid grid-cols-3 items-center text-center gap-2">
                        {/* Equipo Local */}
                        <div className="flex flex-col items-center gap-3">
                            <h2 className="text-base md:text-xl font-bold truncate">{localTeamName}</h2>
                            <div className="flex items-center gap-2">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className={cn("w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-destructive", i < currentStats.local.faltas ? 'bg-destructive' : '')}></div>
                                ))}
                            </div>
                            <Button 
                                variant={currentStats.localTimeout ? "default" : "outline"}
                                className={cn("h-8 px-2 text-xs", {"bg-primary hover:bg-primary/90 text-primary-foreground": currentStats.localTimeout})}
                                size="sm" 
                                onClick={() => handleTimeout('local')}
                                disabled={currentStats.localTimeout}
                            >
                                TM
                            </Button>
                        </div>

                        {/* Score y Timer */}
                        <div className="flex flex-col items-center gap-2">
                            <div className="text-5xl md:text-6xl font-bold text-primary">{totalGolesLocal} - {totalGolesVisitante}</div>
                            <div className="text-4xl md:text-6xl font-bold bg-gray-900 text-white p-2 md:p-4 rounded-lg w-full">
                               {formatTime(time)}
                            </div>
                        </div>

                        {/* Equipo Visitante */}
                        <div className="flex flex-col items-center gap-3">
                            <h2 className="text-base md:text-xl font-bold truncate">{visitorTeamName}</h2>
                            <div className="flex items-center gap-2">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className={cn("w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-destructive", i < currentStats.visitante.faltas ? 'bg-destructive' : '')}></div>
                                ))}
                            </div>
                             <Button 
                                variant={currentStats.visitanteTimeout ? "default" : "outline"} 
                                className={cn("h-8 px-2 text-xs", {"bg-primary hover:bg-primary/90 text-primary-foreground": currentStats.visitanteTimeout})}
                                size="sm" 
                                onClick={() => handleTimeout('visitante')}
                                disabled={currentStats.visitanteTimeout}
                            >
                                TM
                            </Button>
                        </div>
                    </div>
                     <div className="flex flex-wrap justify-center gap-2 mt-4">
                        <Button onClick={toggleTimer} size="sm">
                            {isActive ? <><Pause className="mr-2"/>Pausar</> : <><Play className="mr-2"/>Iniciar</>}
                        </Button>
                        <Button variant="outline" onClick={resetTimer} size="sm"><RotateCcw className="mr-2"/>Reiniciar</Button>
                        <Dialog>
                            <DialogTrigger asChild>
                                 <Button variant="ghost" size="icon">
                                    <Settings />
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Configuración del Marcador</DialogTitle>
                                    <DialogDescription>
                                        Los cambios se aplicarán al marcador actual. Los nombres en blanco no se actualizarán.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="local-team-name">Equipo Local</Label>
                                        <Input id="local-team-name" placeholder={localTeamName} value={tempLocalTeamName} onChange={(e) => setTempLocalTeamName(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="visitor-team-name">Equipo Visitante</Label>
                                        <Input id="visitor-team-name" placeholder={visitorTeamName} value={tempVisitorTeamName} onChange={(e) => setTempVisitorTeamName(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="match-duration">Tiempo (min)</Label>
                                        <Input id="match-duration" type="number" value={tempMatchDuration} onChange={(e) => setTempMatchDuration(Number(e.target.value))} />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button type="button" variant="secondary">
                                            Cancelar
                                        </Button>
                                    </DialogClose>
                                    <DialogClose asChild>
                                        <Button type="button" onClick={applySettings}>
                                            Aplicar Cambios
                                        </Button>
                                    </DialogClose>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <div className="flex justify-center gap-2 mt-4">
                        <Button variant={periodo === '1ª Parte' ? 'secondary' : 'ghost'} size="sm" onClick={() => handlePeriodChange('1ª Parte')}>1ª Parte</Button>
                        <Button variant={periodo === '2ª Parte' ? 'secondary' : 'ghost'} size="sm" onClick={() => handlePeriodChange('2ª Parte')}>2ª Parte</Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex-row items-center justify-between bg-primary text-primary-foreground p-4 rounded-t-lg">
                    <CardTitle className="text-base md:text-lg">Estadísticas del Periodo: {periodo}</CardTitle>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm"><RotateCcw className="mr-2"/>Reiniciar Todo</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Reiniciar marcador?</AlertDialogTitle>
                                <AlertDialogDescription>
                                Esta acción restablecerá todas las estadísticas y el tiempo a sus valores iniciales. No se puede deshacer.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={resetAll}>Sí, reiniciar</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardHeader>
                <CardContent className="p-4 md:p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                        <div className="space-y-4">
                            <h3 className="font-bold text-center">{localTeamName}</h3>
                             <StatCounter 
                                title="Goles"
                                value={currentStats.local.goles}
                                onIncrement={() => handleStatChange('local', 'goles', 1)}
                                onDecrement={() => handleStatChange('local', 'goles', -1)}
                                icon={<Goal className="text-muted-foreground" />}
                           />
                            <StatCounter 
                                title="Faltas"
                                value={currentStats.local.faltas}
                                onIncrement={() => handleStatChange('local', 'faltas', 1)}
                                onDecrement={() => handleStatChange('local', 'faltas', -1)}
                                icon={<ShieldAlert className="text-muted-foreground" />}
                           />
                            <StatCounter 
                                title="T. Amarillas"
                                value={currentStats.local.amarillas}
                                onIncrement={() => handleStatChange('local', 'amarillas', 1)}
                                onDecrement={() => handleStatChange('local', 'amarillas', -1)}
                                icon={<SquareIcon className="bg-yellow-400" />}
                           />
                           <StatCounter 
                                title="T. Rojas"
                                value={currentStats.local.rojas}
                                onIncrement={() => handleStatChange('local', 'rojas', 1)}
                                onDecrement={() => handleStatChange('local', 'rojas', -1)}
                                icon={<SquareIcon className="bg-red-600" />}
                           />
                        </div>
                         <div className="space-y-4">
                            <h3 className="font-bold text-center">{visitorTeamName}</h3>
                             <StatCounter 
                                title="Goles"
                                value={currentStats.visitante.goles}
                                onIncrement={() => handleStatChange('visitante', 'goles', 1)}
                                onDecrement={() => handleStatChange('visitante', 'goles', -1)}
                                icon={<Goal className="text-muted-foreground" />}
                           />
                            <StatCounter 
                                title="Faltas"
                                value={currentStats.visitante.faltas}
                                onIncrement={() => handleStatChange('visitante', 'faltas', 1)}
                                onDecrement={() => handleStatChange('visitante', 'faltas', -1)}
                                icon={<ShieldAlert className="text-muted-foreground" />}
                           />
                            <StatCounter 
                                title="T. Amarillas"
                                value={currentStats.visitante.amarillas}
                                onIncrement={() => handleStatChange('visitante', 'amarillas', 1)}
                                onDecrement={() => handleStatChange('visitante', 'amarillas', -1)}
                                icon={<SquareIcon className="bg-yellow-400" />}
                           />
                           <StatCounter 
                                title="T. Rojas"
                                value={currentStats.visitante.rojas}
                                onIncrement={() => handleStatChange('visitante', 'rojas', 1)}
                                onDecrement={() => handleStatChange('visitante', 'rojas', -1)}
                                icon={<SquareIcon className="bg-red-600" />}
                           />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
