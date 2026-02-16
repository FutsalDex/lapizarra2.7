

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Shield, Gift, Upload, UserCog, Star, Megaphone } from 'lucide-react';
import Link from 'next/link';
import AuthGuard from '@/components/auth/AuthGuard';

const adminItems = [
  {
    icon: <UserCog className="w-8 h-8 text-primary" />,
    title: 'Gestión de Usuarios',
    description: 'Activa y gestiona las suscripciones de todos los usuarios.',
    buttonText: 'Ir a Gestión de Usuarios',
    href: '/admin/users',
  },
  {
    icon: <Gift className="w-8 h-8 text-primary" />,
    title: 'Gestión de Invitaciones',
    description: 'Revisa y aprueba las invitaciones de usuarios para el programa de puntos.',
    buttonText: 'Ir a Gestión de Invitaciones',
    href: '/admin/invitations',
  },
  {
    icon: <Star className="w-8 h-8 text-primary" />,
    title: 'Gestión de Suscripciones',
    description: 'Consulta puntos, referidos y actividad de los usuarios en el programa de fidelización.',
    buttonText: 'Ir a Suscripciones',
    href: '/admin/suscripciones',
  },
  {
    icon: <Megaphone className="w-8 h-8 text-primary" />,
    title: 'Gestión de Notificaciones',
    description: 'Envía y gestiona notificaciones para todos los usuarios de la plataforma.',
    buttonText: 'Ir a Notificaciones',
    href: '/admin/notifications',
  },
    {
    icon: <Shield className="w-8 h-8 text-primary" />,
    title: 'Gestión de Equipos',
    description: 'Visualiza y gestiona todos los equipos creados en la plataforma.',
    buttonText: 'Ir a Gestión de Equipos',
    href: '/admin/equipos',
  },
  {
    icon: <Upload className="w-8 h-8 text-primary" />,
    title: 'Gestión de Ejercicios',
    description: 'Añade ejercicios a la biblioteca, individualmente o en lote.',
    buttonText: 'Ir a Gestión de Ejercicios',
    href: '/admin/ejercicios',
  },
];

export default function AdminPage() {
  return (
    <AuthGuard>
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary">Panel de Administración</h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
            Bienvenido, Francisco.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {adminItems.map((item) => (
            <Card key={item.title} className="flex flex-col">
              <CardHeader>
                  <div className="bg-muted rounded-lg w-14 h-14 flex items-center justify-center mb-4">
                      {item.icon}
                  </div>
                <CardTitle className="font-headline text-xl">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-muted-foreground">{item.description}</p>
              </CardContent>
              <CardFooter>
                <Button asChild variant="default" className="w-full">
                  <Link href={item.href}>
                    {item.buttonText}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </AuthGuard>
  );
}
