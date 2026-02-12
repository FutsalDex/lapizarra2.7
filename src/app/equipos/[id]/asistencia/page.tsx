
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ArrowLeft, Calendar as CalendarIcon, Save, Trash2, RotateCcw, CalendarCheck2, History, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useCollection, useDocumentData } from 'react-firebase-hooks/firestore';
import { collection, doc, setDoc, deleteDoc, getFirestore } from 'firebase/firestore';
import app from '@/firebase/config';
import { Skeleton } from '@/components/ui/skeleton';
import AuthGuard from '@/components/auth/AuthGuard';

type AttendanceStatus = 'presente' | 'ausente' | 'justificado' | 'lesionado' | undefined;

type Player = {
  id: string;
  number: string;
  name: string;
};

type PlayerAttendance = Player & {
  status: AttendanceStatus;
};

const db = getFirestore(app);

export default function AsistenciaPage() {
  const params = useParams();
  const teamId = params.id as string;
  const { toast } = useToast();
  
  const [teamSnapshot] = useDocumentData(doc(db, 'teams', teamId));
  const teamName = teamSnapshot?.name || "Equipo";

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const [playersSnapshot, loadingPlayers, errorPlayers] = useCollection(
    collection(db, 'teams', teamId, 'players')
  );

  const [attendanceSnapshot, loadingAttendanceDates] = useCollection(
    collection(db, 'teams', teamId, 'attendance')
  );

  const formattedDate = date ? format(date, 'yyyy-MM-dd') : '';
  const [attendanceRecord, loadingAttendanceRecord] = useDocumentData(
      formattedDate ? doc(db, 'teams', teamId, 'attendance', formattedDate) : null
  );
  
  const [attendance, setAttendance] = useState<PlayerAttendance[]>([]);
  const [historicStats, setHistoricStats] = useState<any[]>([]);

  const recordedDates = attendanceSnapshot?.docs.map(doc => parseISO(doc.id)) || [];

  useEffect(() => {
    if (loadingPlayers || !playersSnapshot) return;

    const allPlayers = playersSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Player))
      .sort((a,b) => Number(a.number) - Number(b.number));

    if (loadingAttendanceRecord) {
        setAttendance([]); // Clear while loading new date data
        return;
    }

    const newAttendance: PlayerAttendance[] = allPlayers.map(player => {
        const status = attendanceRecord?.playerStatus?.[player.id] || undefined;
        return { ...player, status };
    });

    setAttendance(newAttendance);

  }, [playersSnapshot, attendanceRecord, loadingPlayers, loadingAttendanceRecord]);

   useEffect(() => {
        if (loadingPlayers || !playersSnapshot || loadingAttendanceDates || !attendanceSnapshot) return;

        const allPlayers = playersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Omit<Player, 'id'>}));
        const allAttendanceDocs = attendanceSnapshot.docs.map(doc => doc.data());

        const stats = allPlayers.map(player => {
            const playerStat = {
                dorsal: player.number,
                nombre: player.name,
                p: 0, a: 0, j: 0, l: 0, total: 0
            };
            allAttendanceDocs.forEach(record => {
                if (record.playerStatus && record.playerStatus[player.id]) {
                    playerStat.total++;
                    switch(record.playerStatus[player.id]) {
                        case 'presente': playerStat.p++; break;
                        case 'ausente': playerStat.a++; break;
                        case 'justificado': playerStat.j++; break;
                        case 'lesionado': playerStat.l++; break;
                    }
                }
            });
            return playerStat;
        });

        stats.sort((a, b) => Number(a.dorsal) - Number(b.dorsal));
        setHistoricStats(stats);
   }, [playersSnapshot, attendanceSnapshot, loadingPlayers, loadingAttendanceDates]);


  const handleStatusChange = (playerId: string, status: AttendanceStatus) => {
    setAttendance(prev =>
      prev.map(player =>
        player.id === playerId ? { ...player, status } : player
      )
    );
  };
  
  const clearRecords = () => {
    setAttendance(prev => prev.map(p => ({ ...p, status: undefined })));
     toast({
        title: "Registros limpiados",
        description: "Se ha restablecido la asistencia de todos los jugadores.",
    });
  }

  const saveAttendance = async () => {
      if (!date) {
          toast({ variant: 'destructive', title: 'Error', description: 'Por favor, selecciona una fecha.' });
          return;
      }

      const playerStatus = attendance.reduce((acc, player) => {
          if(player.status) {
            acc[player.id] = player.status;
          }
          return acc;
      }, {} as Record<string, AttendanceStatus>);
      
      if (Object.keys(playerStatus).length !== attendance.length) {
          toast({
              variant: 'destructive',
              title: 'Campos incompletos',
              description: 'Por favor, marca el estado de todos los jugadores antes de guardar.',
          });
          return;
      }

      const docRef = doc(db, 'teams', teamId, 'attendance', formattedDate);

      try {
          await setDoc(docRef, { date: formattedDate, teamId, playerStatus }, { merge: true });
          toast({
              title: "Asistencia Guardada",
              description: `Se ha guardado la asistencia para el día ${format(date, 'PPP', { locale: es })}.`,
          });
      } catch (error: any) {
          toast({ variant: 'destructive', title: 'Error al guardar', description: error.message });
      }
  }

  const deleteRecord = async () => {
      if (!date) return;
      
      const docRef = doc(db, 'teams', teamId, 'attendance', formattedDate);
      try {
        await deleteDoc(docRef);
        toast({
            variant: "destructive",
            title: "Registro Eliminado",
            description: `Se ha eliminado el registro de asistencia para el día ${format(date, 'PPP', { locale: es })}.`,
        });
      } catch (error: any) {
           toast({ variant: 'destructive', title: 'Error al eliminar', description: error.message });
      }
  }
  
  const isLoading = loadingPlayers || loadingAttendanceDates;

  return (
    <AuthGuard>
      <div className="container mx-auto px-4 py-8">
        <style>{`
          .day-with-record {
            background-color: hsl(var(--primary) / 0.2);
            border-color: hsl(var(--primary));
            border-width: 1px;
          }
        `}</style>
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
              <div className="bg-muted p-3 rounded-full">
                  <CalendarCheck2 className="w-8 h-8 text-primary" />
              </div>
              <div>
                  <h1 className="text-4xl font-bold font-headline">Control de Asistencia: {teamName}</h1>
                  <p className="text-lg text-muted-foreground mt-1">
                      Selecciona una fecha y marca el estado de cada jugador. Los días enmarcados ya tienen un registro.
                  </p>
              </div>
          </div>
          <Button variant="outline" asChild>
              <Link href={`/equipos/${teamId}`}>
                  <ArrowLeft className="mr-2" />
                  Volver al Panel del Equipo
              </Link>
          </Button>
        </div>

        <Tabs defaultValue="registro" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="registro">Registro Diario</TabsTrigger>
              <TabsTrigger value="historial">Historial de Asistencia</TabsTrigger>
          </TabsList>
          <TabsContent value="registro">
              <Card>
                  <CardHeader>
                      <div className="flex items-center gap-4">
                          <Label htmlFor="training-date" className="text-sm font-medium">Fecha del entrenamiento:</Label>
                          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                              <PopoverTrigger asChild>
                                  <Button
                                      variant={"outline"}
                                      className={cn(
                                      "w-[280px] justify-start text-left font-normal",
                                      !date && "text-muted-foreground"
                                      )}
                                  >
                                      <CalendarIcon className="mr-2 h-4 w-4" />
                                      {date ? format(date, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                                  </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                  <Calendar
                                      mode="single"
                                      selected={date}
                                      onSelect={(selectedDate) => {
                                          setDate(selectedDate);
                                          setIsCalendarOpen(false);
                                      }}
                                      initialFocus
                                      locale={es}
                                      weekStartsOn={1}
                                      modifiers={{ 'with-record': recordedDates }}
                                      modifiersClassNames={{ 'with-record': 'day-with-record' }}
                                  />
                              </PopoverContent>
                          </Popover>
                      </div>
                  </CardHeader>
                  <CardContent>
                      <div className="overflow-x-auto">
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead className="w-[100px]">Dorsal</TableHead>
                                      <TableHead>Nombre</TableHead>
                                      <TableHead className="text-right">Asistencia</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {isLoading || loadingAttendanceRecord ? (
                                      Array.from({ length: 12 }).map((_, i) => (
                                          <TableRow key={i}>
                                              <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                                              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                              <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                          </TableRow>
                                      ))
                                  ) : (
                                      attendance.map(player => (
                                      <TableRow key={player.id}>
                                          <TableCell className="font-medium">{player.number}</TableCell>
                                          <TableCell>{player.name}</TableCell>
                                          <TableCell className="text-right">
                                              <RadioGroup
                                                  value={player.status}
                                                  className="flex justify-end gap-4"
                                                  onValueChange={(value) => handleStatusChange(player.id, value as AttendanceStatus)}
                                              >
                                                  <div className="flex items-center space-x-2">
                                                      <RadioGroupItem value="presente" id={`presente-${player.id}`} />
                                                      <Label htmlFor={`presente-${player.id}`}>Presente</Label>
                                                  </div>
                                                  <div className="flex items-center space-x-2">
                                                      <RadioGroupItem value="ausente" id={`ausente-${player.id}`} />
                                                      <Label htmlFor={`ausente-${player.id}`}>Ausente</Label>
                                                  </div>
                                                  <div className="flex items-center space-x-2">
                                                      <RadioGroupItem value="justificado" id={`justificado-${player.id}`} />
                                                      <Label htmlFor={`justificado-${player.id}`}>Justificado</Label>
                                                  </div>
                                                  <div className="flex items-center space-x-2">
                                                      <RadioGroupItem value="lesionado" id={`lesionado-${player.id}`} />
                                                      <Label htmlFor={`lesionado-${player.id}`}>Lesionado</Label>
                                                  </div>
                                              </RadioGroup>
                                          </TableCell>
                                      </TableRow>
                                      ))
                                  )}
                                  {errorPlayers && <TableRow><TableCell colSpan={3} className="text-destructive text-center">Error al cargar jugadores: {errorPlayers.message}</TableCell></TableRow>}
                              </TableBody>
                          </Table>
                      </div>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2">
                      <Button variant="outline" onClick={clearRecords}>
                          <RotateCcw className="mr-2" /> Limpiar Registros
                      </Button>
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button variant="destructive" disabled={!attendanceRecord}>
                                  <Trash2 className="mr-2" /> Eliminar Registro
                              </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar este registro?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                      Esta acción no se puede deshacer. Se eliminará permanentemente el registro de asistencia para
                                      el día {date ? format(date, "PPP", { locale: es }) : ''}.
                                  </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={deleteRecord}>Sí, eliminar</AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                      <Button onClick={saveAttendance}>
                          <Save className="mr-2" /> Guardar Asistencia
                      </Button>
                  </CardFooter>
              </Card>
          </TabsContent>
          <TabsContent value="historial">
              <Card>
                  <CardHeader>
                      <div className="flex items-center gap-3">
                          <History className="w-5 h-5 text-primary"/>
                          <CardTitle>Historial de Asistencia</CardTitle>
                      </div>
                      <CardDescription>Resumen de la asistencia de los jugadores a todos los entrenamientos registrados.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead className="w-[80px]">#</TableHead>
                                      <TableHead>Nombre</TableHead>
                                      <TableHead className="text-center">P</TableHead>
                                      <TableHead className="text-center">A</TableHead>
                                      <TableHead className="text-center">J</TableHead>
                                      <TableHead className="text-center">L</TableHead>
                                      <TableHead className="text-center">Total</TableHead>
                                      <TableHead className="w-[200px] text-center">% Asistencia</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {isLoading ? (
                                      Array.from({ length: 12 }).map((_, i) => (
                                          <TableRow key={i}>
                                              <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                                              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                              <TableCell className="text-center"><Skeleton className="h-5 w-5 mx-auto" /></TableCell>
                                              <TableCell className="text-center"><Skeleton className="h-5 w-5 mx-auto" /></TableCell>
                                              <TableCell className="text-center"><Skeleton className="h-5 w-5 mx-auto" /></TableCell>
                                              <TableCell className="text-center"><Skeleton className="h-5 w-5 mx-auto" /></TableCell>
                                              <TableCell className="text-center"><Skeleton className="h-5 w-5 mx-auto" /></TableCell>
                                              <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                                          </TableRow>
                                      ))
                                  ) : (
                                      historicStats.map(player => {
                                          const percentage = player.total > 0 ? Math.round((player.p / player.total) * 100) : 0;
                                          return (
                                              <TableRow key={player.dorsal}>
                                                  <TableCell className="font-medium">{player.dorsal}</TableCell>
                                                  <TableCell>{player.nombre}</TableCell>
                                                  <TableCell className="text-center">{player.p}</TableCell>
                                                  <TableCell className="text-center">{player.a}</TableCell>
                                                  <TableCell className="text-center">{player.j}</TableCell>
                                                  <TableCell className="text-center">{player.l}</TableCell>
                                                  <TableCell className="text-center font-bold">{player.total}</TableCell>
                                                  <TableCell>
                                                      <div className="flex items-center gap-2">
                                                          <Progress value={percentage} className="w-2/3" />
                                                          <span className="text-sm text-muted-foreground w-1/3 text-right">{percentage}%</span>
                                                      </div>
                                                  </TableCell>
                                              </TableRow>
                                          )
                                      })
                                  )}
                              </TableBody>
                          </Table>
                      </div>
                  </CardContent>
                  <CardFooter>
                      <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex gap-4">
                              <p><span className="font-semibold">P:</span> Presente</p>
                              <p><span className="font-semibold">A:</span> Ausente</p>
                              <p><span className="font-semibold">J:</span> Ausencia Justificada</p>
                              <p><span className="font-semibold">L:</span> Lesionado</p>
                          </div>
                          <p>* El % de asistencia se calcula como: (Presente / Sesiones Totales) * 100.</p>
                      </div>
                  </CardFooter>
              </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AuthGuard>
  );
}
