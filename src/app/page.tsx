import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, User } from 'lucide-react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-background p-4 sm:p-8">
      <div className="text-center w-full max-w-4xl">
        <h1 className="font-headline text-5xl md:text-7xl font-bold tracking-tight mb-4 text-foreground">
          LaPizarra
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-muted-foreground mb-12">
          Tu compañero definitivo para el entrenamiento de fútbol sala. Descubre cientos de ejercicios, diseña sesiones de entrenamientos, gestiona tu equipo y analiza su rendimiento.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="border-primary border-2 flex flex-col">
            <CardHeader>
              <CardTitle className="font-headline text-2xl text-primary">¡Potencia Tu Entrenamiento!</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-muted-foreground">
                Suscríbete a uno de los planes para acceder al catálogo completo de ejercicios y desbloquear las herramientas avanzadas de gestión de equipos.
              </p>
            </CardContent>
            <div className="p-6 pt-0">
              <Button asChild className="w-full bg-primary text-white hover:bg-primary/90">
                <Link href="/planes">
                  Ver Planes <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Card>
          
          <Card className="flex flex-col text-center">
             <CardHeader>
               <div className="flex items-center justify-center gap-3">
                <User className="w-6 h-6 text-muted-foreground" />
                <CardTitle className="font-headline text-2xl text-foreground">Acceso de Usuario</CardTitle>
               </div>
              <p className="text-muted-foreground pt-2">Regístrate para una prueba de 30 días</p>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="font-semibold mb-2 text-foreground">Con tu cuenta gratuita, podrás:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground inline-block mx-auto text-left">
                <li>Explorar el catálogo completo de ejercicios.</li>
                <li>Guardar tus ejercicios favoritos.</li>
                <li>Crear y gestionar sesiones de entrenamiento.</li>
                <li>Analizar las estadísticas de los partidos de tu equipo.</li>
              </ul>
            </CardContent>
            <div className="p-6 pt-0">
              <Button variant="outline" asChild className="w-full">
                <Link href="/login">
                  Regístrate o Inicia Sesión <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
