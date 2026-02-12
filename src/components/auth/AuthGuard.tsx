'use client';

import { useAuthState } from 'react-firebase-hooks/auth';
import { getAuth } from 'firebase/auth';
import { app } from '@/firebase/config';
import { Loader2, Lock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const auth = getAuth(app);

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
        <div className="container mx-auto px-4 py-16 flex items-center justify-center">
            <Card className="max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto bg-muted rounded-full p-3 w-fit mb-2">
                        <Lock className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle>Contenido Protegido</CardTitle>
                    <CardDescription>
                        Esta sección es solo para usuarios registrados.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Para acceder a esta y otras funciones avanzadas, por favor, inicia sesión o crea una cuenta gratuita.
                    </p>
                </CardContent>
                <CardFooter className="flex gap-4">
                    <Button asChild className="w-full">
                        <Link href="/login">Iniciar Sesión</Link>
                    </Button>
                    <Button variant="secondary" asChild className="w-full">
                         <Link href="/registro">Registrarse</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
  }

  return <>{children}</>;
}
