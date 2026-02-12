
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, BarChart3, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from 'next/navigation';
import AuthGuard from '@/components/auth/AuthGuard';

export default function EstadisticasPage() {
    const params = useParams();
    const teamId = params.id as string;

    const statsOptions = [
        {
          icon: <Trophy className="w-8 h-8 text-primary" />,
          title: 'Estadísticas del Equipo',
          description: 'Resumen del rendimiento en partidos: victorias, derrotas, goles a favor, goles en contra y más métricas globales.',
          href: `/equipos/${teamId}/estadisticas/team-stats`,
        },
        {
          icon: <Users className="w-8 h-8 text-primary" />,
          title: 'Estadísticas de Jugadores',
          description: 'Consulta las estadísticas individuales de todos los jugadores de tu plantilla: goles, asistencias, tarjetas y más.',
          href: `/equipos/${teamId}/estadisticas/player-stats`,
        },
    ];

  return (
    <AuthGuard>
      <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                  <div className="bg-muted p-3 rounded-full">
                      <BarChart3 className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                      <h1 className="text-4xl font-bold font-headline">Estadísticas</h1>
                      <p className="text-lg text-muted-foreground mt-1">Selecciona qué estadísticas del equipo quieres consultar.</p>
                  </div>
              </div>
              <Button variant="outline" asChild>
                  <Link href={`/equipos/${teamId}`}>
                      <ArrowLeft className="mr-2" />
                      Volver al Panel
                  </Link>
              </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {statsOptions.map((item) => (
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
                      Ver Estadísticas
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
