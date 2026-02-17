"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, BarChart3, CalendarCheck2, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from 'next/navigation';
import AuthGuard from '@/components/auth/AuthGuard';
import { useDocumentData } from 'react-firebase-hooks/firestore';
import { doc, getFirestore } from 'firebase/firestore';
import { app } from '@/firebase/config';
import { Skeleton } from "@/components/ui/skeleton";

const db = getFirestore(app);

export default function EquipoPanelPage() {
    const params = useParams();
    const teamId = params.id as string;
    const [team, loading, error] = useDocumentData(teamId ? doc(db, 'teams', teamId) : null);
    
    const teamName = team?.name || "Equipo";

    const panelItems = [
        {
          icon: <Users className="w-8 h-8 text-primary" />,
          title: 'Mi Plantilla',
          description: 'Gestiona los jugadores del equipo.',
          href: `/equipos/${params.id}/plantilla`,
        },
        {
          icon: <Trophy className="w-8 h-8 text-primary" />,
          title: 'Mis Partidos',
          description: 'Planifica y revisa los resultados de los partidos.',
          href: '/partidos',
        },
        {
          icon: <CalendarCheck2 className="w-8 h-8 text-primary" />,
          title: 'Control de Asistencia',
          description: 'Controla la asistencia a los entrenamientos.',
          href: `/equipos/${params.id}/asistencia`,
        },
        {
          icon: <BarChart3 className="w-8 h-8 text-primary" />,
          title: 'Mis Estadísticas',
          description: 'Analiza el rendimiento del equipo y los jugadores.',
          href: `/equipos/${params.id}/estadisticas`,
        },
      ];

  return (
    <AuthGuard>
      <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
              <Button variant="outline" asChild>
              <Link href="/equipos">
                  <ArrowLeft className="mr-2" />
                  Volver a Mis Equipos
              </Link>
              </Button>
          </div>

          <div className="text-left mb-12">
            {loading ? (
                <div className="space-y-4">
                    <Skeleton className="h-12 w-1/2" />
                    <Skeleton className="h-6 w-3/4" />
                </div>
            ) : (
              <>
                <h1 className="text-4xl md:text-5xl font-bold font-headline text-foreground">Panel de {teamName}</h1>
                <p className="text-lg text-muted-foreground mt-4 max-w-2xl">
                Selecciona una sección para empezar a gestionar tu equipo.
                </p>
              </>
            )}
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
                  <Button asChild variant="default" className="w-full">
                      <Link href={item.href}>
                      Acceder
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
