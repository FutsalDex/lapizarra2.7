
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDocumentData, useCollection } from 'react-firebase-hooks/firestore';
import { doc, updateDoc, collection, query, getFirestore } from 'firebase/firestore';
import { app } from '@/firebase/config';
import { useParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Save, Play, Pause, Plus, Minus, Flag, ShieldAlert, Target, RefreshCw, XCircle, Goal, ArrowRightLeft, Lock, Unlock, Loader2 } from "lucide-react";
import Link from 'next/link';
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
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import AuthGuard from '@/components/auth/AuthGuard';

const db = getFirestore(app);

type Player = {
  id: string;
  name: string;
  number: string;
}

type PlayerStat = {
  minutesPlayed: number;
  goals: number;
  assists: number;
  fouls: number;
  shotsOnTarget: number;
  shotsOffTarget: number;
  recoveries: number;
  turnovers: number;
  saves: number;
  goalsConceded: number;
  unoVsUno: number;
  yellowCards: number;
  redCards: number;
};

const getInitialPlayerStat = (): PlayerStat => ({
  minutesPlayed: 0, goals: 0, assists: 0, fouls: 0, shotsOnTarget: 0, shotsOffTarget: 0,
  recoveries: 0, turnovers: 0, saves: 0, goalsConceded: 0, unoVsUno: 0, yellowCards: 0, redCards: 0,
});

type OpponentStats = {
    goals: number;
    shotsOnTarget: number;
    shotsOffTarget: number;
    fouls: number;
    recoveries: number;
    turnovers: number;
    yellowCards: number;
    redCards: number;
}

type MatchEvent = {
    type: 'goal' | 'card';
    minute: number;
    team: 'local' | 'visitor';
    playerName: string;
    playerId?: string;
    cardType?: 'yellow' | 'red';
};


const getInitialOpponentStats = (): OpponentStats => ({
    goals: 0, shotsOnTarget: 0, shotsOffTarget: 0, fouls: 0,
    recoveries: 0, turnovers: 0, yellowCards: 0, redCards: 0,
});

const StatButton = ({ value, onIncrement, onDecrement, disabled }: { value: number, onIncrement: () => void, onDecrement: () => void, disabled: boolean }) => (
    <div className="flex items-center justify-center gap-1">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDecrement} disabled={value <= 0 || disabled}><Minus className="h-3 w-3"/></Button>
        <span className="w-4 text-center">{value}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onIncrement} disabled={disabled}><Plus className="h-3 w-3"/></Button>
    </div>
);

const OpponentStatCounters = ({ title, value, onIncrement, onDecrement, icon, disabled }: { title: string; value: number; onIncrement: () => void; onDecrement: () => void; icon: React.ReactNode, disabled: boolean }) => (
    <div className="flex items-center justify-between rounded-lg border p-3 bg-card">
        <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium text-sm">{title}</span>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={onDecrement} disabled={value <= 0 || disabled}>
                <Minus className="h-4 w-4" />
            </Button>
            <span className="w-6 text-center text-lg font-bold">{value}</span>
            <Button variant="outline" size="icon" className="h-7 w-7" onClick={onIncrement} disabled={disabled}>
                <Plus className="h-4 w-4" />
            </Button>
        </div>
    </div>
);

type Period = '1H' | '2H';

const statHeaders = [
    { key: "goals", label: "GOL" },
    { key: "assists", label: "ASI" },
    { key: "fouls", label: "FAL" },
    { key: "shotsOnTarget", label: "T.P." },
    { key: "shotsOffTarget", label: "T.F." },
    { key: "recoveries", label: "REC" },
    { key: "turnovers", label: "PER" },
    { key: "saves", label: "PAR" },
    { key: "goalsConceded", label: "GC" },
    { key: "unoVsUno", label: "1VS1" },
    { key: "yellowCards", label: "TA" },
    { key: "redCards", label: "TR" },
];

const legendItems = [
    { abbr: "GOL", full: "Goles" }, { abbr: "ASI", full: "Asistencias" }, { abbr: "FAL", full: "Faltas" },
    { abbr: "T.P.", full: "Tiros a Puerta" }, { abbr: "T.F.", full: "Tiros Fuera" }, { abbr: "REC", full: "Recuperaciones" },
    { abbr: "PER", full: "Pérdidas" }, { abbr: "PAR", full: "Paradas" }, { abbr: "GC", full: "Goles en Contra" },
    { abbr: "1VS1", full: "Uno contra Uno" }, { abbr: "TA", full: "Tarjeta Amarilla" }, { abbr: "TR", full: "Tarjeta Roja" },
];

export default function EstadisticasPartidoPage() {
    const { toast } = useToast();
    const params = useParams();
    const matchId = params.id as string;
    
    const [match, loadingMatch, errorMatch] = useDocumentData(doc(db, "matches", matchId));
    
    const [team, loadingTeam] = useDocumentData(match ? doc(db, `teams/${match.teamId}`) : null);
    const myTeamName = team?.name || "";

    const [playersSnapshot, loadingPlayers] = useCollection(match ? query(collection(db, `teams/${match.teamId}/players`)) : null);

    const [activePlayers, setActivePlayers] = useState<Player[]>([]);

    const [period, setPeriod] = useState<Period>('1H');
    const [isFinished, setIsFinished] = useState(match?.isFinished || false);

    const playerStatsRef = useRef<Record<string, PlayerStat>>({});
    const opponentStatsRef = useRef<OpponentStats>(getInitialOpponentStats());
    const localTimeoutTakenRef = useRef(false);
    const opponentTimeoutTakenRef = useRef(false);
    const eventsRef = useRef<MatchEvent[]>([]);
    const localScoreRef = useRef(0);
    const visitorScoreRef = useRef(0);
    
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
    const [matchDuration] = useState(25);
    const [time, setTime] = useState(matchDuration * 60);
    const [isActive, setIsActive] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    
    const [renderTrigger, setRenderTrigger] = useState(0);
    const forceUpdate = useCallback(() => setRenderTrigger(v => v + 1), []);


    useEffect(() => {
        if(match && playersSnapshot) {
            const squadPlayerIds = new Set(match.squad || []);
            const squadPlayers = playersSnapshot.docs
                .map(doc => ({id: doc.id, ...doc.data() } as Player))
                .filter(p => squadPlayerIds.has(p.id))
                .sort((a, b) => Number(a.number) - Number(b.number));
            setActivePlayers(squadPlayers);
            setIsFinished(match.isFinished);
        }
    }, [match, playersSnapshot]);
    
    useEffect(() => {
        if (match && activePlayers.length > 0) {
            eventsRef.current = match.events || [];

            const currentPeriodPlayerStats = match.playerStats?.[period] || {};
            const fullPlayerStats: Record<string, PlayerStat> = {};
            
            activePlayers.forEach(p => {
                fullPlayerStats[p.id] = { ...getInitialPlayerStat(), ...currentPeriodPlayerStats[p.id] };
            });
            playerStatsRef.current = fullPlayerStats;

            opponentStatsRef.current = match.opponentStats?.[period] || getInitialOpponentStats();
            localTimeoutTakenRef.current = match.timeouts?.[period]?.local || false;
            opponentTimeoutTakenRef.current = match.timeouts?.[period]?.visitor || false;
            
            localScoreRef.current = (match.events || []).filter((e: MatchEvent) => e.type === 'goal' && e.team === 'local').length;
            visitorScoreRef.current = (match.events || []).filter((e: MatchEvent) => e.type === 'goal' && e.team === 'visitor').length;

            forceUpdate();
        }
    }, [match, period, activePlayers, forceUpdate]);

     const saveStats = useCallback(async (auto = false) => {
        if (!match || isFinished) return;

        const currentIsSaving = auto ? setIsAutoSaving : setIsSaving;
        currentIsSaving(true);
        
        const updateData = {
            isFinished,
            events: eventsRef.current,
            localScore: localScoreRef.current,
            visitorScore: visitorScoreRef.current,
            playerStats: {
                ...match.playerStats,
                [period]: playerStatsRef.current
            },
            opponentStats: {
                ...match.opponentStats,
                [period]: opponentStatsRef.current
            },
            timeouts: {
                ...match.timeouts,
                [period]: { local: localTimeoutTakenRef.current, visitor: opponentTimeoutTakenRef.current }
            }
        };
        
        try {
            await updateDoc(doc(db, "matches", matchId), updateData);
            if (!auto) {
                toast({
                    title: "Estadísticas guardadas",
                    description: "Los cambios se han guardado en Firestore.",
                });
            }
        } catch (error: any) {
            if (!auto) {
                toast({ variant: 'destructive', title: 'Error al guardar', description: error.message });
            }
            console.error("Save error:", error);
        } finally {
            currentIsSaving(false);
        }
    }, [match, period, isFinished, matchId, toast]);

    useEffect(() => {
        if (isFinished) return;
        const intervalId = setInterval(() => {
            saveStats(true);
        }, 5000);
        return () => clearInterval(intervalId);
    }, [isFinished, saveStats]);
    
    const handlePeriodChange = (newPeriod: string) => {
        if (period === newPeriod) return;
        saveStats(false);
        setPeriod(newPeriod as Period);
        setIsActive(false);
        setTime(matchDuration * 60);
        setSelectedPlayerIds(new Set());
    };

    const handleOpponentStatChange = (stat: keyof OpponentStats, delta: number) => {
        if (isFinished) return;
        const newValue = Math.max(0, (opponentStatsRef.current[stat] || 0) + delta);
        opponentStatsRef.current[stat] = newValue;

        if (stat === 'goals' && delta > 0) {
            let currentMinute = matchDuration - Math.floor(time / 60);
            if (period === '2H') {
                currentMinute += matchDuration;
            }
            const myTeamIsLocal = match?.localTeam === myTeamName;
            const opponentTeamName = myTeamIsLocal ? match?.visitorTeam : match?.localTeam;

            const newEvent: MatchEvent = {
                type: 'goal',
                minute: currentMinute,
                team: myTeamIsLocal ? 'visitor' : 'local',
                playerName: opponentTeamName || 'Oponente',
            };
            eventsRef.current = [...eventsRef.current, newEvent];

            if (myTeamIsLocal) {
                visitorScoreRef.current += delta;
            } else {
                localScoreRef.current += delta;
            }
        }
        forceUpdate();
    };

    const handleOpponentOwnGoal = () => {
        if (isFinished || !match) return;

        let currentMinute = matchDuration - Math.floor(time / 60);
        if (period === '2H') {
            currentMinute += matchDuration;
        }
        const myTeamIsLocal = match.localTeam === myTeamName;

        const newEvent: MatchEvent = {
            type: 'goal',
            minute: currentMinute,
            team: myTeamIsLocal ? 'local' : 'visitor',
            playerName: 'Gol en Propia Puerta',
        };
        eventsRef.current = [...eventsRef.current, newEvent];

        if (myTeamIsLocal) {
            localScoreRef.current += 1;
        } else {
            visitorScoreRef.current += 1;
        }

        toast({
            title: "¡Gol en propia puerta!",
            description: `Se ha añadido un gol a favor de ${myTeamName}.`,
        });
        forceUpdate();
    };
    
    const handleTimeout = (team: 'local' | 'opponent') => {
        if (isFinished) return;
        if (team === 'local') {
            localTimeoutTakenRef.current = true;
        } else {
            opponentTimeoutTakenRef.current = true;
        }
        forceUpdate();
    };

    const totals = Object.values(playerStatsRef.current).reduce((acc, player) => {
        (Object.keys(player) as Array<keyof PlayerStat>).forEach(key => {
            if (typeof player[key] === 'number') {
                acc[key] = (acc[key] || 0) + (player[key] as number);
            }
        });
        return acc;
    }, {} as Partial<Record<keyof PlayerStat, number>>);


    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isActive && time > 0) {
            interval = setInterval(() => {
                setTime((prevTime) => prevTime - 1);
                const currentMinuteUpdater = (prevStats: Record<string, PlayerStat>) => {
                    const newStats = {...prevStats};
                    selectedPlayerIds.forEach(id => {
                        if(newStats[id]) {
                            newStats[id] = { ...newStats[id], minutesPlayed: newStats[id].minutesPlayed + 1 }
                        }
                    });
                    return newStats;
                }
                playerStatsRef.current = currentMinuteUpdater(playerStatsRef.current);
            }, 1000);
        } else if (time === 0) {
            setIsActive(false);
        }
        return () => {
            if(interval) clearInterval(interval);
        };
    }, [isActive, time, selectedPlayerIds]);
    
    const toggleTimer = () => setIsActive(!isActive);

    const resetTimer = () => {
        setIsActive(false);
        setTime(matchDuration * 60);
    };
    
    const formatTime = (timeInSeconds: number) => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = timeInSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };
    
    const handleStatChange = (playerId: string, stat: keyof PlayerStat, delta: number) => {
        if (isFinished) return;
        
        const playerStat = playerStatsRef.current[playerId];
        if (!playerStat) return;
        
        const currentVal = playerStat[stat as keyof PlayerStat] as number;
        const newVal = Math.max(0, currentVal + delta);
        playerStat[stat as keyof PlayerStat] = newVal;

        if (stat === 'goals' && delta > 0) {
             let currentMinute = matchDuration - Math.floor(time / 60);
             if (period === '2H') {
                currentMinute += matchDuration;
             }
             const player = activePlayers.find(p => p.id === playerId);
             const myTeamIsLocal = match?.localTeam === myTeamName;
             const newEvent: MatchEvent = {
                type: 'goal',
                minute: currentMinute,
                team: myTeamIsLocal ? 'local' : 'visitor',
                playerName: player?.name || 'Desconocido',
                playerId: playerId,
             };
             eventsRef.current = [...eventsRef.current, newEvent];

             if (myTeamIsLocal) {
                localScoreRef.current += delta;
             } else {
                visitorScoreRef.current += delta;
             }
        }
        forceUpdate();
    };
    
    const handlePlayerSelection = (playerId: string) => {
        if (isFinished) return;
        const newIds = new Set(selectedPlayerIds);
        if (newIds.has(playerId)) {
            newIds.delete(playerId);
        } else {
            if (newIds.size >= 5) {
                 toast({
                    variant: "destructive",
                    title: "Límite alcanzado",
                    description: "Solo puedes seleccionar 5 jugadores a la vez.",
                });
                return;
            }
            newIds.add(playerId);
        }
        setSelectedPlayerIds(newIds);
    };
    
    const finishGame = async () => {
        setIsActive(false);
        setIsFinished(true); // Optimistically update UI
        try {
            await saveStats(false);
            await updateDoc(doc(db, "matches", matchId), { isFinished: true });
            toast({ title: "Partido Finalizado" });
        } catch (e) {
            console.error("Error finalizing game:", e);
            setIsFinished(false); // Revert on error
            toast({ variant: 'destructive', title: "Error", description: "No se pudo finalizar el partido."});
        }
    }

    const reopenGame = async () => {
        setIsFinished(false);
        try {
            await updateDoc(doc(db, "matches", matchId), { isFinished: false });
            toast({ title: "Partido Reabierto" });
        } catch (e) {
            console.error("Error reopening game:", e);
            setIsFinished(true);
            toast({ variant: 'destructive', title: "Error", description: "No se pudo reabrir el partido."});
        }
    }

    const isLoading = loadingMatch || loadingPlayers || loadingTeam;

    if (isLoading) {
        return <div className="container mx-auto px-4 py-8"><Loader2 className="animate-spin" /> Cargando datos del partido...</div>
    }

    if (errorMatch) {
        return <p className="text-destructive">Error: {errorMatch.message}</p>
    }
    
  return (
    <AuthGuard>
        <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold font-headline">Marcador y Estadísticas en Vivo</h1>
                    <p className="text-sm md:text-base text-muted-foreground">Gestiona el partido en tiempo real y pulsa Guardar para registrar los cambios.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" asChild className="flex-grow md:flex-grow-0">
                        <Link href="/partidos">
                            <ArrowLeft className="mr-2" />
                            Volver
                        </Link>
                    </Button>
                    <Button onClick={() => saveStats()} disabled={isSaving || isFinished || isAutoSaving} className="flex-grow md:flex-grow-0">
                        {isSaving ? <Loader2 className="mr-2 animate-spin"/> : (isAutoSaving ? <Loader2 className="mr-2 animate-spin"/> : <Save className="mr-2"/>)}
                        {isAutoSaving ? 'Autoguardando...' : (isSaving ? 'Guardando...' : 'Guardar')}
                    </Button>
                    {isFinished ? (
                        <Button variant="outline" onClick={reopenGame}><Unlock className="mr-2"/>Reabrir</Button>
                    ) : (
                        <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive"><Flag className="mr-2"/>Finalizar</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>¿Finalizar partido?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta acción detendrá el cronómetro y guardará el estado final del partido. No podrás volver a editarlo hasta que lo reabras.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={finishGame}>Sí, finalizar</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
            </div>

            <Card className="mb-8">
                <CardContent className="p-4 md:p-6">
                    <div className="grid grid-cols-3 items-center text-center gap-2">
                        <div className="flex flex-col items-center gap-3">
                            <h2 className="text-base md:text-2xl font-bold truncate">{match?.localTeam}</h2>
                            <div className="flex items-center gap-1 md:gap-2">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className={cn("w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-destructive", i < (match?.localTeam === myTeamName ? totals.fouls || 0 : opponentStatsRef.current.fouls) ? 'bg-destructive' : '')}></div>
                                ))}
                            </div>
                            <Button variant={localTimeoutTakenRef.current ? "default" : "outline"} className={cn("h-8 px-2 text-xs md:h-9 md:px-3 md:text-sm", {"bg-primary hover:bg-primary/90 text-primary-foreground": localTimeoutTakenRef.current})} size="sm" onClick={() => handleTimeout('local')} disabled={isFinished || localTimeoutTakenRef.current}>TM</Button>
                        </div>

                        <div className="flex flex-col items-center gap-2 md:gap-4">
                            <div className="text-4xl md:text-6xl font-bold text-primary">{localScoreRef.current} - {visitorScoreRef.current}</div>
                            <div className="text-3xl sm:text-4xl md:text-6xl font-bold bg-gray-900 text-white p-2 md:p-4 rounded-lg w-full">
                            {formatTime(time)}
                            </div>
                            <div className="flex flex-wrap justify-center gap-2">
                                <Button size="sm" onClick={toggleTimer} disabled={isFinished}>
                                    {isActive ? <><Pause className="mr-2"/>Pausar</> : <><Play className="mr-2"/>Iniciar</>}
                                </Button>
                                <Button size="sm" variant="outline" onClick={resetTimer} disabled={isFinished}><RefreshCw className="mr-2"/>Reiniciar</Button>
                            </div>
                            <div className="flex justify-center gap-2 mt-2">
                                <Button variant={period === '1H' ? 'secondary' : 'ghost'} size="sm" onClick={() => handlePeriodChange('1H')}>1ª Parte</Button>
                                <Button variant={period === '2H' ? 'secondary' : 'ghost'} size="sm" onClick={() => handlePeriodChange('2H')}>2ª Parte</Button>
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-3">
                            <h2 className="text-base md:text-2xl font-bold truncate">{match?.visitorTeam}</h2>
                            <div className="flex items-center gap-1 md:gap-2">
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className={cn("w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-destructive", i < (match?.visitorTeam === myTeamName ? totals.fouls || 0 : opponentStatsRef.current.fouls) ? 'bg-destructive' : '')}></div>
                                ))}
                            </div>
                            <Button variant={opponentTimeoutTakenRef.current ? "default" : "outline"} className={cn("h-8 px-2 text-xs md:h-9 md:px-3 md:text-sm", {"bg-primary hover:bg-primary/90 text-primary-foreground": opponentTimeoutTakenRef.current})} size="sm" onClick={() => handleTimeout('opponent')} disabled={isFinished || opponentTimeoutTakenRef.current}>TM</Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue={match?.localTeam === myTeamName ? "local" : "visitor"}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="local">{match?.localTeam}</TabsTrigger>
                    <TabsTrigger value="visitor">{match?.visitorTeam}</TabsTrigger>
                </TabsList>
                <TabsContent value="local">
                    <Card>
                        <CardHeader>
                            <CardTitle>{match?.localTeam} - Estadísticas {period}</CardTitle>
                        </CardHeader>
                        <CardContent>
                        {match?.localTeam === myTeamName ? (
                            <div className="overflow-x-auto">
                                <Table className="text-xs">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="sticky left-0 bg-card z-10 min-w-[150px] px-1 py-2 text-center">Jugador</TableHead>
                                            <TableHead className="px-1 py-2 text-center">Min</TableHead>
                                            {statHeaders.map(header => <TableHead key={header.key} className="px-1 py-2 text-center">{header.label}</TableHead>)}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {activePlayers.map((player) => (
                                            <TableRow 
                                                key={player.id} 
                                                onClick={() => handlePlayerSelection(player.id)}
                                                className={cn("cursor-pointer", {
                                                    'bg-teal-100/50 dark:bg-teal-900/30 hover:bg-teal-100/60 dark:hover:bg-teal-900/40': selectedPlayerIds.has(player.id)
                                                })}
                                            >
                                                <TableCell className={cn(
                                                    "sticky left-0 px-1 py-2 min-w-[150px] z-10", 
                                                    selectedPlayerIds.has(player.id) 
                                                        ? "bg-teal-100/50 dark:bg-teal-900/30 font-bold" 
                                                        : "bg-card font-medium"
                                                )}>{player.number}. {player.name}</TableCell>
                                                <TableCell className="px-1 py-2 text-center">{formatTime(playerStatsRef.current[player.id]?.minutesPlayed || 0)}</TableCell>
                                                {statHeaders.map(header => (
                                                    <TableCell key={header.key} className="px-1 py-2" onClick={(e) => e.stopPropagation()}>
                                                        <StatButton 
                                                            value={playerStatsRef.current[player.id]?.[header.key as keyof PlayerStat] as number || 0} 
                                                            onIncrement={() => handleStatChange(player.id, header.key as keyof PlayerStat, 1)} 
                                                            onDecrement={() => handleStatChange(player.id, header.key as keyof PlayerStat, -1)} 
                                                            disabled={isFinished} 
                                                        />
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                    <TableFooter>
                                        <TableRow>
                                            <TableHead className="sticky left-0 bg-card z-10 min-w-[150px] px-1 py-2 text-center">Jugador</TableHead>
                                            <TableHead className="px-1 py-2 text-center">Min</TableHead>
                                            {statHeaders.map(header => <TableHead key={header.key} className="px-1 py-2 text-center">{header.label}</TableHead>)}
                                        </TableRow>
                                        <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
                                            <TableCell className="sticky left-0 bg-muted/50 px-1 py-2 min-w-[150px] text-center z-10">Total</TableCell>
                                            <TableCell className="px-1 py-2 text-center">-</TableCell>
                                            {statHeaders.map(header => (
                                                <TableCell key={header.key} className="px-1 py-2 text-center">
                                                    {totals[header.key as keyof PlayerStat] || 0}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableFooter>
                                </Table>
                            </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <OpponentStatCounters title="Goles" value={opponentStatsRef.current.goals} onIncrement={() => handleOpponentStatChange('goals', 1)} onDecrement={() => handleOpponentStatChange('goals', -1)} icon={<Goal className="text-muted-foreground" />} disabled={isFinished}/>
                                        <OpponentStatCounters title="Tiros a Puerta" value={opponentStatsRef.current.shotsOnTarget} onIncrement={() => handleOpponentStatChange('shotsOnTarget', 1)} onDecrement={() => handleOpponentStatChange('shotsOnTarget', -1)} icon={<Target className="text-muted-foreground" />} disabled={isFinished}/>
                                        <OpponentStatCounters title="Tiros Fuera" value={opponentStatsRef.current.shotsOffTarget} onIncrement={() => handleOpponentStatChange('shotsOffTarget', 1)} onDecrement={() => handleOpponentStatChange('shotsOffTarget', -1)} icon={<XCircle className="text-muted-foreground" />} disabled={isFinished}/>
                                        <OpponentStatCounters title="Faltas" value={opponentStatsRef.current.fouls} onIncrement={() => handleOpponentStatChange('fouls', 1)} onDecrement={() => handleOpponentStatChange('fouls', -1)} icon={<ShieldAlert className="text-muted-foreground" />} disabled={isFinished}/>
                                        <OpponentStatCounters title="Recuperaciones" value={opponentStatsRef.current.recoveries} onIncrement={() => handleOpponentStatChange('recoveries', 1)} onDecrement={() => handleOpponentStatChange('recoveries', -1)} icon={<RefreshCw className="text-muted-foreground" />} disabled={isFinished}/>
                                        <OpponentStatCounters title="Pérdidas" value={opponentStatsRef.current.turnovers} onIncrement={() => handleOpponentStatChange('turnovers', 1)} onDecrement={() => handleOpponentStatChange('turnovers', -1)} icon={<ArrowRightLeft className="text-muted-foreground" />} disabled={isFinished}/>
                                    </div>
                                    <div className="pt-4">
                                        <Button onClick={handleOpponentOwnGoal} disabled={isFinished} className="w-full md:w-auto">
                                            <Plus className="mr-2" />
                                            Añadir Gol en Propia
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="pt-4">
                            <div className="text-xs text-muted-foreground grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-1">
                                {legendItems.map(item => (
                                    <div key={item.abbr}>
                                        <span className="font-semibold">{item.abbr}:</span> {item.full}
                                    </div>
                                ))}
                            </div>
                        </CardFooter>
                    </Card>
                </TabsContent>
                <TabsContent value="visitor">
                    <Card>
                        <CardHeader>
                            <CardTitle>{match?.visitorTeam} - Estadísticas {period}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {match?.visitorTeam === myTeamName ? (
                                <div className="overflow-x-auto">
                                    <Table className="text-xs">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="sticky left-0 bg-card z-10 min-w-[150px] px-1 py-2 text-center">Jugador</TableHead>
                                                <TableHead className="px-1 py-2 text-center">Min</TableHead>
                                                {statHeaders.map(header => <TableHead key={header.key} className="px-1 py-2 text-center">{header.label}</TableHead>)}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {activePlayers.map((player) => (
                                                <TableRow 
                                                    key={player.id} 
                                                    onClick={() => handlePlayerSelection(player.id)}
                                                    className={cn("cursor-pointer", {
                                                        'bg-teal-100/50 dark:bg-teal-900/30 hover:bg-teal-100/60 dark:hover:bg-teal-900/40': selectedPlayerIds.has(player.id)
                                                    })}
                                                >
                                                    <TableCell className={cn(
                                                        "sticky left-0 px-1 py-2 min-w-[150px] z-10", 
                                                        selectedPlayerIds.has(player.id) 
                                                            ? "bg-teal-100/50 dark:bg-teal-900/30 font-bold" 
                                                            : "bg-card font-medium"
                                                    )}>{player.number}. {player.name}</TableCell>
                                                    <TableCell className="px-1 py-2 text-center">{formatTime(playerStatsRef.current[player.id]?.minutesPlayed || 0)}</TableCell>
                                                    {statHeaders.map(header => (
                                                        <TableCell key={header.key} className="px-1 py-2" onClick={(e) => e.stopPropagation()}>
                                                            <StatButton 
                                                                value={playerStatsRef.current[player.id]?.[header.key as keyof PlayerStat] as number || 0} 
                                                                onIncrement={() => handleStatChange(player.id, header.key as keyof PlayerStat, 1)} 
                                                                onDecrement={() => handleStatChange(player.id, header.key as keyof PlayerStat, -1)} 
                                                                disabled={isFinished} 
                                                            />
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                        <TableFooter>
                                            <TableRow>
                                                <TableHead className="sticky left-0 bg-card z-10 min-w-[150px] px-1 py-2 text-center">Jugador</TableHead>
                                                <TableHead className="px-1 py-2 text-center">Min</TableHead>
                                                {statHeaders.map(header => <TableHead key={header.key} className="px-1 py-2 text-center">{header.label}</TableHead>)}
                                            </TableRow>
                                            <TableRow className="font-bold bg-muted/50 hover:bg-muted/50">
                                                <TableCell className="sticky left-0 bg-muted/50 px-1 py-2 min-w-[150px] text-center z-10">Total</TableCell>
                                                <TableCell className="px-1 py-2 text-center">-</TableCell>
                                                {statHeaders.map(header => (
                                                    <TableCell key={header.key} className="px-1 py-2 text-center">
                                                        {totals[header.key as keyof PlayerStat] || 0}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        </TableFooter>
                                    </Table>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <OpponentStatCounters title="Goles" value={opponentStatsRef.current.goals} onIncrement={() => handleOpponentStatChange('goals', 1)} onDecrement={() => handleOpponentStatChange('goals', -1)} icon={<Goal className="text-muted-foreground" />} disabled={isFinished}/>
                                        <OpponentStatCounters title="Tiros a Puerta" value={opponentStatsRef.current.shotsOnTarget} onIncrement={() => handleOpponentStatChange('shotsOnTarget', 1)} onDecrement={() => handleOpponentStatChange('shotsOnTarget', -1)} icon={<Target className="text-muted-foreground" />} disabled={isFinished}/>
                                        <OpponentStatCounters title="Tiros Fuera" value={opponentStatsRef.current.shotsOffTarget} onIncrement={() => handleOpponentStatChange('shotsOffTarget', 1)} onDecrement={() => handleOpponentStatChange('shotsOffTarget', -1)} icon={<XCircle className="text-muted-foreground" />} disabled={isFinished}/>
                                        <OpponentStatCounters title="Faltas" value={opponentStatsRef.current.fouls} onIncrement={() => handleOpponentStatChange('fouls', 1)} onDecrement={() => handleOpponentStatChange('fouls', -1)} icon={<ShieldAlert className="text-muted-foreground" />} disabled={isFinished}/>
                                        <OpponentStatCounters title="Recuperaciones" value={opponentStatsRef.current.recoveries} onIncrement={() => handleOpponentStatChange('recoveries', 1)} onDecrement={() => handleOpponentStatChange('recoveries', -1)} icon={<RefreshCw className="text-muted-foreground" />} disabled={isFinished}/>
                                        <OpponentStatCounters title="Pérdidas" value={opponentStatsRef.current.turnovers} onIncrement={() => handleOpponentStatChange('turnovers', 1)} onDecrement={() => handleOpponentStatChange('turnovers', -1)} icon={<ArrowRightLeft className="text-muted-foreground" />} disabled={isFinished}/>
                                    </div>
                                    <div className="pt-4">
                                        <Button onClick={handleOpponentOwnGoal} disabled={isFinished} className="w-full md:w-auto">
                                            <Plus className="mr-2" />
                                            Añadir Gol en Propia
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="pt-4">
                            <div className="text-xs text-muted-foreground grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-1">
                                {legendItems.map(item => (
                                    <div key={item.abbr}>
                                        <span className="font-semibold">{item.abbr}:</span> {item.full}
                                    </div>
                                ))}
                            </div>
                        </CardFooter>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    </AuthGuard>
  );
}
