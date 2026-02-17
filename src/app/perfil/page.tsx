"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Loader2 } from "lucide-react";
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { getAuth, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { app } from '@/firebase/config';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from "@/components/ui/skeleton";
import AuthGuard from "@/components/auth/AuthGuard";
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

const auth = getAuth(app);
const db = getFirestore(app);

export default function PerfilPage() {
  const [user, loadingAuth] = useAuthState(auth);
  const [userProfile, loadingProfile] = useDocumentData(user ? doc(db, 'users', user.uid) : null);
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
    }
  }, [user]);

  const handleProfileUpdate = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      // Update Firebase Auth profile
      await updateProfile(user, { displayName });
      // Update Firestore profile
      await updateDoc(doc(db, 'users', user.uid), { displayName });

      toast({
        title: "Perfil actualizado",
        description: "Tu nombre se ha guardado correctamente.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al actualizar",
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordReset = () => {
    if (!user?.email) return;
    sendPasswordResetEmail(auth, user.email)
      .then(() => {
        toast({
          title: "Correo enviado",
          description: "Revisa tu bandeja de entrada para restablecer tu contraseña.",
        });
      })
      .catch((error) => {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message,
        });
      });
  };

  const isLoading = loadingAuth || loadingProfile;

  const subscriptionEndDate = userProfile?.subscriptionEndDate
    ? format(userProfile.subscriptionEndDate.toDate(), "d 'de' MMMM 'de' yyyy", { locale: es })
    : 'N/A';

  return (
    <AuthGuard>
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold font-headline">Mi Perfil</h1>
          <p className="text-lg text-muted-foreground mt-2">Gestiona tu información personal y la configuración de tu cuenta.</p>
        </div>

        <Tabs defaultValue="personal" className="max-w-2xl mx-auto">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="personal">Datos Personales</TabsTrigger>
            <TabsTrigger value="seguridad">Seguridad</TabsTrigger>
          </TabsList>
          <TabsContent value="personal">
            <Card>
              <CardHeader>
                  <CardTitle>Información de la Cuenta</CardTitle>
                  <CardDescription>Estos datos son visibles para otros miembros de tus equipos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoading ? (
                  <div className="space-y-6">
                    <div className="space-y-2"><Label>Nombre</Label><Skeleton className="h-10 w-full" /></div>
                    <div className="space-y-2"><Label>Email</Label><Skeleton className="h-10 w-full" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Suscripción</Label><Skeleton className="h-10 w-full" /></div>
                      <div className="space-y-2"><Label>Fin de la Suscripción</Label><Skeleton className="h-10 w-full" /></div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre</Label>
                      <Input id="nombre" value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={isSaving} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" value={user?.email || ''} disabled />
                      <p className="text-xs text-muted-foreground">No puedes cambiar tu dirección de correo electrónico.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                              <Label htmlFor="suscripcion">Suscripción</Label>
                              <Input id="suscripcion" value={userProfile?.subscription || 'N/A'} disabled />
                          </div>
                          <div className="space-y-2">
                              <Label htmlFor="fin-suscripcion">Fin de la Suscripción</Label>
                              <Input id="fin-suscripcion" value={subscriptionEndDate} disabled />
                          </div>
                    </div>
                  </>
                )}
                <div className="flex justify-end">
                  <Button onClick={handleProfileUpdate} disabled={isLoading || isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar Cambios
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="seguridad">
            <Card>
              <CardHeader>
                <CardTitle>Cambiar Contraseña</CardTitle>
                <CardDescription>
                  Recibirás un correo electrónico para restablecer tu contraseña.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">Enviar correo de restablecimiento</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Confirmar envío?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Se enviará un correo a <strong>{user?.email}</strong> con las instrucciones para cambiar tu contraseña.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handlePasswordReset}>Sí, enviar correo</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AuthGuard>
  );
}
