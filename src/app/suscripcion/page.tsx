"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileText, Users, Star, Euro, Calendar, Gift, Award } from "lucide-react";
import Link from "next/link";
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection, useDocumentData } from 'react-firebase-hooks/firestore';
import { collection, query, where, doc, getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '@/firebase/config';
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import AuthGuard from "@/components/auth/AuthGuard";
import { format } from "date-fns";
import { es } from 'date-fns/locale';

const auth = getAuth(app);
const db = getFirestore(app);

export default function SuscripcionPage() {
  const [user, loadingAuth] = useAuthState(auth);
  const [userProfile, loadingProfile] = useDocumentData(user ? doc(db, 'users', user.uid) : null);

  const exercisesQuery = user ? query(collection(db, 'exercises'), where('userId', '==', user.uid)) : null;
  const [exercisesSnapshot, loadingExercises] = useCollection(exercisesQuery);

  const invitationsQuery = user && user.email ? query(collection(db, 'invitations'), where('inviterEmail', '==', user.email), where('isApproved', '==', true)) : null;
  const [invitationsSnapshot, loadingInvitations] = useCollection(invitationsQuery);
  
  const uploadedExercises = useMemo(() => exercisesSnapshot?.docs.length || 0, [exercisesSnapshot]);
  const successfulInvites = useMemo(() => invitationsSnapshot?.docs.length || 0, [invitationsSnapshot]);

  const points = useMemo(() => (uploadedExercises * 10) + (successfulInvites * 25), [uploadedExercises, successfulInvites]);
  const savings = useMemo(() => points * (2.50 / 75), [points]);
  
  const userPlan = userProfile?.subscription || 'N/A';
  const planPrice = userPlan === 'Pro' ? 39.95 : userPlan === 'Básico' ? 19.95 : 0;
  const finalPrice = Math.max(0, planPrice - savings).toFixed(2);
  const renewalDate = userProfile?.subscriptionEndDate ? format(userProfile.subscriptionEndDate.toDate(), 'dd/MM/yyyy') : 'N/A';
  
  const isLoading = loadingAuth || loadingProfile || loadingExercises || loadingInvitations;

  return (
    <AuthGuard>
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold font-headline text-primary">Programa de Fidelización</h1>
          <p className="text-base md:text-lg text-muted-foreground mt-2 max-w-3xl mx-auto">
            Aporta ejercicios (10 pts) o invita amigos (25 pts) y canjea tus puntos por meses gratis.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ejercicios</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{uploadedExercises}</div>}
                <p className="text-xs text-muted-foreground">{uploadedExercises * 10} puntos</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Amigos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{successfulInvites}</div>}
                <p className="text-xs text-muted-foreground">{successfulInvites * 25} puntos</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Puntos</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                 {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{points}</div>}
                <p className="text-xs text-muted-foreground">¡Sigue sumando!</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ahorro</CardTitle>
                <Euro className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                 {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{savings.toFixed(2)} €</div>}
                <p className="text-xs text-muted-foreground">{userPlan} Plan</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Mi Plan</CardTitle>
                 <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{userPlan}</div>}
                { !isLoading && userPlan !== 'N/A' && <p className="text-xs text-muted-foreground">Vence {renewalDate}</p> }
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Renovación</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{renewalDate}</div>}
                { !isLoading && userPlan !== 'N/A' && <p className="text-xs text-muted-foreground">{userPlan} Plan</p> }
              </CardContent>
            </Card>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Gift className="w-6 h-6 text-primary" />
                <CardTitle className="font-headline text-xl md:text-2xl">Invita a tus Amigos</CardTitle>
              </div>
               <p className="text-muted-foreground pt-2 text-sm md:text-base">Gana 25 puntos si se suscriben. Introduce su email para generar un mensaje de WhatsApp.</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <Input type="email" placeholder="Email del amigo" className="flex-grow" />
                <Button className="w-full sm:w-auto">Invitar por WhatsApp</Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
              <CardHeader>
                  <div className="flex items-center gap-3">
                      <Award className="w-6 h-6 text-primary" />
                      <CardTitle className="font-headline text-xl md:text-2xl">Renovación de Suscripción</CardTitle>
                  </div>
                  <CardDescription className="pt-2 text-sm md:text-base">Aquí puedes ver el estado de tu próxima renovación y el ahorro conseguido.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="border rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex-grow">
                          <p className="font-semibold">Precio renovación Plan {userPlan} (anual)</p>
                          <p className="text-sm text-muted-foreground">Descuento por puntos acumulados</p>
                      </div>
                      <div className="text-right">
                          <p className="line-through text-muted-foreground">{planPrice.toFixed(2)}€</p>
                          <p className="text-destructive font-semibold">-{savings.toFixed(2)}€</p>
                      </div>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-between">
                      <p className="font-bold text-lg">Total a pagar</p>
                      <p className="font-bold text-lg text-primary">{finalPrice}€</p>
                  </div>
              </CardContent>
              <CardFooter>
                   <Button asChild className="w-full">
                      <Link href="/planes">
                          Instrucciones de Pago
                      </Link>
                  </Button>
              </CardFooter>
          </Card>

        </div>
      </div>
    </AuthGuard>
  );
}
