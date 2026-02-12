
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Shield, Calendar, BookUser, BarChart3, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import AuthGuard from '@/components/auth/AuthGuard';

const panelItems = [
  {
    icon: <Shield className="w-8 h-8 text-primary" />,
    title: 'Mis Equipos',
    description: 'Crea nuevos equipos y accede a sus paneles de control.',
    buttonText: 'Ir a Mis Equipos',
    href: '/equipos',
  },
  {
    icon: <Calendar className="w-8 h-8 text-primary" />,
    title: 'Mis Sesiones',
    description: 'Encuentra y organiza todas las sesiones de entrenamiento que has creado manually.',
    buttonText: 'Ir a Mis Sesiones',
    href: '/sesiones',
  },
  {
    icon: <BookUser className="w-8 h-8 text-primary" />,
    title: 'Mis Ejercicios',
    description: 'Aporta ejercicios a la comunidad, gestiónalos y gana puntos para tu suscripción.',
    buttonText: 'Ir a Mis Ejercicios',
    href: '/ejercicios/mis-ejercicios',
  },
  {
    icon: <BarChart3 className="w-8 h-8 text-primary" />,
    title: 'Marcador Rápido',
    description: 'Usa un marcador con crono para un partido rápido o una sesión de entrenamiento.',
    buttonText: 'Ir a Marcador Rápido',
    href: '/marcador',
  },
  {
    icon: <MessageSquare className="w-8 h-8 text-primary" />,
    title: 'Soporte Técnico',
    description: 'Chatea con Míster Global, nuestro entrenador por IA, para resolver tus dudas tácticas.',
    buttonText: 'Chatear con el Míster',
    href: '/soporte',
    disabled: false,
  },
];

export default function PanelPage() {
  return (
    <AuthGuard>
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary">Panel de Mi Equipo</h1>
          <p className="text-lg text-muted-foreground mt-4 max-w-2xl mx-auto">
            Bienvenido, Francisco. Aquí tienes el centro de mando para tu equipo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {panelItems.map((item) => (
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
                <Button asChild variant="default" className="w-full" disabled={item.disabled}>
                  <Link href={item.href}>
                    {item.buttonText}
                    {!item.disabled && <ArrowRight className="ml-2 h-4 w-4" />}
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
