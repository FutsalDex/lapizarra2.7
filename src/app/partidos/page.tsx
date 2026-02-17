
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection, useDocumentData } from 'react-firebase-hooks/firestore';
import { collection, query, where, doc, addDoc, updateDoc, deleteDoc, Timestamp, getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import app from '@/firebase/config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { PlusCircle, ArrowLeft, Users, BarChart, Eye, Edit, Trophy, Save, Calendar as CalendarIcon, Trash2, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const db = getFirestore(app);
const auth = getAuth(app);

type Match = {
    id: string;
    localTeam: string;
    visitorTeam: string;
    date: Date;
    competition: string;
    matchType: string;
    round?: string;
    localScore: number;
    visitorScore: number;
    status: 'scheduled' | 'finished' | 'live';
    playersCalled?: number;
    teamId?: string;
    userId?: string;
    squad?: string[];
};

const getResultColor = (localScore: number, visitorScore: number, localTeamName: string, visitorTeamName: string, myTeamName: string): string => {
    const isDraw = localScore === visitorScore;
    if (isDraw) return 'text-muted-foreground';

    if (myTeamName.trim() === localTeamName.trim()) {
        return localScore > visitorScore ? 'text-primary' : 'text-destructive';
    } else if (myTeamName.trim() === visitorTeamName.trim()) {
        return visitorScore > localScore ? 'text-primary' : 'text-destructive';
    }
    
    return 'text-foreground';
};

const MatchCard = ({ match, teamName, onConvocatoriaOpen, onEditOpen, onDelete }: { match: Match; teamName: string, onConvocatoriaOpen: (match: Match) => void; onEditOpen: (match: Match) => void; onDelete: (matchId: string) => void; }) => (
    <Card key={match.id} className="transition-all hover:shadow-md flex flex-col">
        <CardContent className="p-6 text-center flex-grow">
            <p className="font-semibold truncate">{match.localTeam} vs {match.visitorTeam}</p>
            <p className="text-sm text-muted-foreground mb-4">{format(match.date, 'dd/MM/yyyy HH:mm')}</p>
            <p className={`text-5xl font-bold mb-4 ${getResultColor(match.localScore, match.visitorScore, match.localTeam, match.visitorTeam, teamName)}`}>{match.localScore} - {match.visitorScore}</p>
             <Badge variant="secondary">{match.matchType}</Badge>
             {match.matchType === 'Liga' && match.round && (
                <p className="text-xs text-muted-foreground mt-1">Jornada {match.round}</p>
            )}
        </CardContent>
        <CardFooter className="bg-muted/50 p-3 flex justify-around">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => onConvocatoriaOpen(match)}>
                <Users className="mr-1" /> {match.squad ? `${match.squad.length} Jug.` : 'Convocar'}
            </Button>
            <Button asChild variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Link href={`/partidos/${match.id}/estadisticas`}>
                    <BarChart />
                </Link>
            </Button>
            <Button asChild variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Link href={`/partidos/${match.id}`}>
                    <Eye />
                </Link>
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => onEditOpen(match)}>
                <Edit />
            </Button>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro de que quieres eliminar este partido?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminarán permanentemente los datos del partido, incluidas las estadísticas.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(match.id)}>Eliminar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </CardFooter>
    </Card>
);

const ConvocatoriaDialog = ({ isOpen, onOpenChange, match, teamPlayers, onSave, isLoading }: { isOpen: boolean, onOpenChange: (open: boolean) => void, match: Match | null, teamPlayers: any[], onSave: (squad: string[]) => void, isLoading: boolean }) => {
    const [selectedPlayers, setSelectedPlayers] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (match?.squad) {
            const initialSelection: Record<string, boolean> = {};
            match.squad.forEach(playerId => {
                initialSelection[playerId] = true;
            });
            setSelectedPlayers(initialSelection);
        } else {
            setSelectedPlayers({});
        }
    }, [match]);
    
    const selectedCount = Object.values(selectedPlayers).filter(Boolean).length;
    const allSelected = teamPlayers.length > 0 && selectedCount === teamPlayers.length;

    const handleSelectAll = (checked: boolean) => {
        const newSelectedPlayers: Record<string, boolean> = {};
        if (checked) {
            teamPlayers.forEach(player => {
                newSelectedPlayers[player.id] = true;
            });
        }
        setSelectedPlayers(newSelectedPlayers);
    };
    
    const handlePlayerSelect = (playerId: string, checked: boolean) => {
        setSelectedPlayers(prev => ({ ...prev, [playerId]: checked }));
    };

    const handleSave = () => {
        const squad = Object.keys(selectedPlayers).filter(id => selectedPlayers[id]);
        onSave(squad);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Convocar Jugadores</DialogTitle>
                    <DialogDescription>
                        Selecciona un máximo de 12 jugadores para el partido. ({selectedCount}/12)
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="flex items-center space-x-2">
                        <Checkbox 
                            id="select-all"
                            checked={allSelected}
                            onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                        />
                        <Label htmlFor="select-all" className="font-semibold">
                            Seleccionar Todos
                        </Label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {teamPlayers.map(player => (
                            <div key={player.id} className="flex items-center space-x-2">
                                <Checkbox 
                                    id={`player-${player.id}`} 
                                    checked={!!selectedPlayers[player.id]}
                                    onCheckedChange={(checked) => handlePlayerSelect(player.id, checked as boolean)}
                                    disabled={selectedCount >= 12 && !selectedPlayers[player.id]}
                                />
                                <Label htmlFor={`player-${player.id}`} className="flex items-center gap-2 text-sm font-normal">
                                    <span className="font-bold w-6 text-right">({player.number})</span>
                                    <span>{player.name}</span>
                                </Label>
                            </div>
                        ))}
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 animate-spin"/> : <Save className="mr-2" />}
                        Guardar Convocatoria
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const MatchFormDialog = ({ isOpen, onOpenChange, match: initialMatch, onSave, isLoading, teamName, teamCompetition }: { isOpen: boolean; onOpenChange: (open: boolean) => void; match?: any | null; onSave: (data: any) => void; isLoading: boolean; teamName: string; teamCompetition: string }) => {
    const [matchData, setMatchData] = useState<any>({});
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialMatch) {
                setMatchData({
                    ...initialMatch,
                    date: initialMatch.date ? (initialMatch.date instanceof Date ? initialMatch.date : (initialMatch.date as Timestamp).toDate()) : new Date(),
                    time: initialMatch.date ? format((initialMatch.date instanceof Date ? initialMatch.date : (initialMatch.date as Timestamp).toDate()), "HH:mm") : '',
                    matchType: ['Liga', 'Copa', 'Torneo', 'Amistoso'].includes(initialMatch.matchType) ? initialMatch.matchType : 'Amistoso',
                });
            } else {
                 setMatchData({
                    localTeam: '', visitorTeam: '', date: undefined, time: '',
                    type: 'Amistoso', competition: '', round: ''
                });
            }
        }
    }, [isOpen, initialMatch]);

    const handleChange = (field: string, value: any) => {
        setMatchData((prev: any) => {
             const updatedMatch = { ...prev, [field]: value };
            if (field === 'matchType' && value === 'Liga') {
                updatedMatch.competition = teamCompetition;
            }
            return updatedMatch;
        });
    };

    const handleSave = () => {
        onSave(matchData);
    };
    
    const isEdit = !!initialMatch;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Editar Partido' : 'Añadir Nuevo Partido'}</DialogTitle>
                    <DialogDescription>{isEdit ? 'Modifica los datos del partido.' : 'Introduce los datos básicos del partido.'}</DialogDescription>
                </DialogHeader>
                 <div className="space-y-4 py-4 overflow-y-auto pr-2">
                    <div className="space-y-2">
                        <Label htmlFor="local-team">{isEdit ? 'Equipo Local' : 'Equipo Local'}</Label>
                        <div className="flex gap-2">
                            <Input id="local-team" placeholder="Nombre del equipo" value={matchData.localTeam || ''} onChange={(e) => handleChange('localTeam', e.target.value)} />
                            <Button variant="outline" onClick={() => handleChange('localTeam', teamName)}>Mi Equipo</Button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="visitor-team">Equipo Visitante</Label>
                         <div className="flex gap-2">
                            <Input id="visitor-team" placeholder="Nombre del equipo" value={matchData.visitorTeam || ''} onChange={(e) => handleChange('visitorTeam', e.target.value)} />
                            <Button variant="outline" onClick={() => handleChange('visitorTeam', teamName)}>Mi Equipo</Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Fecha del partido</Label>
                            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn("w-full justify-start text-left font-normal", !matchData.date && "text-muted-foreground")}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {matchData.date ? format(matchData.date, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={matchData.date}
                                        onSelect={(date) => {
                                            handleChange('date', date);
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
                                <Input id="time" type="time" className="pl-10" value={matchData.time || ''} onChange={(e) => handleChange('time', e.target.value)} />
                            </div>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="type">Tipo</Label>
                        <Select value={matchData.matchType || 'Amistoso'} onValueChange={(value) => handleChange('matchType', value)}>
                            <SelectTrigger id="type">
                                <SelectValue placeholder="Seleccionar tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Amistoso">Amistoso</SelectItem>
                                <SelectItem value="Liga">Liga</SelectItem>
                                <SelectItem value="Copa">Copa</SelectItem>
                                <SelectItem value="Torneo">Torneo</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                     {matchData.matchType === 'Liga' && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="competition">Competición</Label>
                                <Input 
                                    id="competition" 
                                    placeholder="Nombre de la competición"
                                    value={matchData.competition || ''}
                                    onChange={(e) => handleChange('competition', e.target.value)} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="round">Jornada</Label>
                                <Input 
                                    id="round" 
                                    type="number" 
                                    placeholder="Número de jornada"
                                    value={matchData.round || ''}
                                    onChange={(e) => handleChange('round', e.target.value)} 
                                />
                            </div>
                        </>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="ghost">Cancelar</Button>
                    </DialogClose>
                    <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2"/>}
                        {isEdit ? 'Guardar Cambios' : 'Crear Partido'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function PartidosPage() {
    const { toast } = useToast();
    const [user, loadingAuth] = useAuthState(auth);

    const [teamId, setTeamId] = useState<string | null>('vfR0cLrsj4r5DSYxUac1'); // Hardcoded, should be dynamic
    
    const [teamSnapshot, loadingTeam, errorTeam] = useDocumentData(teamId ? doc(db, 'teams', teamId) : null);
    const [playersSnapshot, loadingPlayers, errorPlayers] = useCollection(teamId ? collection(db, `teams/${teamId}/players`) : null);
    
    const matchesQuery = useMemo(() => {
        if (!user) return null;
        return query(
            collection(db, "matches"), 
            where("userId", "==", user.uid)
        );
    }, [user]);
    
    const [matchesSnapshot, loadingMatches, errorMatches] = useCollection(matchesQuery);

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isConvocatoriaOpen, setIsConvocatoriaOpen] = useState(false);
    const [editingMatch, setEditingMatch] = useState<Match | null>(null);
    const [matchForConvocatoria, setMatchForConvocatoria] = useState<Match | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const teamName = useMemo(() => teamSnapshot?.name || "Mi Equipo", [teamSnapshot]);
    const teamCompetition = useMemo(() => teamSnapshot?.competition || '', [teamSnapshot]);

    const matches = useMemo(() =>
        matchesSnapshot?.docs
        .map(doc => {
            const data = doc.data();
            const date = (data.date as Timestamp)?.toDate ? (data.date as Timestamp).toDate() : new Date();
            return { id: doc.id, ...data, date: date } as Match;
        })
        .sort((a, b) => a.date.getTime() - b.date.getTime()) || [],
        [matchesSnapshot]
    );

    const teamPlayers = useMemo(() =>
        playersSnapshot?.docs.map(doc => ({ id: doc.id, name: doc.data().name, number: doc.data().number })).sort((a,b) => Number(a.number) - Number(b.number)) || [],
        [playersSnapshot]
    );

    const handleOpenEditDialog = (match: Match) => {
        setEditingMatch(match);
        setIsEditDialogOpen(true);
    };

    const handleOpenConvocatoriaDialog = (match: Match) => {
        setMatchForConvocatoria(match);
        setIsConvocatoriaOpen(true);
    };

    const handleDeleteMatch = async (matchId: string) => {
        try {
            await deleteDoc(doc(db, "matches", matchId));
            toast({ variant: 'destructive', title: "Partido eliminado" });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error al eliminar", description: error.message });
        }
    };
    
    const handleSaveConvocatoria = async (squad: string[]) => {
        if (!matchForConvocatoria) return;
        setIsSubmitting(true);
        try {
            await updateDoc(doc(db, "matches", matchForConvocatoria.id), {
                squad: squad,
                playersCalled: squad.length
            });
            toast({ title: "Convocatoria guardada" });
            setIsConvocatoriaOpen(false);
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleSaveMatch = async (matchData: any) => {
        if (!user || !teamId) return;
        setIsSubmitting(true);

        const [hours, minutes] = matchData.time.split(':').map(Number);
        const matchDate = new Date(matchData.date);
        matchDate.setHours(hours, minutes);

        const data = {
            localTeam: matchData.localTeam,
            visitorTeam: matchData.visitorTeam,
            date: Timestamp.fromDate(matchDate),
            competition: matchData.matchType === 'Liga' ? matchData.competition : matchData.matchType,
            matchType: matchData.matchType,
            round: matchData.matchType === 'Liga' ? matchData.round || '' : '',
        };

        try {
            if (matchData.id) { // Editing existing match
                await updateDoc(doc(db, "matches", matchData.id), data);
                toast({ title: "Cambios guardados" });
                setIsEditDialogOpen(false);
            } else { // Creating new match
                const newMatchData = {
                    ...data,
                    localScore: 0, visitorScore: 0, status: 'scheduled',
                    isFinished: false, userId: user.uid, teamId: teamId,
                    squad: [], events: [], playerStats: {}, opponentStats: {},
                };
                await addDoc(collection(db, "matches"), newMatchData);
                toast({ title: "Partido creado" });
                setIsAddDialogOpen(false);
            }
        } catch (error: any) {
             toast({ variant: 'destructive', title: "Error", description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isLoading = loadingAuth || loadingMatches || loadingPlayers || loadingTeam;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className='flex items-center gap-4'>
             <Button variant="outline" asChild>
                <Link href={`/equipos/${teamId}`}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Volver al Panel</span>
                </Link>
            </Button>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Partido
        </Button>
      </div>
      
       <div className='mb-8'>
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold font-headline">Partidos de {teamName}</h1>
          </div>
          <p className="text-base md:text-lg text-muted-foreground">Gestiona los partidos, añade nuevos encuentros, edita los existentes o consulta sus estadísticas.</p>
        </div>

        {isLoading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({length: 6}).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
            </div>
        ) : errorMatches || errorTeam || errorPlayers ? (
            <p className="text-destructive">Error: {errorMatches?.message || errorTeam?.message || errorPlayers?.message}</p>
        ) : (
            <Tabs defaultValue="Todos">
                <TabsList className="mb-8">
                <TabsTrigger value="Todos">Todos</TabsTrigger>
                <TabsTrigger value="Liga">Liga</TabsTrigger>
                <TabsTrigger value="Copa">Copa</TabsTrigger>
                <TabsTrigger value="Torneo">Torneo</TabsTrigger>
                <TabsTrigger value="Amistoso">Amistoso</TabsTrigger>
                </TabsList>
                
                <TabsContent value="Todos">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {matches.map(m => <MatchCard key={m.id} match={m} teamName={teamName} onConvocatoriaOpen={handleOpenConvocatoriaDialog} onEditOpen={handleOpenEditDialog} onDelete={handleDeleteMatch} />)}
                    </div>
                </TabsContent>
                <TabsContent value="Liga">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {matches.filter(m => m.matchType === 'Liga').map(m => <MatchCard key={m.id} match={m} teamName={teamName} onConvocatoriaOpen={handleOpenConvocatoriaDialog} onEditOpen={handleOpenEditDialog} onDelete={handleDeleteMatch} />)}
                    </div>
                </TabsContent>
                <TabsContent value="Copa">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {matches.filter(m => m.matchType === 'Copa').length > 0 ? (
                            matches.filter(m => m.matchType === 'Copa').map(m => <MatchCard key={m.id} match={m} teamName={teamName} onConvocatoriaOpen={handleOpenConvocatoriaDialog} onEditOpen={handleOpenEditDialog} onDelete={handleDeleteMatch} />)
                        ) : <p className="text-center text-muted-foreground col-span-3">No hay partidos de copa para mostrar.</p>}
                    </div>
                </TabsContent>
                <TabsContent value="Torneo">
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {matches.filter(m => m.matchType === 'Torneo').length > 0 ? (
                            matches.filter(m => m.matchType === 'Torneo').map(m => <MatchCard key={m.id} match={m} teamName={teamName} onConvocatoriaOpen={handleOpenConvocatoriaDialog} onEditOpen={handleOpenEditDialog} onDelete={handleDeleteMatch} />)
                        ) : <p className="text-center text-muted-foreground col-span-3">No hay partidos de torneo para mostrar.</p>}
                    </div>
                </TabsContent>
                <TabsContent value="Amistoso">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {matches.filter(m => m.matchType === 'Amistoso').length > 0 ? (
                             matches.filter(m => m.matchType === 'Amistoso').map(m => <MatchCard key={m.id} match={m} teamName={teamName} onConvocatoriaOpen={handleOpenConvocatoriaDialog} onEditOpen={handleOpenEditDialog} onDelete={handleDeleteMatch} />)
                        ): <p className="text-center text-muted-foreground col-span-3">No hay partidos amistosos para mostrar.</p>}
                    </div>
                </TabsContent>
            </Tabs>
        )}
      
      <ConvocatoriaDialog 
        isOpen={isConvocatoriaOpen}
        onOpenChange={setIsConvocatoriaOpen}
        match={matchForConvocatoria}
        teamPlayers={teamPlayers}
        onSave={handleSaveConvocatoria}
        isLoading={isSubmitting}
      />

      <MatchFormDialog 
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSave={handleSaveMatch}
        isLoading={isSubmitting}
        teamName={teamName}
        teamCompetition={teamCompetition}
      />
      
      <MatchFormDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        match={editingMatch}
        onSave={handleSaveMatch}
        isLoading={isSubmitting}
        teamName={teamName}
        teamCompetition={teamCompetition}
      />
    </div>
  );
}
