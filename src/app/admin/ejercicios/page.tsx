
"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, List, Upload } from 'lucide-react';
import Link from 'next/link';
import AuthGuard from '@/components/auth/AuthGuard';

const exerciseOptions = [
  {
    icon: <Upload className="w-8 h-8 text-primary" />,
    title: 'Alta de Ejercicios',
    description: 'Añade ejercicios a la biblioteca de forma individual.',
    buttonText: 'Acceder',
    href: '/ejercicios/mis-ejercicios',
  },
  {
    icon: <List className="w-8 h-8 text-primary" />,
    title: 'Listado de Ejercicios',
    description: 'Visualiza y explora todos los ejercicios de la biblioteca pública.',
    buttonText: 'Acceder',
    href: '/admin/ejercicios/biblioteca',
  },
];

export default function GestionEjerciciosPage() {
  return (
    <AuthGuard>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="outline" asChild>
            <Link href="/admin">
              <ArrowLeft className="mr-2" />
              Volver al Panel de Admin
            </Link>
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold font-headline text-primary">Gestión de Ejercicios</h1>
          <p className="text-lg text-muted-foreground mt-2">
            Selecciona una opción para gestionar la biblioteca de ejercicios.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {exerciseOptions.map((item) => (
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
