"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lightbulb, Loader2 } from 'lucide-react';
import { exercises, Exercise } from '@/lib/data';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import AuthGuard from '@/components/auth/AuthGuard';

export default function IaPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Exercise[]>([]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setResults([]);

    // Simulate AI call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate getting 3 random exercises as results
    const shuffled = [...exercises].sort(() => 0.5 - Math.random());
    setResults(shuffled.slice(0, 3));

    setLoading(false);
  };

  return (
    <AuthGuard>
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold font-headline">Asistente Táctico con IA</h1>
          <p className="text-lg text-muted-foreground mt-2">Introduce los datos de tu último partido para recibir sugerencias.</p>
        </div>

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Analizar Rendimiento</CardTitle>
              <CardDescription>
                La IA analizará estos puntos para sugerir ejercicios que mejoren las debilidades de tu equipo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="goalsConceded">Goles en contra</Label>
                    <Input id="goalsConceded" type="number" placeholder="Ej: 4" />
                  </div>
                  <div>
                    <Label htmlFor="shotsMissed">Tiros fallados</Label>
                    <Input id="shotsMissed" type="number" placeholder="Ej: 12" />
                  </div>
                  <div>
                    <Label htmlFor="possessionLost">Pérdidas de balón</Label>
                    <Input id="possessionLost" type="number" placeholder="Ej: 25" />
                  </div>
                  <div>
                    <Label htmlFor="mainProblem">Principal problema (opcional)</Label>
                    <Input id="mainProblem" placeholder="Ej: Mala salida de presión" />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analizando...
                    </>
                  ) : (
                    <>
                      <Lightbulb className="mr-2 h-4 w-4" />
                      Generar Sugerencias
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {results.length > 0 && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold font-headline text-center mb-4">Ejercicios Recomendados</h2>
              <div className="space-y-4">
                {results.map(exercise => (
                  <Card key={exercise.id} className="overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col md:flex-row">
                      <div className="relative h-48 md:h-auto md:w-1/3">
                        <Image
                          src={exercise.imageUrl}
                          alt={exercise.title}
                          fill
                          className="object-cover"
                          data-ai-hint={exercise.imageHint}
                        />
                      </div>
                    <div className='p-6 flex-grow flex flex-col'>
                      <div className="flex justify-between items-start mb-2">
                        <CardTitle className="font-headline text-xl">{exercise.title}</CardTitle>
                        <Badge variant={exercise.intensity === 'Alta' ? 'destructive' : exercise.intensity === 'Media' ? 'secondary' : 'default'}>
                          {exercise.intensity}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm mb-4">{exercise.description}</p>
                      <div className="mt-auto pt-4">
                        <Badge variant="outline">{exercise.category}</Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
