
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { doc, updateDoc, writeBatch, getDoc, arrayUnion, getFirestore } from 'firebase/firestore';
import { getAuth } from "firebase/auth";
import app from '@/firebase/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldCheck, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

const db = getFirestore(app);
const auth = getAuth(app);

export default function AcceptInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const invitationId = params.invitationId as string;

  const [user, loadingAuth] = useAuthState(auth);
  const [invitation, loadingInvitation, errorInvitation] = useDocumentData(doc(db, 'invitations', invitationId));
  const [status, setStatus] = useState<'loading' | 'unauthenticated' | 'invalid' | 'already_member' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (loadingAuth || loadingInvitation) {
      setStatus('loading');
      return;
    }

    if (!user) {
      // User is not logged in, redirect them to login but keep the invitation id
      router.push(`/login?redirect=/invitacion/${invitationId}`);
      return;
    }

    if (!invitation) {
      setStatus('invalid');
      setErrorMessage('Esta invitación no es válida o ha expirado.');
      return;
    }

    if (invitation.inviteeEmail !== user.email) {
      setStatus('invalid');
      setErrorMessage('Esta invitación no está dirigida a ti. Por favor, inicia sesión con la cuenta correcta.');
      return;
    }
    
    if (invitation.status === 'completed') {
        setStatus('already_member');
        return;
    }

    const acceptInvitation = async () => {
      try {
        const teamRef = doc(db, 'teams', invitation.teamId);
        const teamDoc = await getDoc(teamRef);

        if (!teamDoc.exists()) {
          throw new Error('El equipo al que intentas unirte ya no existe.');
        }

        const batch = writeBatch(db);
        
        // Add user to team's memberIds
        batch.update(teamRef, {
          memberIds: arrayUnion(user.uid)
        });

        // Update invitation status
        const invitationRef = doc(db, 'invitations', invitationId);
        batch.update(invitationRef, {
          status: 'completed',
          completedAt: new Date(),
        });

        await batch.commit();
        
        toast({
          title: `¡Te has unido a ${invitation.teamName}!`,
          description: 'Ahora eres miembro del cuerpo técnico.',
        });

        setStatus('success');
        router.push(`/equipos/${invitation.teamId}`);

      } catch (error: any) {
        setStatus('error');
        setErrorMessage(error.message || 'Ha ocurrido un error al aceptar la invitación.');
        toast({
          variant: 'destructive',
          title: 'Error al unirse al equipo',
          description: error.message,
        });
      }
    };

    acceptInvitation();

  }, [user, loadingAuth, invitation, loadingInvitation, invitationId, router, toast]);

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Verificando invitación...</p>
          </>
        );
      case 'invalid':
      case 'error':
        return (
          <>
            <TriangleAlert className="h-8 w-8 text-destructive" />
            <p className="mt-4 text-destructive">{errorMessage}</p>
            <Button asChild className="mt-4">
              <Link href="/panel">Volver al Panel</Link>
            </Button>
          </>
        );
       case 'already_member':
        return (
            <>
                <ShieldCheck className="h-8 w-8 text-green-500" />
                <p className="mt-4 text-muted-foreground">Ya eres miembro de este equipo.</p>
                <Button asChild className="mt-4" onClick={() => router.push(`/equipos/${invitation.teamId}`)}>
                    Ir al Equipo
                </Button>
            </>
        );
      case 'success':
         return (
            <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">¡Unido con éxito! Redirigiendo al equipo...</p>
            </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Aceptar Invitación</CardTitle>
          <CardDescription>
            {invitation ? `Te han invitado a unirte al equipo "${invitation.teamName}".` : 'Procesando invitación...'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center p-8">
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
