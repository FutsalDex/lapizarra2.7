"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Trash2, Loader2 } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { clearIndexedDbPersistence, getFirestore } from "firebase/firestore";
import { app } from "@/firebase/config";

const db = getFirestore(app);

export default function PerfilPage() {
  const { toast } = useToast();
  const [isClearing, setIsClearing] = useState(false);

  const handleClearCache = async () => {
    setIsClearing(true);
    toast({
        title: "Limpiando caché...",
        description: "Esto puede tardar un momento. La página se recargará al finalizar.",
    });
    try {
        await clearIndexedDbPersistence(db);
        toast({
            title: "Caché limpiada con éxito",
            description: "Los datos locales de la aplicación han sido eliminados.",
        });
        // Reload the page to re-initialize the state from a clean slate
        setTimeout(() => {
            window.location.reload();
        }, 2000);
    } catch (error: any) {
        console.error("Error clearing cache: ", error);
        toast({
            variant: "destructive",
            title: "Error al limpiar la caché",
            description: "No se pudo limpiar la caché. Intenta hacerlo manualmente desde la configuración de tu navegador.",
        });
        setIsClearing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold font-headline">Mi Perfil</h1>
        <p className="text-lg text-muted-foreground mt-2">Gestiona tu información personal y la configuración de tu cuenta.</p>
      </div>

      <Tabs defaultValue="personal" className="max-w-2xl mx-auto">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personal">Datos Personales</TabsTrigger>
          <TabsTrigger value="seguridad">Seguridad</TabsTrigger>
          <TabsTrigger value="avanzado">Avanzado</TabsTrigger>
        </TabsList>
        <TabsContent value="personal">
          <Card>
            <CardHeader>
                <CardTitle>Información de la Cuenta</CardTitle>
                <CardDescription>Estos datos son visibles para otros miembros de tus equipos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" defaultValue="Francisco" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" defaultValue="futsaldex@gmail.com" disabled />
                <p className="text-xs text-muted-foreground">No puedes cambiar tu dirección de correo electrónico.</p>
              </div>
               <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="suscripcion">Suscripción</Label>
                        <Input id="suscripcion" defaultValue="Pro" disabled />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="fin-suscripcion">Fin de la Suscripción</Label>
                        <Input id="fin-suscripcion" defaultValue="1 de octubre de 2026" disabled />
                    </div>
               </div>
              <div className="flex justify-end">
                <Button>
                  <Save className="mr-2 h-4 w-4" />
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
                Para mayor seguridad, te recomendamos que uses una contraseña única.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Contraseña Actual</Label>
                <Input id="current-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Nueva Contraseña</Label>
                <Input id="new-password" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
                <Input id="confirm-password" type="password" />
              </div>
               <div className="flex justify-end pt-4">
                    <Button>
                      <Save className="mr-2 h-4 w-4" />
                      Cambiar Contraseña
                    </Button>
                  </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="avanzado">
            <Card>
                <CardHeader>
                    <CardTitle>Gestión de Datos Locales</CardTitle>
                    <CardDescription>
                        Si la aplicación funciona lento o encuentras errores, limpiar los datos almacenados en tu navegador puede ayudar.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        Esta acción eliminará la caché local de Firestore. No borrará ningún dato de tu cuenta en la nube, pero la aplicación necesitará volver a descargar los datos la próxima vez que la uses.
                    </p>
                </CardContent>
                <CardFooter>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={isClearing}>
                                {isClearing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                Limpiar Caché Local
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción es irreversible y recargará la página para aplicar los cambios.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleClearCache}>Sí, limpiar datos</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardFooter>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
