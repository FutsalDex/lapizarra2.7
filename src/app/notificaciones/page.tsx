
"use client";

import { useCollection, useDocumentData } from 'react-firebase-hooks/firestore';
import { collection, query, where, orderBy, getFirestore, doc, Timestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getAuth } from 'firebase/auth';
import { app } from '@/firebase/config';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import AuthGuard from '@/components/auth/AuthGuard';
import { ArrowLeft, Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useMemo, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const db = getFirestore(app);
const auth = getAuth(app);

const NOTIFICATIONS_PER_PAGE = 5;

type Notification = {
    id: string;
    title: string;
    message: string;
    createdAt: any; // Firestore Timestamp or Date
    target: 'all' | 'Pro' | 'Básico' | 'trial';
};

export default function NotificacionesPage() {
    const [user, loadingAuth] = useAuthState(auth);
    const pathname = usePathname();
    
    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    const [userProfile, loadingProfile] = useDocumentData(isClient && user ? doc(db, 'users', user.uid) : null);

    const notificationsQuery = isClient ? query(
        collection(db, 'notifications'), 
        where('active', '==', true), 
        orderBy('createdAt', 'desc')
    ) : null;

    const [notificationsSnapshot, loadingNotifications, error] = useCollection(notificationsQuery);

    const [currentPage, setCurrentPage] = useState(1);

    const notifications = useMemo(() => {
        if (!isClient || loadingAuth || loadingProfile || loadingNotifications || !user || !userProfile) {
            return [];
        }

        const infoNotifications: Notification[] = [];
        
        let trialDays = 0;
        if (!userProfile.subscription && userProfile.createdAt) {
            try {
                const creationDate = userProfile.createdAt.toDate ? userProfile.createdAt.toDate() : new Date(userProfile.createdAt);
                const trialEndDate = new Date(creationDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                trialDays = differenceInDays(trialEndDate, new Date());
            } catch (e) {}
        }
        
        if (userProfile.subscription && userProfile.subscriptionEndDate) {
            const expiryDate = userProfile.subscriptionEndDate.toDate();
            const daysToExpiry = differenceInDays(expiryDate, new Date());

            if (daysToExpiry <= 15 && daysToExpiry >= 0) {
                infoNotifications.push({
                    id: 'expiry-warning',
                    title: 'Tu suscripción vence pronto',
                    message: `Tu suscripción vence en ${daysToExpiry} día(s).`,
                    createdAt: Timestamp.now(),
                    target: userProfile.subscription,
                });
            }
        }

        const userPlan = userProfile.subscription;
        const isTrial = !userPlan && trialDays > 0;

        const adminNotifications = notificationsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification))
          .filter(notif => {
            if (notif.target === 'all') return true;
            if (isTrial && notif.target === 'trial') return true;
            if (userPlan && notif.target === userPlan) return true;
            return false;
        }) || [];
        
        return [...infoNotifications, ...adminNotifications].sort((a, b) => {
            const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date();
            const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date();
            return dateB.getTime() - dateA.getTime();
        });

    }, [isClient, notificationsSnapshot, user, userProfile, loadingAuth, loadingProfile, loadingNotifications]);
    
    const isLoading = !isClient || loadingAuth || loadingProfile || loadingNotifications;

    const totalPages = Math.ceil(notifications.length / NOTIFICATIONS_PER_PAGE);
    const paginatedNotifications = notifications.slice(
        (currentPage - 1) * NOTIFICATIONS_PER_PAGE,
        currentPage * NOTIFICATIONS_PER_PAGE
    );

    const handleNextPage = () => {
        if (currentPage < totalPages) {
          setCurrentPage(currentPage + 1);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
    };

    return (
        <AuthGuard>
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="bg-muted p-3 rounded-full">
                            <Bell className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold font-headline">Notificaciones</h1>
                            <p className="text-lg text-muted-foreground mt-1">
                                Aquí puedes ver todos los avisos y novedades.
                            </p>
                        </div>
                    </div>
                     <Button variant="outline" asChild>
                        <Link href="/panel">
                            <ArrowLeft className="mr-2" />
                            Volver al Panel
                        </Link>
                    </Button>
                </div>

                <div className="max-w-3xl mx-auto space-y-4">
                    {isLoading && (
                        Array.from({ length: 3 }).map((_, i) => (
                            <Card key={i}>
                                <CardHeader>
                                    <Skeleton className="h-6 w-3/4" />
                                    <Skeleton className="h-4 w-1/4 mt-2" />
                                </CardHeader>
                                <CardContent>
                                    <Skeleton className="h-4 w-full" />
                                     <Skeleton className="h-4 w-5/6 mt-2" />
                                </CardContent>
                            </Card>
                        ))
                    )}
                    {!isLoading && paginatedNotifications.length > 0 && paginatedNotifications.map((notif) => (
                        <Card key={notif.id}>
                            <CardHeader>
                                <CardTitle>{notif.title}</CardTitle>
                                <CardDescription>
                                    {notif.createdAt ? format(notif.createdAt.toDate ? notif.createdAt.toDate() : notif.createdAt, "d 'de' MMMM 'de' yyyy", { locale: es }) : ''}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">{notif.message}</p>
                            </CardContent>
                        </Card>
                    ))}
                    {!isLoading && notifications.length === 0 && (
                        <div className="text-center py-16">
                            <p className="text-muted-foreground">No hay notificaciones para mostrar.</p>
                        </div>
                    )}
                    {error && <p className="text-destructive">Error: {error.message}</p>}
                </div>

                 {!isLoading && totalPages > 1 && (
                    <div className="flex items-center justify-center mt-8 space-x-2">
                        <Button variant="outline" size="icon" onClick={handlePrevPage} disabled={currentPage === 1}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            Página {currentPage} de {totalPages}
                        </span>
                        <Button variant="outline" size="icon" onClick={handleNextPage} disabled={currentPage === totalPages}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        </AuthGuard>
    );
}
