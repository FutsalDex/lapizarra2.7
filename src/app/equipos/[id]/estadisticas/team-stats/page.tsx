
"use client";

import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trophy, TrendingUp, Shield, TrendingDown, Target, XCircle, ShieldAlert, RefreshCw, ChevronsRightLeft, Plus, Minus, Calendar, GanttChart, GanttChartSquare, Goal } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCollection, useDocumentData } from 'react-firebase-hooks/firestore';
import { collection, query, where, doc, Timestamp, getFirestore } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';

type Match = {
    id: string;
    localTeam: string;
    visitorTeam: string;
    date: Timestamp | Date;
    matchType: string;
    competition: string;
    localScore: number;
    visitorScore: number;
    isFinished: boolean;
    teamId: string;
    playerStats?: any;
    opponentStats?: any;
    events?: { type: string; team: string; playerName: string }[];
};

type MatchStats = {
    played: number;
    won: number;
    drawn: number;
    lost: number;
};

type PerformanceStats = {
    shotsOnTarget: number;
    shotsOffTarget: number;
    totalShots: number;
    foulsCommitted: number;
    foulsReceived: number;
    turnovers: number;
    recoveries: number;
    yellowCards: number;
    redCards: number;
    goalsFor: { total: number; '1H': number; '2H': number };
    goalsAgainst: { total: number; '1H': number; '2H': number };
};

const StatCard = ({ title, value, icon, className }: { title: string, value: number, icon: React.ReactNode, className?: string }) => (
    <Card className={cn("flex items-center p-3 gap-3", className)}>
        <div className="bg-primary/10 p-2 rounded-lg">{icon}</div>
        <div>
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <div className="text-2xl font-bold">{value}</div>
        </div>
    </Card>
);

const GoalCard = ({ title, total, part1, part2, type }: { title: string, total: number, part1: number, part2: number, type: 'for' | 'against' }) => (
    <Card>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-2">
                    {type === 'for' ? <Plus className="h-5 w-5"/> : <Minus className="h-5 w-5"/>}
                    <span className="font-medium">Totales</span>
                </div>
                <span className="text-2xl font-bold">{total}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
                 <div className="flex items-center gap-2">
                    {type === 'for' ? <Plus className="h-5 w-5"/> : <Minus className="h-5 w-5"/>}
                    <span className="font-medium">1ª Parte</span>
                </div>
                <span className="text-2xl font-bold">{part1}</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-2">
                    {type === 'for' ? <Plus className="h-5 w-5"/> : <Minus className="h-5 w-5"/>}
                    <span className="font-medium">2ª Parte</span>
                </div>
                <span className="text-2xl font-bold">{part2}</span>
            </div>
        </CardContent>
    </Card>
);


export default function TeamStatsPage() {
    const params = useParams();
    const teamId = params.id as string;
    const [filter, setFilter] = useState('Todos');
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);


    const [team, loadingTeam] = useDocumentData(doc(db, `teams/${teamId}`));
    
    const matchesQuery = teamId ? query(collection(db, "matches"), where("teamId", "==", teamId), where("isFinished", "==", true)) : null;
    const [matchesSnapshot, loadingMatches, errorMatches] = useCollection(matchesQuery);

    const matches = useMemo(() => {
        if (loadingMatches || !matchesSnapshot) return [];
        return matchesSnapshot.docs.map(doc => {
            const data = doc.data();
            const date = data.date && typeof data.date.toDate === 'function' 
                ? (data.date as Timestamp).toDate() 
                : data.date;
            return {
                id: doc.id,
                ...data,
                date: date,
            } as Match;
        }).sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
    }, [matchesSnapshot, loadingMatches]);

    const filteredMatches = useMemo(() => {
        if (filter === 'Todos') {
            return matches;
        }
        return matches.filter(match => match.matchType === filter);
    }, [matches, filter]);

    const { teamPerformanceStats, matchSummary } = useMemo(() => {
        const teamName = team?.name;
        if (loadingTeam || !teamName || loadingMatches) {
            return {
                teamPerformanceStats: null,
                matchSummary: null
            };
        }

        const initialPerformanceStats: PerformanceStats = {
            shotsOnTarget: 0, shotsOffTarget: 0, totalShots: 0,
            foulsCommitted: 0, foulsReceived: 0, turnovers: 0, recoveries: 0,
            yellowCards: 0, redCards: 0,
            goalsFor: { total: 0, '1H': 0, '2H': 0 },
            goalsAgainst: { total: 0, '1H': 0, '2H': 0 }
        };

        const calculatedPerformanceStats = filteredMatches.reduce((acc, match) => {
            ['1H', '2H'].forEach(period => {
                const myTeamPeriodStats = match.playerStats?.[period] || {};
                const opponentPeriodStats = match.opponentStats?.[period] || {};

                Object.values(myTeamPeriodStats).forEach((player: any) => {
                    acc.shotsOnTarget += player.shotsOnTarget || 0;
                    acc.shotsOffTarget += player.shotsOffTarget || 0;
                    acc.foulsCommitted += player.fouls || 0;
                    acc.turnovers += player.turnovers || 0;
                    acc.recoveries += player.recoveries || 0;
                    acc.yellowCards += player.yellowCards || 0;
                    acc.redCards += player.redCards || 0;
                    acc.goalsFor[period as '1H' | '2H'] += player.goals || 0;
                });
                
                acc.foulsReceived += opponentPeriodStats.fouls || 0;
                acc.goalsAgainst[period as '1H' | '2H'] += opponentPeriodStats.goals || 0;
            });
            
            return acc;
        }, initialPerformanceStats);

        calculatedPerformanceStats.totalShots = calculatedPerformanceStats.shotsOnTarget + calculatedPerformanceStats.shotsOffTarget;
        calculatedPerformanceStats.goalsFor.total = calculatedPerformanceStats.goalsFor['1H'] + calculatedPerformanceStats.goalsFor['2H'];
        calculatedPerformanceStats.goalsAgainst.total = calculatedPerformanceStats.goalsAgainst['1H'] + calculatedPerformanceStats.goalsAgainst['2H'];
        
        const calculatedMatchSummary = filteredMatches.reduce((acc, match) => {
            acc.played++;
            const myTeamIsLocal = match.localTeam.trim() === teamName.trim();
            const myTeamWon = myTeamIsLocal ? match.localScore > match.visitorScore : match.visitorScore > match.localScore;
            const isDraw = match.localScore === match.visitorScore;

            if (isDraw) acc.drawn++;
            else if (myTeamWon) acc.won++;
            else acc.lost++;
            return acc;
        }, { played: 0, won: 0, drawn: 0, lost: 0 });

        return { teamPerformanceStats: calculatedPerformanceStats, matchSummary: calculatedMatchSummary };
    }, [filteredMatches, team, loadingTeam, loadingMatches]);
    
    const isLoading = loadingTeam || loadingMatches || !teamPerformanceStats || !matchSummary;
    
    const SquareIcon = ({ className }: { className?: string }) => (
        <div className={cn("w-4 h-5 rounded-sm", className)} />
    );

    const filterOptions = ['Todos', 'Liga', 'Copa', 'Torneo', 'Amistoso'];

    const goalscorers = useMemo(() => {
        if (!selectedMatch || !team) return [];
        const myTeamSide = selectedMatch.localTeam.trim() === team.name.trim() ? 'local' : 'visitor';
        return selectedMatch.events?.filter(e => e.type === 'goal' && e.team === myTeamSide) || [];
    }, [selectedMatch, team]);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <Trophy className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold font-headline">Estadísticas del Equipo: {team?.name || '...'}</h1>
                </div>
                <Button variant="outline" asChild>
                <Link href={`/equipos/${teamId}/estadisticas`}>
                    <ArrowLeft className="mr-2" />
                    Volver
                </Link>
                </Button>
            </div>

            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Controles</CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
            </Card>
            
            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Resumen General de Partidos ({filter})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                                <Skeleton className="h-24 w-full" />
                            </div>
                        ) : errorMatches ? (
                            <p className="text-destructive">Error: {errorMatches.message}</p>
                        ) : matchSummary ? (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <StatCard title="Partidos Jugados" value={matchSummary.played} icon={<GanttChartSquare className="h-6 w-6 text-primary" />} />
                                <StatCard title="Ganados" value={matchSummary.won} icon={<TrendingUp className="h-6 w-6 text-green-600" />} className="border-green-500/50" />
                                <StatCard title="Empatados" value={matchSummary.drawn} icon={<Shield className="h-6 w-6 text-yellow-600" />} className="border-yellow-500/50" />
                                <StatCard title="Perdidos" value={matchSummary.lost} icon={<TrendingDown className="h-6 w-6 text-red-600" />} className="border-red-500/50" />
                            </div>
                        ) : null}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Rendimiento del Equipo</CardTitle>
                    </CardHeader>
                    <CardContent>
                         {isLoading ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                               {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
                            </div>
                         ) : teamPerformanceStats ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                <StatCard title="Tiros Totales" value={teamPerformanceStats.totalShots} icon={<Target className="h-6 w-6 text-primary" />} />
                                <StatCard title="Tiros a Puerta" value={teamPerformanceStats.shotsOnTarget} icon={<Target className="h-6 w-6 text-green-600" />} />
                                <StatCard title="Tiros Fuera" value={teamPerformanceStats.shotsOffTarget} icon={<XCircle className="h-6 w-6 text-red-600" />} />
                                <StatCard title="Faltas Cometidas" value={teamPerformanceStats.foulsCommitted} icon={<ShieldAlert className="h-6 w-6 text-yellow-600" />} />
                                <StatCard title="Faltas Recibidas" value={teamPerformanceStats.foulsReceived} icon={<ShieldAlert className="h-6 w-6 text-blue-500" />} />
                                <StatCard title="Pérdidas de Balón" value={teamPerformanceStats.turnovers} icon={<ChevronsRightLeft className="h-6 w-6 text-orange-500" />} />
                                <StatCard title="Robos de Balón" value={teamPerformanceStats.recoveries} icon={<RefreshCw className="h-6 w-6 text-teal-500" />} />
                                <StatCard title="Tarjetas Amarillas" value={teamPerformanceStats.yellowCards} icon={<SquareIcon className="bg-yellow-400" />} />
                            </div>
                         ) : null}
                    </CardContent>
                </Card>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {isLoading ? (
                        <>
                            <Skeleton className="h-64 w-full" />
                            <Skeleton className="h-64 w-full" />
                        </>
                    ) : teamPerformanceStats ? (
                        <>
                            <GoalCard title="Goles a Favor" total={teamPerformanceStats.goalsFor.total} part1={teamPerformanceStats.goalsFor['1H']} part2={teamPerformanceStats.goalsFor['2H']} type="for"/>
                            <GoalCard title="Goles en Contra" total={teamPerformanceStats.goalsAgainst.total} part1={teamPerformanceStats.goalsAgainst['1H']} part2={teamPerformanceStats.goalsAgainst['2H']} type="against"/>
                        </>
                    ) : null}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <GanttChart className="h-5 w-5 text-primary" />
                            Historial de Partidos ({filter})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-40 w-full" /> : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[120px]">Fecha</TableHead>
                                            <TableHead>Local</TableHead>
                                            <TableHead>Visitante</TableHead>
                                            <TableHead className="text-right">Resultado</TableHead>
                                            <TableHead className="text-right w-[80px]">Goles</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredMatches.length > 0 ? filteredMatches.map((match) => (
                                            <TableRow key={match.id}>
                                                <TableCell>
                                                    {match.date ? format(match.date, 'dd/MM/yyyy', { locale: es }) : '-'}
                                                </TableCell>
                                                <TableCell>{match.localTeam}</TableCell>
                                                <TableCell>{match.visitorTeam}</TableCell>
                                                <TableCell className="text-right">{match.localScore} - {match.visitorScore}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => setSelectedMatch(match)}>
                                                        <Goal className="h-5 w-5 text-muted-foreground" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center h-24">
                                                    No hay partidos para este filtro.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>
             <Dialog open={!!selectedMatch} onOpenChange={(open) => !open && setSelectedMatch(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Goleadores del Partido</DialogTitle>
                        <DialogDescription>
                            {selectedMatch?.localTeam} vs {selectedMatch?.visitorTeam}
                        </DialogDescription>
                    </DialogHeader>
                    <div>
                        {goalscorers.length > 0 ? (
                            <ul className="space-y-2">
                                {goalscorers.map((goal, index) => (
                                    <li key={index} className="flex justify-between items-center p-2 bg-muted rounded-md">
                                        <span>{goal.playerName}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-muted-foreground">Tu equipo no marcó goles en este partido.</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

