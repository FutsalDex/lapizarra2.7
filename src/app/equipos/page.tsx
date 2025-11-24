
"use client";

import React, { useState, useMemo } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useCollection } from "react-firebase-hooks/firestore";
import { collection, query, where, addDoc, deleteDoc, doc, updateDoc, writeBatch, getDocs, Timestamp } from "firebase/firestore";
import { auth, db } from "@/firebase/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Edit, PlusCircle, Settings, Shield, Trash2, Users, Save, Loader2, UserPlus } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

type Team = {
  id: string;
  name: string;
  club: string;
  competition?: string;
  season?: string;
  ownerId: string;
  memberIds: string[];
};

type Invitation = {
    id: string;
    teamId: string;
    teamName: string;
    inviterEmail: string;
    inviteeEmail: string;
    status: 'pending' | 'completed';
}

export default function EquiposPage() {
  const [user, loadingUser] = useAuthState(auth);
  const { toast } = useToast();

  const [teamsSnapshot, loadingTeams, errorTeams] = useCollection(collection(db, "teams"));
  
  const invitationsQuery = user ? query(collection(db, 'invitations'), where('inviteeEmail', '==', user.email), where('status', '==', 'pending')) : null;
  const [invitationsSnapshot, loadingInvitations] = useCollection(invitationsQuery);
  const invitations = invitationsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() as Invitation })) || [];

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTeam, setNewTeam] = useState({ name: '', club: '', season: '', competition: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { ownedTeams, memberTeams } = useMemo(() => {
    if (!user || !teamsSnapshot) {
      return { ownedTeams: [], memberTeams: [] };
    }
    const allTeams = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
    
    const ownedTeams = allTeams.filter(team => team.ownerId === user.uid);
    const memberTeams = allTeams.filter(team => team.memberIds?.includes(user.uid));

    return { ownedTeams, memberTeams };
  }, [user, teamsSnapshot]);


  const handleAddTeam = async () => {
    if (!newTeam.name || !newTeam.club || !user) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "El nombre del equipo y el club son obligatorios.",
        });
        return;
    }
    
    setIsSubmitting(true);
    try {
        await addDoc(collection(db, "teams"), {
            name: newTeam.name,
            club: newTeam.club,
            competition: newTeam.competition,
            season: newTeam.season,
            ownerId: user.uid,
            memberIds: [],
            createdAt: new Date(),
        });
        toast({
            title: "Equipo añadido",
            description: `El equipo "${newTeam.name}" ha sido creado.`,
        });
        setIsAddDialogOpen(false);
        setNewTeam({ name: '', club: '', season: '', competition: '' });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Error al crear el equipo",
            description: error.message,
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
        await deleteDoc(doc(db, "teams", teamId));
        toast({
            variant: "destructive",
            title: "Equipo eliminado",
            description: "El equipo y sus datos asociados han sido eliminados.",
        });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Error al eliminar el equipo",
            description: error.message,
        });
    }
  };
  
  const handleAcceptInvitation = async (invitation: Invitation) => {
    if (!user) return;

    const teamRef = doc(db, 'teams', invitation.teamId);
    const invitationRef = doc(db, 'invitations', invitation.id);

    try {
        const teamDoc = teamsSnapshot?.docs.find(doc => doc.id === invitation.teamId);
        if (!teamDoc) throw new Error("El equipo ya no existe.");

        const teamData = teamDoc.data() as Team;

        const batch = writeBatch(db);
      
        batch.update(teamRef, {
            memberIds: [...(teamData.memberIds || []), user.uid]
        });
      
        batch.update(invitationRef, {
            status: 'completed',
            completedAt: new Date()
        });

        await batch.commit();

        toast({
          title: "¡Te has unido al equipo!",
          description: `Ahora eres miembro del cuerpo técnico.`
        });
    } catch (error: any) {
      toast({
          variant: "destructive",
          title: "Error al unirse al equipo",
          description: error.message,
      });
    }
  };

  const TeamCard = ({ team, isOwner }: { team: Team, isOwner: boolean }) => (
     <div className="border rounded-lg p-4 flex items-center justify-between">
        <div>
            <p className="font-bold text-lg">{team.name}</p>
            <p className="text-sm text-muted-foreground">{team.club} - {team.season}</p>
        </div>
        <div className="flex items-center gap-2">
            <Button size="sm" asChild>
                <Link href={`/equipos/${team.id}`}>
                    <Settings className="mr-2" />
                    Gestionar
                </Link>
            </Button>
            {isOwner && (
                <>
                    <Button variant="ghost" size="icon">
                        <Edit className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro de que quieres eliminar este equipo?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción es permanente y no se puede deshacer. Se borrarán todos los datos asociados al equipo.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteTeam(team.id)}>Sí, eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </>
            )}
        </div>
    </div>
  );


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <Button variant="outline" asChild>
          <Link href="/panel">
            <ArrowLeft className="mr-2" />
            Volver al Panel
          </Link>
        </Button>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2" />
                    Añadir Equipo
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Añadir Nuevo Equipo</DialogTitle>
                    <DialogDescription>Introduce los datos para crear un nuevo equipo.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="team-name">Nombre del Equipo</Label>
                        <Input id="team-name" placeholder="Ej: Juvenil B" value={newTeam.name} onChange={(e) => setNewTeam({...newTeam, name: e.target.value})} disabled={isSubmitting}/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="club-name">Club</Label>
                        <Input id="club-name" placeholder="Ej: FS Ràpid Santa Coloma" value={newTeam.club} onChange={(e) => setNewTeam({...newTeam, club: e.target.value})} disabled={isSubmitting}/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="season">Temporada</Label>
                        <Input id="season" placeholder="Ej: 2024/2025" value={newTeam.season} onChange={(e) => setNewTeam({...newTeam, season: e.target.value})} disabled={isSubmitting}/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="competition">Competición</Label>
                        <Input id="competition" placeholder="Ej: Liga Nacional Juvenil" value={newTeam.competition} onChange={(e) => setNewTeam({...newTeam, competition: e.target.value})} disabled={isSubmitting}/>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" disabled={isSubmitting}>Cancelar</Button>
                    </DialogClose>
                    <Button onClick={handleAddTeam} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 animate-spin"/> : <Save className="mr-2"/>}
                        Guardar Equipo
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <div className="bg-primary/10 p-3 rounded-full">
            <Shield className="w-8 h-8 text-primary" />
        </div>
        <div>
            <h1 className="text-4xl font-bold font-headline">Gestión de Equipos</h1>
            <p className="text-lg text-muted-foreground mt-1">Crea y administra tus equipos. Invita a tu cuerpo técnico para colaborar.</p>
        </div>
      </div>
      

      <div className="space-y-8">
          { (loadingUser || loadingInvitations) && <Skeleton className="h-24 w-full" />}
          { !loadingUser && !loadingInvitations && invitations.length > 0 && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <UserPlus className="w-5 h-5 text-primary" />
                            <CardTitle>Invitaciones Pendientes</CardTitle>
                        </div>
                        <CardDescription>Has sido invitado a colaborar en estos equipos. Acéptalos para empezar.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {invitations.map(inv => (
                            <div key={inv.id} className="border rounded-lg p-4 flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-lg">{inv.teamName || "un equipo"}</p>
                                    <p className="text-sm text-muted-foreground">Invitado por {inv.inviterEmail}</p>
                                </div>
                                <Button onClick={() => handleAcceptInvitation(inv)}>
                                    <UserPlus className="mr-2" />
                                    Unirse al equipo
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-primary" />
                <CardTitle>Mis Equipos (Propietario)</CardTitle>
              </div>
              <CardDescription>Lista de equipos que administras como propietario.</CardDescription>
            </CardHeader>
            <CardContent>
                {(loadingUser || loadingTeams) && (
                    <div className="space-y-4">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                )}

                {!(loadingUser || loadingTeams) && ownedTeams.length > 0 ? (
                    <div className="space-y-2">
                        {ownedTeams.map(team => (
                            <TeamCard key={team.id} team={team} isOwner={true} />
                        ))}
                    </div>
                ) : null}

                {!(loadingUser || loadingTeams) && ownedTeams.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>No has creado ningún equipo todavía.</p>
                        <p>Haz clic en "Añadir Equipo" para empezar.</p>
                    </div>
                )}

                {errorTeams && (
                    <div className="text-center py-8 text-destructive">
                        <p>Error al cargar los equipos: {errorTeams.message}</p>
                    </div>
                )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-muted-foreground" />
                <CardTitle>Equipos en los que colaboro</CardTitle>
              </div>
              <CardDescription>Lista de equipos en los que eres miembro del cuerpo técnico.</CardDescription>
            </CardHeader>
            <CardContent>
                 {(loadingUser || loadingTeams) && (
                    <div className="space-y-4">
                        <Skeleton className="h-16 w-full" />
                    </div>
                )}

                {!(loadingUser || loadingTeams) && memberTeams && memberTeams.length > 0 ? (
                    <div className="space-y-2">
                        {memberTeams.map((team, index) => (
                           <TeamCard key={`${team.id}-${index}`} team={team} isOwner={false} />
                        ))}
                    </div>
                ) : null}

                 {!(loadingUser || loadingTeams) && (!memberTeams || memberTeams.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                        <p>Aún no eres miembro de ningún equipo.</p>
                    </div>
                )}
                 {errorTeams && (
                    <div className="text-center py-8 text-destructive">
                        <p>Error al cargar los equipos: {errorTeams.message}</p>
                    </div>
                )}
            </CardContent>
          </Card>
        </div>
    </div>
  );
}

    