
"use client";

import { useState, useEffect } from "react";
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection, useDocumentData } from "react-firebase-hooks/firestore";
import { collection, doc, writeBatch, addDoc } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Trash2, Users, PlusCircle, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

type Player = {
    id?: string;
    number: string;
    name: string;
    position: string;
};

type StaffMember = {
    id?: string;
    name: string;
    role: string;
    email: string;
    invitationId?: string; // To store the invitation ID
};

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg aria-hidden="true" fill="currentColor" viewBox="0 0 448 512" {...props}>
        <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.8 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
    </svg>
);


export default function PlantillaPage() {
    const params = useParams();
    const teamId = params.id as string;
    const { toast } = useToast();
    const [user, loadingAuth] = useAuthState(auth);

    // Fetch team data
    const [team, loadingTeam, errorTeam] = useDocumentData(doc(db, "teams", teamId));
    const isOwner = !loadingAuth && !loadingTeam && user?.uid === team?.ownerId;

    // Fetch players subcollection
    const [playersSnapshot, loadingPlayers, errorPlayers] = useCollection(collection(db, "teams", teamId, "players"));
    
    // Fetch staff subcollection
    const [staffSnapshot, loadingStaff, errorStaff] = useCollection(collection(db, "teams", teamId, "staff"));
    
    const [players, setPlayers] = useState<Player[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [isSavingPlayers, setIsSavingPlayers] = useState(false);
    const [isSavingStaff, setIsSavingStaff] = useState(false);

    useEffect(() => {
        if (!loadingPlayers && playersSnapshot) {
            const playersData = playersSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<Player, 'id'>) }));
            playersData.sort((a, b) => Number(a.number) - Number(b.number));
            setPlayers(playersData);
        }
    }, [playersSnapshot, loadingPlayers]);

    useEffect(() => {
        if (!loadingStaff && staffSnapshot) {
            setStaff(staffSnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<StaffMember, 'id'>) })));
        }
    }, [staffSnapshot, loadingStaff]);


    const handleAddPlayer = () => {
        if (players.length < 20) {
            setPlayers([...players, { number: '', name: '', position: 'Ala' }]);
        } else {
            toast({
                variant: 'destructive',
                title: "Límite alcanzado",
                description: "No puedes añadir más de 20 jugadores."
            });
        }
    };

    const handleRemovePlayer = (index: number) => {
        const newPlayers = players.filter((_, i) => i !== index);
        setPlayers(newPlayers);
    };

    const handlePlayerChange = (index: number, field: keyof Omit<Player, 'id'>, value: string) => {
        const newPlayers = [...players];
        newPlayers[index] = { ...newPlayers[index], [field]: value };
        setPlayers(newPlayers);
    };

    const handleSavePlayers = async () => {
        setIsSavingPlayers(true);
        try {
            const batch = writeBatch(db);
            const playersCollectionRef = collection(db, "teams", teamId, "players");
            const initialPlayers = playersSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() })) || [];

            // Delete players that are no longer in the local state but exist in Firestore
            initialPlayers.forEach(initialPlayer => {
                if (initialPlayer.id && !players.find(p => p.id === initialPlayer.id)) {
                    batch.delete(doc(playersCollectionRef, initialPlayer.id));
                }
            });

            // Add or update players
            for (const player of players) {
                const { id, ...playerData } = player;
                if (id) {
                    // Update existing player
                    batch.update(doc(playersCollectionRef, id), { ...playerData, number: Number(playerData.number) });
                } else {
                    // Add new player - let Firestore generate ID
                    if(playerData.name && playerData.number){
                        batch.set(doc(collection(db, "teams", teamId, "players")), { ...playerData, number: Number(playerData.number) });
                    }
                }
            }
            
            await batch.commit();
            toast({ title: "Plantilla guardada", description: "Los cambios en la plantilla han sido guardados." });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: error.message });
        } finally {
            setIsSavingPlayers(false);
        }
    };


    const handleAddStaffMember = () => {
        setStaff([...staff, { name: '', role: 'Asistente', email: '' }]);
    };

    const handleRemoveStaffMember = (index: number) => {
        setStaff(staff.filter((_, i) => i !== index));
    };

    const handleStaffChange = (index: number, field: keyof Omit<StaffMember, 'id'>, value: string) => {
        const newStaff = [...staff];
        newStaff[index] = { ...newStaff[index], [field]: value };
        setStaff(newStaff);
    };

    const handleSaveStaff = async () => {
        if (!user || !user.email) {
            toast({ variant: 'destructive', title: "Error", description: "Debes estar autenticado para guardar." });
            return;
        }

        setIsSavingStaff(true);
        try {
            const batch = writeBatch(db);
            const staffCollectionRef = collection(db, "teams", teamId, "staff");
            const initialStaff = staffSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() as StaffMember })) || [];
            
            const updatedStaffList: StaffMember[] = [];

            for (const member of staff) {
                const { id, ...staffData } = member;
                
                if (!id && staffData.name && staffData.email && staffData.role) {
                     // This is a new member, create invitation and staff doc
                    const invitationData = {
                        teamId: teamId,
                        teamName: team?.name || 'un equipo',
                        inviterId: user.uid,
                        inviterEmail: user.email,
                        inviteeEmail: staffData.email,
                        status: "pending",
                        createdAt: new Date(),
                    };
                    const invitationRef = await addDoc(collection(db, "invitations"), invitationData);
                    
                    const staffWithInvitation = { ...staffData, invitationId: invitationRef.id };
                    const newStaffDocRef = doc(staffCollectionRef);
                    batch.set(newStaffDocRef, staffWithInvitation);
                    updatedStaffList.push({ id: newStaffDocRef.id, ...staffWithInvitation });

                } else if (id) {
                    // This is an existing member, update it if needed
                    const existingMember = initialStaff.find(s => s.id === id);
                    if (existingMember && (existingMember.name !== staffData.name || existingMember.role !== staffData.role)) {
                         batch.update(doc(staffCollectionRef, id), { name: staffData.name, role: staffData.role });
                    }
                    updatedStaffList.push(member);
                }
            }
            
            initialStaff.forEach(initialMember => {
                if (initialMember.id && !staff.find(s => s.id === initialMember.id)) {
                    batch.delete(doc(staffCollectionRef, initialMember.id));
                }
            });
            
            await batch.commit();
            setStaff(updatedStaffList);
            toast({ title: "Staff guardado", description: "Los cambios se han guardado. Ahora puedes enviar las invitaciones." });
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Error", description: error.message });
        } finally {
            setIsSavingStaff(false);
        }
    };
    
    const handleInviteStaff = (staffMember: StaffMember) => {
        if (!staffMember.invitationId) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se encontró ID de invitación. Guarda primero los cambios.' });
            return;
        }
        const teamName = team?.name || 'tu equipo';
        // Use a production-ready URL
        const baseUrl = "https://lapizarra27--lapizarra-95eqd.us-east5.hosted.app";
        const invitationUrl = `${baseUrl}/invitacion/${staffMember.invitationId}`;
        const message = `¡Hola ${staffMember.name}! Te invito a unirte al cuerpo técnico del equipo "${teamName}" en LaPizarra. Con este acceso, podrás gestionar la plantilla, partidos y estadísticas. Haz clic aquí para empezar: ${invitationUrl}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

  return (
    <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
                <div className="bg-muted p-3 rounded-full">
                    <Users className="w-8 h-8 text-primary" />
                </div>
                <div>
                    <h1 className="text-4xl font-bold font-headline">Mi Plantilla</h1>
                    <p className="text-lg text-muted-foreground mt-1">Gestiona la plantilla de tu equipo y sus datos principales.</p>
                </div>
            </div>
            <Button variant="outline" asChild>
                <Link href={`/equipos/${params.id}`}>
                    <ArrowLeft className="mr-2" />
                    Volver al Panel
                </Link>
            </Button>
      </div>
      
      <div className="space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>Información del Equipo</CardTitle>
                <CardDescription>Datos generales del equipo.</CardDescription>
            </CardHeader>
            <CardContent>
            {loadingTeam ? <Skeleton className="h-10 w-full" /> : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <Label>Club</Label>
                        <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold">
                            {team?.club || ''}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Equipo</Label>
                        <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold">
                           {team?.name || ''}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Competición</Label>
                        <div className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold">
                            {team?.competition || ''}
                        </div>
                    </div>
                </div>
            )}
             {errorTeam && <p className="text-destructive mt-4">{errorTeam.message}</p>}
            </CardContent>
        </Card>

         <Card>
            <CardHeader>
                <CardTitle>Staff Técnico</CardTitle>
                <CardDescription>Gestiona a los miembros del cuerpo técnico. Guarda los cambios para poder enviar la invitación por WhatsApp.</CardDescription>
            </CardHeader>
            <CardContent>
                {loadingStaff ? <Skeleton className="h-24 w-full" /> : (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead className="w-[180px]">Rol</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="w-[120px] text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {staff.map((member, index) => (
                                <TableRow key={member.id || index}>
                                    <TableCell>
                                        <Input 
                                            value={member.name}
                                            onChange={(e) => handleStaffChange(index, 'name', e.target.value)}
                                            placeholder="Nombre"
                                            disabled={!isOwner}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={member.role}
                                            onValueChange={(value) => handleStaffChange(index, 'role', value)}
                                            disabled={!isOwner}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Rol"/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Entrenador">Entrenador</SelectItem>
                                                <SelectItem value="Segundo Entrenador">Segundo Entrenador</SelectItem>
                                                <SelectItem value="Delegado">Delegado</SelectItem>
                                                <SelectItem value="Asistente">Asistente</SelectItem>
                                                <SelectItem value="Fisioterapeuta">Fisioterapeuta</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Input 
                                            type="email"
                                            value={member.email}
                                            onChange={(e) => handleStaffChange(index, 'email', e.target.value)}
                                            placeholder="Email"
                                            disabled={!isOwner || !!member.id}
                                        />
                                    </TableCell>
                                    <TableCell className="text-right space-x-1">
                                        {isOwner && member.id && member.invitationId && (
                                            <Button variant="ghost" size="icon" onClick={() => handleInviteStaff(member)}>
                                                 <WhatsAppIcon className="w-5 h-5 text-green-500" />
                                            </Button>
                                        )}
                                        {isOwner && (
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveStaffMember(index)}>
                                                <Trash2 className="w-5 h-5 text-destructive" />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                )}
                 {errorStaff && <p className="text-destructive mt-4">{errorStaff.message}</p>}
            </CardContent>
            {isOwner && (
                <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={handleAddStaffMember}>
                        <PlusCircle className="mr-2" />
                        Añadir Miembro
                    </Button>
                    <Button onClick={handleSaveStaff} disabled={isSavingStaff}>
                    {isSavingStaff ? <Loader2 className="mr-2 animate-spin"/> : <Save className="mr-2" />}
                        Guardar Staff
                    </Button>
                </CardFooter>
            )}
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Plantilla del Equipo</CardTitle>
                <CardDescription>Introduce los datos de tus jugadores. Máximo 20. Todos los jugadores estarán disponibles para la convocatoria.</CardDescription>
            </CardHeader>
            <CardContent>
                {loadingPlayers ? <Skeleton className="h-40 w-full" /> : (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">Dorsal</TableHead>
                                <TableHead>Nombre</TableHead>
                                <TableHead className="w-[200px]">Posición</TableHead>
                                <TableHead className="w-[100px] text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {players.map((player, index) => (
                                <TableRow key={player.id || index}>
                                    <TableCell>
                                        <Input 
                                            value={player.number} 
                                            onChange={(e) => handlePlayerChange(index, 'number', e.target.value)}
                                            className="w-16 text-center" 
                                            placeholder="#"
                                            type="number"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input 
                                            value={player.name} 
                                            onChange={(e) => handlePlayerChange(index, 'name', e.target.value)}
                                            placeholder="Nombre del jugador"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Select 
                                            value={player.position}
                                            onValueChange={(value) => handlePlayerChange(index, 'position', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Portero">Portero</SelectItem>
                                                <SelectItem value="Cierre">Cierre</SelectItem>
                                                <SelectItem value="Ala">Ala</SelectItem>
                                                <SelectItem value="Pívot">Pívot</SelectItem>
                                                <SelectItem value="Universal">Universal</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleRemovePlayer(index)}>
                                            <Trash2 className="w-5 h-5 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                )}
                 {errorPlayers && <div className="text-red-500 bg-red-100 p-4 rounded-md mt-4"><b>Error:</b> {errorPlayers.message}</div>}
            </CardContent>
            <CardFooter className="flex justify-between">
                <Button variant="outline" onClick={handleAddPlayer}>
                    <PlusCircle className="mr-2" />
                    Añadir Jugador
                </Button>
                <Button onClick={handleSavePlayers} disabled={isSavingPlayers}>
                    {isSavingPlayers ? <Loader2 className="mr-2 animate-spin"/> : <Save className="mr-2" />}
                    Guardar Plantilla
                </Button>
            </CardFooter>
        </Card>
      </div>
    </div>
  );
}

    