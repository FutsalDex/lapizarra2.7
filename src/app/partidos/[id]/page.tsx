
"use client";

import { useParams } from 'next/navigation';
import { useDocumentData, useCollection } from 'react-firebase-hooks/firestore';
import { doc, Timestamp, getFirestore, collection } from 'firebase/firestore';
import app from '@/firebase/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { ArrowLeft, BarChart, History, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';

const db = getFirestore(app);

const StatRow = ({ label, localValue, visitorValue }: { label: string; localValue: number; visitorValue: number; }) => (
    <div className="flex justify-between items-center py-2 border-b last:border-none">
        <span className="font-bold text-lg">{localValue}</span>
        <span className="text-sm text-muted-foreground text-center">{label}</span>
        <span className="font-bold text-lg">{visitorValue}</span>
    </div>
);

type Player = {
    id: string;
    name: string;
    number: string;
}

type PlayerStat = {
  g: number; a: number; ta: number; tr: number; fouls: number; 
  paradas: number; gc: number; vs1: number; minutesPlayed: number; name?: string; id?:string; number?: string;
};

export default function PartidoDetallePage() {
  const params = useParams();
  const matchId = params.id as string;
  
  const [match, loading, error] = useDocumentData(doc(db, 'matches', matchId));
  
  const teamId = match?.teamId;
  const [team, loadingTeam] = useDocumentData(teamId ? doc(db, 'teams', teamId) : null);
  const myTeamName = useMemo(() => team?.name || "Mi Equipo", [team]);

  const [playersSnapshot, loadingPlayers, errorPlayers] = useCollection(teamId ? collection(db, 'teams', teamId, 'players') : null);
  const teamPlayers = useMemo(() => {
    if (!playersSnapshot) return [];
    return playersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
  }, [playersSnapshot]);


  const { teamStats, finalPlayerStats } = useMemo(() => {
    if (!match || !myTeamName || !teamPlayers) {
        return { teamStats: { local: {}, visitor: {} }, finalPlayerStats: [] };
    }

    const isMyTeamLocal = match.localTeam === myTeamName;
    
    const calculateTotalTeamStats = (periodStats: any) => {
        let stats: any = { tirosPuerta: 0, tirosFuera: 0, faltas: 0, recuperaciones: 0, perdidas: 0, amarillas: 0, rojas: 0 };
        if (periodStats) {
            Object.values(periodStats).forEach((player: any) => {
                stats.tirosPuerta += player.shotsOnTarget || 0;
                stats.tirosFuera += player.shotsOffTarget || 0;
                stats.faltas += player.fouls || 0;
                stats.recuperaciones += player.recoveries || 0;
                stats.perdidas += player.turnovers || 0;
                stats.amarillas += player.yellowCards || 0;
                stats.rojas += player.redCards || 0;
            });
        }
        return stats;
    };
    
    const myTeam1H = calculateTotalTeamStats(match.playerStats?.['1H']);
    const myTeam2H = calculateTotalTeamStats(match.playerStats?.['2H']);
    const opp1H = match.opponentStats?.['1H'] || {};
    const opp2H = match.opponentStats?.['2H'] || {};
    
    const myTeamStats = {
        tirosPuerta: myTeam1H.tirosPuerta + myTeam2H.tirosPuerta,
        tirosFuera: myTeam1H.tirosFuera + myTeam2H.tirosFuera,
        faltas: myTeam1H.faltas + myTeam2H.faltas,
        recuperaciones: myTeam1H.recuperaciones + myTeam2H.recuperaciones,
        perdidas: myTeam1H.perdidas + myTeam2H.perdidas,
    };
    const opponentTeamStats = {
        tirosPuerta: (opp1H.shotsOnTarget || 0) + (opp2H.shotsOnTarget || 0),
        tirosFuera: (opp1H.shotsOffTarget || 0) + (opp2H.shotsOffTarget || 0),
        faltas: (opp1H.fouls || 0) + (opp2H.fouls || 0),
        recuperaciones: (opp1H.recoveries || 0) + (opp2H.recoveries || 0),
        perdidas: (opp1H.turnovers || 0) + (opp2H.turnovers || 0),
    };

    const combinedPlayerStats = () => {
        const combined: Record<string, Partial<PlayerStat>> = {};
        if (match.playerStats) {
            ['1H', '2H'].forEach(period => {
                if (match.playerStats[period]) {
                     Object.entries(match.playerStats[period]).forEach(([playerId, stats]: [string, any]) => {
                        if (!combined[playerId]) {
                             const playerInfo = teamPlayers.find(p => p.id === playerId);
                             combined[playerId] = { 
                                id: playerId, 
                                name: playerInfo?.name || 'Desconocido',
                                number: playerInfo?.number || '?',
                                minutesPlayed: 0, g: 0, a: 0, ta: 0, tr: 0, fouls: 0, paradas: 0, gc: 0, vs1: 0 
                            };
                        }
                        if (combined[playerId]) {
                            combined[playerId].minutesPlayed! += stats.minutesPlayed || 0;
                            combined[playerId].g! += stats.goals || 0;
                            combined[playerId].a! += stats.assists || 0;
                            combined[playerId].ta! += stats.yellowCards || 0;
                            combined[playerId].tr! += stats.redCards || 0;
                            combined[playerId].fouls! += stats.fouls || 0;
                            combined[playerId].paradas! += stats.saves || 0;
                            combined[playerId].gc! += stats.goalsConceded || 0;
                            combined[playerId].vs1! += stats.unoVsUno || 0;
                        }
                    });
                }
            });
        }
        return Object.values(combined);
    };

    return { 
        teamStats: {
            local: isMyTeamLocal ? myTeamStats : opponentTeamStats,
            visitor: isMyTeamLocal ? opponentTeamStats : myTeamStats
        },
        finalPlayerStats: combinedPlayerStats()
    };
  }, [match, myTeamName, teamPlayers]);
  
  if (loading || loadingTeam || loadingPlayers) {
    return (
        <div className="container mx-auto px-4 py-8">
            <Skeleton className="h-10 w-48 mb-6" />
            <Skeleton className="h-32 w-full mb-8" />
            <Skeleton className="h-96 w-full" />
        </div>
    );
  }

  if (error || !match) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold">Partido no encontrado</h1>
        <p className="text-muted-foreground">{error?.message}</p>
        <Link href="/partidos">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Partidos
          </Button>
        </Link>
      </div>
    );
  }

  const {
    localTeam, visitorTeam, date, competition, localScore, visitorScore,
    events = []
  } = match;
  
  const matchDate = (date as Timestamp)?.toDate ? (date as Timestamp).toDate() : new Date(date);
  
  const totals = finalPlayerStats.reduce((acc, player) => {
        acc.g += player.g || 0;
        acc.a += player.a || 0;
        acc.ta += player.ta || 0;
        acc.tr += player.tr || 0;
        acc.fouls += player.fouls || 0;
        acc.paradas += player.paradas || 0;
        acc.gc += player.gc || 0;
        acc.vs1 += player.vs1 || 0;
        acc.totalSeconds += player.minutesPlayed || 0;
        return acc;
    }, { g: 0, a: 0, ta: 0, tr: 0, fouls: 0, paradas: 0, gc: 0, vs1: 0, totalSeconds: 0 });

    const totalMinutes = Math.floor(totals.totalSeconds / 60);
    const totalSecondsRemaining = totals.totalSeconds % 60;
    const totalTimeFormatted = `${totalMinutes}:${String(totalSecondsRemaining).padStart(2, '0')}`;
    
    const formatTime = (timeInSeconds: number) => {
        if (isNaN(timeInSeconds)) return '00:00';
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = timeInSeconds % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };
    
    const displayLocalTeam = localTeam;
    const displayVisitorTeam = visitorTeam;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
            <div className="bg-muted p-3 rounded-full hidden sm:flex">
                <History className="w-6 h-6 text-primary" />
            </div>
            <div>
                <h1 className="text-xl sm:text-2xl font-bold font-headline">Detalles del Partido</h1>
                <p className="text-sm sm:text-base text-muted-foreground">{format(matchDate, "dd MMM yyyy", { locale: es })} - {competition}</p>
            </div>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" asChild>
                <Link href="/partidos">
                    <ArrowLeft className="mr-2" />
                    <span className="hidden sm:inline">Volver</span>
                </Link>
            </Button>
            <Button asChild>
                 <Link href={`/partidos/${matchId}/estadisticas`}>
                    <BarChart className="mr-2" />
                    <span className="hidden sm:inline">Gestionar</span>
                </Link>
            </Button>
        </div>
      </div>
      
      <Card className="mb-8 text-center">
        <CardContent className="p-4 sm:p-6">
            <h2 className="text-lg sm:text-2xl font-bold mb-2 truncate">{displayLocalTeam} vs {displayVisitorTeam}</h2>
            <p className="text-5xl sm:text-6xl font-bold text-primary">{localScore} - {visitorScore}</p>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="datos">
        <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="datos">Datos del Partido</TabsTrigger>
            <TabsTrigger value="estadisticas">Estadísticas</TabsTrigger>
        </TabsList>
        <TabsContent value="datos">
            <Card>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                         <div className="text-center">
                            <h3 className="font-bold text-lg mb-4">Cronología de Goles</h3>
                        </div>
                        <div className="flex justify-between font-bold text-sm text-muted-foreground border-b pb-2">
                            <h4 className="w-1/2 truncate">{displayLocalTeam}</h4>
                            <h4 className="w-1/2 text-right truncate">{displayVisitorTeam}</h4>
                        </div>
                        <div className="space-y-4">
                            {events.filter((e: any) => e.type === 'goal').sort((a:any, b:any) => a.minute - b.minute).map((goal: any, index: number) => {
                                const myTeamSide = match.localTeam === myTeamName ? 'local' : 'visitor';
                                const isMyTeamGoal = goal.team === myTeamSide;

                                return (
                                <div key={index} className="flex items-center text-sm border-b last:border-none pb-2">
                                    {goal.team === 'local' ? (
                                        <div className="w-1/2 flex justify-between items-center pr-4">
                                            <span className="font-medium truncate">{isMyTeamGoal ? goal.playerName : 'Gol Rival'}</span>
                                            <span className="text-muted-foreground">{goal.minute}'</span>
                                        </div>
                                    ) : <div className="w-1/2 pr-4"></div>}
                                    
                                     <div className="w-[1px] bg-border h-4"></div>

                                    {goal.team === 'visitor' ? (
                                        <div className="w-1/2 flex justify-between items-center pl-4">
                                            <span className="text-muted-foreground">{goal.minute}'</span>
                                            <span className="font-medium text-right truncate">{isMyTeamGoal ? goal.playerName : 'Gol Rival'}</span>
                                        </div>
                                    ) : <div className="w-1/2 pl-4"></div>}
                                </div>
                                );
                            })}
                        </div>
                    </div>
                     <div className="space-y-4">
                       <h3 className="font-bold text-center text-lg">Estadísticas del Equipo</h3>
                       <div className="flex justify-between font-bold border-b pb-2 mb-2">
                            <h4 className="text-left truncate">{displayLocalTeam}</h4>
                            <h4 className="text-right truncate">{displayVisitorTeam}</h4>
                        </div>
                       <div className="space-y-2">
                            <StatRow label="Tiros a Puerta" localValue={teamStats.local.tirosPuerta || 0} visitorValue={teamStats.visitor.tirosPuerta || 0} />
                            <StatRow label="Tiros Fuera" localValue={teamStats.local.tirosFuera || 0} visitorValue={teamStats.visitor.tirosFuera || 0} />
                            <StatRow label="Faltas" localValue={teamStats.local.faltas || 0} visitorValue={teamStats.visitor.faltas || 0} />
                            <StatRow label="Recuperaciones" localValue={teamStats.local.recuperaciones || 0} visitorValue={teamStats.visitor.recuperaciones || 0} />
                            <StatRow label="Pérdidas" localValue={teamStats.local.perdidas || 0} visitorValue={teamStats.visitor.perdidas || 0} />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="estadisticas">
            <Card>
                <CardHeader>
                    <CardTitle>Estadísticas de Jugadores ({myTeamName})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>#</TableHead>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead className="text-center">Min.</TableHead>
                                    <TableHead className="text-center">G</TableHead>
                                    <TableHead className="text-center">As</TableHead>
                                    <TableHead className="text-center">TA</TableHead>
                                    <TableHead className="text-center">TR</TableHead>
                                    <TableHead className="text-center">F</TableHead>
                                    <TableHead className="text-center">Par.</TableHead>
                                    <TableHead className="text-center">GC</TableHead>
                                    <TableHead className="text-center">1vs1</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {finalPlayerStats.sort((a, b) => Number(a.number) - Number(b.number)).map((player) => (
                                    <TableRow key={player.id}>
                                        <TableCell className="py-2 px-4 font-medium">{player.number}</TableCell>
                                        <TableCell className="py-2 px-4 font-medium truncate">{player.name || 'Desconocido'}</TableCell>
                                        <TableCell className="text-center py-2 px-4">{formatTime(player.minutesPlayed || 0)}</TableCell>
                                        <TableCell className="text-center py-2 px-4">{player.g || 0}</TableCell>
                                        <TableCell className="text-center py-2 px-4">{player.a || 0}</TableCell>
                                        <TableCell className="text-center py-2 px-4">{player.ta || 0}</TableCell>
                                        <TableCell className="text-center py-2 px-4">{player.tr || 0}</TableCell>
                                        <TableCell className="text-center py-2 px-4">{player.fouls || 0}</TableCell>
                                        <TableCell className="text-center py-2 px-4">{player.paradas || 0}</TableCell>
                                        <TableCell className="text-center py-2 px-4">{player.gc || 0}</TableCell>
                                        <TableCell className="text-center py-2 px-4">{player.vs1 || 0}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                             <TableFooter>
                                <TableRow className="bg-muted/50 font-bold hover:bg-muted/50">
                                    <TableCell colSpan={2} className="py-2 px-4">Total Equipo</TableCell>
                                    <TableCell className="text-center py-2 px-4">{totalTimeFormatted}</TableCell>
                                    <TableCell className="text-center py-2 px-4">{totals.g}</TableCell>
                                    <TableCell className="text-center py-2 px-4">{totals.a}</TableCell>
                                    <TableCell className="text-center py-2 px-4">{totals.ta}</TableCell>
                                    <TableCell className="text-center py-2 px-4">{totals.tr}</TableCell>
                                    <TableCell className="text-center py-2 px-4">{totals.fouls}</TableCell>
                                    <TableCell className="text-center py-2 px-4">{totals.paradas}</TableCell>
                                    <TableCell className="text-center py-2 px-4">{totals.gc}</TableCell>
                                    <TableCell className="text-center py-2 px-4">{totals.vs1}</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
