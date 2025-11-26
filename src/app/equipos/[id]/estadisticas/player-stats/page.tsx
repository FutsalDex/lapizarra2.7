
"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Search, Trophy, Hand, Target, ChevronsRightLeft, RefreshCw, ShieldAlert, Clock, Goal, Shield, GanttChartSquare } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCollection, useDocumentData } from 'react-firebase-hooks/firestore';
import { collection, query, where, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";


type Player = {
  id: string;
  name: string;
  number: string;
  position: string;
};

type Match = {
    id: string;
    isFinished: boolean;
    teamId: string;
    matchType: string;
    playerStats?: {
        '1H'?: Record<string, any>;
        '2H'?: Record<string, any>;
    };
};

type AggregatedStats = {
    [key: string]: {
        name: string;
        goals: number;
        assists: number;
        shotsOnTarget: number;
        shotsOffTarget: number;
        recoveries: number;
        turnovers: number;
        fouls: number;
        yellowCards: number;
        redCards: number;
        saves: number;
        unoVsUno: number;
        goalsConceded: number;
        minutesPlayed: number;
        matchesPlayed: number;
    }
};

const StatCard = ({ title, playerName, value, icon }: { title: string; playerName?: string; value: string | number; icon: React.ReactNode }) => (
    <Card>
        <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className='flex items-center gap-2'>
                 {icon}
                <span className="text-sm text-muted-foreground">{title}</span>
            </div>
            <div>
                <p className="font-bold text-lg mt-1 truncate">{playerName || '-'}</p>
                <p className="text-3xl font-bold self-end text-right">{value}</p>
            </div>
        </CardContent>
    </Card>
);

const SquareIcon = ({ className }: { className?: string }) => (
    <div className={cn("w-3 h-4 rounded-sm", className)} />
);


const legendItems = [
    { abbr: "PJ", full: "Partidos Jugados" },
    { abbr: "Min.", full: "Minutos Jugados" },
    { abbr: "G", full: "Goles" }, { abbr: "A", full: "Asistencias" }, { abbr: "TA", full: "Tarjetas Amarillas" },
    { abbr: "TR", full: "Tarjetas Rojas" }, { abbr: "F", full: "Faltas Cometidas" },
    { abbr: "T.P.", full: "Tiros a Puerta" }, { abbr: "T.F.", full: "Tiros Fuera" }, { abbr: "REC", full: "Recuperaciones" },
    { abbr: "PER", full: "Pérdidas" }, { abbr: "PAR", full: "Paradas (Portero)" }, { abbr: "GC", full: "Goles Recibidos (Portero)" },
    { abbr: "1vs1", full: "Uno contra Uno (Portero)" },
];


export default function PlayerStatsPage() {
    const params = useParams();
    const teamId = params.id as string;
    const [filter, setFilter] = useState('Todos');
    const [searchTerm, setSearchTerm] = useState('');

    const [team, loadingTeam] = useDocumentData(doc(db, `teams/${teamId}`));
    const [playersSnapshot, loadingPlayers] = useCollection(collection(db, `teams/${teamId}/players`));
    const matchesQuery = teamId ? query(collection(db, "matches"), where("teamId", "==", teamId), where("isFinished", "==", true)) : null;
    const [matchesSnapshot, loadingMatches] = useCollection(matchesQuery);

    const playersMap = useMemo(() => {
        if (!playersSnapshot) return new Map<string, Player>();
        return new Map(playersSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() } as Player]));
    }, [playersSnapshot]);

    const matches = useMemo(() => 
        matchesSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match)) || [],
    [matchesSnapshot]);

    const filteredMatches = useMemo(() => {
        if (filter === 'Todos') {
            return matches;
        }
        return matches.filter(match => match.matchType === filter);
    }, [matches, filter]);
    
    const formatTime = (totalSeconds: number) => {
        if (isNaN(totalSeconds) || totalSeconds < 0) return '00:00';
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    const playerStats: AggregatedStats = useMemo(() => {
        const stats: AggregatedStats = {};

        playersMap.forEach((player, playerId) => {
            stats[playerId] = {
                name: player.name,
                goals: 0, assists: 0, shotsOnTarget: 0, shotsOffTarget: 0,
                recoveries: 0, turnovers: 0, fouls: 0, yellowCards: 0, redCards: 0,
                saves: 0, unoVsUno: 0, goalsConceded: 0, minutesPlayed: 0, matchesPlayed: 0
            };
        });

        filteredMatches.forEach(match => {
            const playerIdsInMatch = new Set<string>();
            ['1H', '2H'].forEach(period => {
                const periodStats = match.playerStats?.[period as '1H' | '2H'];
                if (periodStats) {
                    for (const playerId in periodStats) {
                         if (stats[playerId]) {
                            const pStats = periodStats[playerId];
                            stats[playerId].goals += pStats.goals || 0;
                            stats[playerId].assists += pStats.assists || 0;
                            stats[playerId].shotsOnTarget += pStats.shotsOnTarget || 0;
                            stats[playerId].shotsOffTarget += pStats.shotsOffTarget || 0;
                            stats[playerId].recoveries += pStats.recoveries || 0;
                            stats[playerId].turnovers += pStats.turnovers || 0;
                            stats[playerId].fouls += pStats.fouls || 0;
                            stats[playerId].yellowCards += pStats.yellowCards || 0;
                            stats[playerId].redCards += pStats.redCards || 0;
                            stats[playerId].saves += pStats.saves || 0;
                            stats[playerId].unoVsUno += pStats.unoVsUno || 0;
                            stats[playerId].goalsConceded += pStats.goalsConceded || 0;
                            stats[playerId].minutesPlayed += pStats.minutesPlayed || 0;
                            
                            if(pStats.minutesPlayed > 0) {
                                playerIdsInMatch.add(playerId);
                            }
                        }
                    }
                }
            });
            playerIdsInMatch.forEach(id => {
                if(stats[id]) stats[id].matchesPlayed += 1;
            })
        });
        return stats;
    }, [filteredMatches, playersMap]);

    const searchFilteredPlayerIds = useMemo(() => {
        if (!searchTerm) return new Set(Object.keys(playerStats));
        const lowercasedTerm = searchTerm.toLowerCase();
        return new Set(Object.keys(playerStats).filter(id => playerStats[id].name.toLowerCase().includes(lowercasedTerm)));
    }, [searchTerm, playerStats]);


    const getTopPlayer = (stat: keyof AggregatedStats[string], mode: 'max' | 'min' = 'max', position?: 'Portero', excludePosition?: 'Portero') => {
        let leader = { name: '-', value: mode === 'max' ? -1 : Infinity };
        let foundPlayer = false;

        for (const playerId of Array.from(searchFilteredPlayerIds)) {
            const player = playersMap.get(playerId);
            if (!player) continue;

            const isPositionMatch = !position || player.position === position;
            const isExcludedPosition = excludePosition && player.position === excludePosition;

            if (!isPositionMatch || isExcludedPosition) continue;

            const statValue = playerStats[playerId][stat];
            if (typeof statValue !== 'number') continue;

            let isNewLeader = false;
            if (mode === 'max' && statValue > leader.value) {
                isNewLeader = true;
            } else if (mode === 'min' && statValue < leader.value && statValue > 0) { // For min, ensure it's not zero unless that's the only option
                isNewLeader = true;
            } else if (mode === 'min' && leader.value === Infinity && statValue >= 0) { // If we haven't found any player yet, take first non-negative
                isNewLeader = true;
            }

            if (isNewLeader) {
                leader = { name: playerStats[playerId].name, value: statValue };
                foundPlayer = true;
            }
        }
        
        if(mode === 'min' && leader.value === Infinity) {
             for (const playerId of Array.from(searchFilteredPlayerIds)) {
                const player = playersMap.get(playerId);
                if (!player) continue;
                 const isPositionMatch = !position || player.position === position;
                 const isExcludedPosition = excludePosition && player.position === excludePosition;
                 
                 if (!isPositionMatch || isExcludedPosition) continue;

                leader = { name: player.name, value: 0 };
                break;
            }
        }

        return leader;
    };

    const leaders = useMemo(() => {
        if (loadingTeam || loadingMatches) {
            return {}; // Return empty object while loading
        }
        return {
            topScorer: getTopPlayer('goals'),
            topAssistant: getTopPlayer('assists'),
            mostShotsOn: getTopPlayer('shotsOnTarget'),
            mostShotsOff: getTopPlayer('shotsOffTarget'),
            mostRecoveries: getTopPlayer('recoveries'),
            mostTurnovers: getTopPlayer('turnovers'),
            mostFouls: getTopPlayer('fouls'),
            mostYellows: getTopPlayer('yellowCards'),
            mostSaves: getTopPlayer('saves', 'max', 'Portero'),
            bestUnoVsUno: getTopPlayer('unoVsUno', 'max', 'Portero'),
            leastConceded: getTopPlayer('goalsConceded', 'min', 'Portero'),
            mostConceded: getTopPlayer('goalsConceded', 'max', 'Portero'),
            mostMinutes: getTopPlayer('minutesPlayed', 'max', undefined, 'Portero'),
            leastMinutes: getTopPlayer('minutesPlayed', 'min', undefined, 'Portero'),
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadingTeam, loadingMatches, playerStats, searchFilteredPlayerIds, playersMap]);

    
    const tablePlayers = useMemo(() => {
        return Array.from(playersMap.values())
            .filter(player => searchFilteredPlayerIds.has(player.id))
            .sort((a, b) => {
                const statsA = playerStats[a.id];
                const statsB = playerStats[b.id];
                const minutesA = statsA?.minutesPlayed || 0;
                const minutesB = statsB?.minutesPlayed || 0;
                return minutesB - minutesA; // Sort descending
            });
    }, [playersMap, searchFilteredPlayerIds, playerStats]);

    const tableTotals = useMemo(() => {
        return tablePlayers.reduce((acc, player) => {
            const stats = playerStats[player.id];
            if (stats) {
                acc.matchesPlayed += stats.matchesPlayed;
                acc.minutesPlayed += stats.minutesPlayed;
                acc.goals += stats.goals;
                acc.assists += stats.assists;
                acc.yellowCards += stats.yellowCards;
                acc.redCards += stats.redCards;
                acc.fouls += stats.fouls;
                acc.shotsOnTarget += stats.shotsOnTarget;
                acc.shotsOffTarget += stats.shotsOffTarget;
                acc.recoveries += stats.recoveries;
                acc.turnovers += stats.turnovers;
                acc.saves += stats.saves;
                acc.goalsConceded += stats.goalsConceded;
                acc.unoVsUno += stats.unoVsUno;
            }
            return acc;
        }, {
            matchesPlayed: 0, minutesPlayed: 0, goals: 0, assists: 0,
            yellowCards: 0, redCards: 0, fouls: 0, shotsOnTarget: 0,
            shotsOffTarget: 0, recoveries: 0, turnovers: 0, saves: 0, goalsConceded: 0, unoVsUno: 0,
        });
    }, [tablePlayers, playerStats]);


    const isLoading = loadingTeam || loadingPlayers || loadingMatches;

    const filterOptions = ['Todos', 'Liga', 'Copa', 'Torneo', 'Amistoso'];

    return (
        <div className="container mx-auto px-4 py-8 space-y-8">
            <div className="flex justify-between items-center">
                <div>
                     <div className="flex items-center gap-3 mb-2">
                        <Users className="w-8 h-8 text-primary" />
                        <h1 className="text-3xl font-bold font-headline">Estadísticas de Jugadores</h1>
                    </div>
                    <p className="text-muted-foreground">Rendimiento individual de los jugadores de {team?.name || '...'}.</p>
                </div>
                <Button variant="outline" asChild>
                    <Link href={`/equipos/${teamId}/estadisticas`}>
                        <ArrowLeft className="mr-2" />
                        Volver
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Controles</CardTitle>
                    <p className="text-sm text-muted-foreground">Filtra por competición y busca jugadores.</p>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative flex-grow w-full sm:w-auto">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input 
                                placeholder="Buscar jugador..." 
                                className="pl-10" 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            {filterOptions.map(option => (
                                <Button 
                                    key={option}
                                    variant={filter === option ? 'default' : 'outline'}
                                    onClick={() => setFilter(option)}
                                    size="sm"
                                >
                                    {option}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {isLoading || !leaders.topScorer ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Array.from({ length: 14 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
                </div>
            ) : (
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard title="Máximo Goleador" playerName={leaders.topScorer.value > 0 ? leaders.topScorer.name : '-'} value={leaders.topScorer.value} icon={<Trophy className="text-primary"/>} />
                    <StatCard title="Máximo Asistente" playerName={leaders.topAssistant.value > 0 ? leaders.topAssistant.name : '-'} value={leaders.topAssistant.value} icon={<Hand className="text-primary"/>} />
                    <StatCard title="Más Tiros a Puerta" playerName={leaders.mostShotsOn.value > 0 ? leaders.mostShotsOn.name : '-'} value={leaders.mostShotsOn.value} icon={<Target className="text-primary"/>} />
                    <StatCard title="Más Tiros Fuera" playerName={leaders.mostShotsOff.value > 0 ? leaders.mostShotsOff.name : '-'} value={leaders.mostShotsOff.value} icon={<Goal className="text-primary"/>} />
                    <StatCard title="Más Recuperaciones" playerName={leaders.mostRecoveries.value > 0 ? leaders.mostRecoveries.name : '-'} value={leaders.mostRecoveries.value} icon={<RefreshCw className="text-primary"/>} />
                    <StatCard title="Más Pérdidas" playerName={leaders.mostTurnovers.value > 0 ? leaders.mostTurnovers.name : '-'} value={leaders.mostTurnovers.value} icon={<ChevronsRightLeft className="text-primary"/>} />
                    <StatCard title="Más Faltas" playerName={leaders.mostFouls.value > 0 ? leaders.mostFouls.name : '-'} value={leaders.mostFouls.value} icon={<ShieldAlert className="text-orange-500"/>} />
                    <StatCard title="Más T. Amarillas" playerName={leaders.mostYellows.value > 0 ? leaders.mostYellows.name : '-'} value={leaders.mostYellows.value} icon={<SquareIcon className="bg-yellow-400" />} />
                    <StatCard title="Portero con más Paradas" playerName={leaders.mostSaves.value > 0 ? leaders.mostSaves.name : '-'} value={leaders.mostSaves.value} icon={<Shield className="text-primary"/>} />
                    <StatCard title="Portero mejor en 1vs1" playerName={leaders.bestUnoVsUno.value > 0 ? leaders.bestUnoVsUno.name : '-'} value={leaders.bestUnoVsUno.value} icon={<Target className="text-primary"/>} />
                    <StatCard title="Portero Menos Goleado" playerName={leaders.leastConceded.value > 0 ? leaders.leastConceded.name : '-'} value={leaders.leastConceded.value} icon={<Shield className="text-primary"/>} />
                    <StatCard title="Portero Más Goleado" playerName={leaders.mostConceded.value > 0 ? leaders.mostConceded.name : '-'} value={leaders.mostConceded.value} icon={<Shield className="text-primary"/>} />
                    <StatCard title="Jugador con más minutos" playerName={leaders.mostMinutes.value > 0 ? leaders.mostMinutes.name : '-'} value={formatTime(leaders.mostMinutes.value as number)} icon={<Clock className="text-primary"/>} />
                    <StatCard title="Jugador con menos minutos" playerName={leaders.leastMinutes.value > 0 ? leaders.leastMinutes.name : '-'} value={formatTime(leaders.leastMinutes.value as number)} icon={<Clock className="text-primary"/>} />
                </div>
            )}
            
            <Card>
                <CardHeader>
                    <CardTitle>Tabla General de Jugadores</CardTitle>
                </CardHeader>
                <CardContent>
                     {isLoading ? <Skeleton className="h-64 w-full" /> : (
                         <div className="overflow-x-auto">
                             <Table>
                                 <TableHeader>
                                     <TableRow>
                                         <TableHead>Dorsal</TableHead>
                                         <TableHead>Nombre</TableHead>
                                         <TableHead className="text-center">Min.</TableHead>
                                         <TableHead className="text-center">PJ</TableHead>
                                         <TableHead className="text-center">G</TableHead>
                                         <TableHead className="text-center">A</TableHead>
                                         <TableHead className="text-center">T.P.</TableHead>
                                         <TableHead className="text-center">T.F.</TableHead>
                                         <TableHead className="text-center">REC</TableHead>
                                         <TableHead className="text-center">PER</TableHead>
                                         <TableHead className="text-center">F</TableHead>
                                         <TableHead className="text-center">TA</TableHead>
                                         <TableHead className="text-center">TR</TableHead>
                                         <TableHead className="text-center">PAR</TableHead>
                                         <TableHead className="text-center">GC</TableHead>
                                         <TableHead className="text-center">1vs1</TableHead>
                                     </TableRow>
                                 </TableHeader>
                                 <TableBody>
                                     {tablePlayers.map(player => {
                                         const stats = playerStats[player.id];
                                         return (
                                             <TableRow key={player.id}>
                                                 <TableCell className="font-medium">{player.number}</TableCell>
                                                 <TableCell>{player.name}</TableCell>
                                                 <TableCell className="text-center">{formatTime(stats?.minutesPlayed || 0)}</TableCell>
                                                 <TableCell className="text-center">{stats?.matchesPlayed || 0}</TableCell>
                                                 <TableCell className="text-center">{stats?.goals || 0}</TableCell>
                                                 <TableCell className="text-center">{stats?.assists || 0}</TableCell>
                                                 <TableCell className="text-center">{stats?.shotsOnTarget || 0}</TableCell>
                                                 <TableCell className="text-center">{stats?.shotsOffTarget || 0}</TableCell>
                                                 <TableCell className="text-center">{stats?.recoveries || 0}</TableCell>
                                                 <TableCell className="text-center">{stats?.turnovers || 0}</TableCell>
                                                 <TableCell className="text-center">{stats?.fouls || 0}</TableCell>
                                                 <TableCell className="text-center">{stats?.yellowCards || 0}</TableCell>
                                                 <TableCell className="text-center">{stats?.redCards || 0}</TableCell>
                                                 <TableCell className="text-center">{stats?.saves || 0}</TableCell>
                                                 <TableCell className="text-center">{stats?.goalsConceded || 0}</TableCell>
                                                 <TableCell className="text-center">{stats?.unoVsUno || 0}</TableCell>
                                             </TableRow>
                                         )
                                     })}
                                 </TableBody>
                                 <TableFooter>
                                     <TableRow className="font-bold bg-muted/50">
                                         <TableCell colSpan={2}>Total Equipo</TableCell>
                                         <TableCell className="text-center">{formatTime(tableTotals.minutesPlayed)}</TableCell>
                                         <TableCell className="text-center">{/* PJ no se suma */}</TableCell>
                                         <TableCell className="text-center">{tableTotals.goals}</TableCell>
                                         <TableCell className="text-center">{tableTotals.assists}</TableCell>
                                         <TableCell className="text-center">{tableTotals.shotsOnTarget}</TableCell>
                                         <TableCell className="text-center">{tableTotals.shotsOffTarget}</TableCell>
                                         <TableCell className="text-center">{tableTotals.recoveries}</TableCell>
                                         <TableCell className="text-center">{tableTotals.turnovers}</TableCell>
                                         <TableCell className="text-center">{tableTotals.fouls}</TableCell>
                                         <TableCell className="text-center">{tableTotals.yellowCards}</TableCell>
                                         <TableCell className="text-center">{tableTotals.redCards}</TableCell>
                                         <TableCell className="text-center">{tableTotals.saves}</TableCell>
                                         <TableCell className="text-center">{tableTotals.goalsConceded}</TableCell>
                                         <TableCell className="text-center">{tableTotals.unoVsUno}</TableCell>
                                     </TableRow>
                                 </TableFooter>
                             </Table>
                         </div>
                     )}
                </CardContent>
                <CardFooter className="pt-4">
                     <div className="text-xs text-muted-foreground grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-1">
                        {legendItems.map(item => (
                            <div key={item.abbr}>
                                <span className="font-semibold">{item.abbr}:</span> {item.full}
                            </div>
                        ))}
                    </div>
                </CardFooter>
            </Card>

        </div>
    );
}
