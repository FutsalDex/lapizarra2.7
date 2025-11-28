
"use client";

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, getDocs, or, Timestamp, getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { app } from '@/firebase/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { ArrowLeft, Calendar as CalendarIcon, Loader2, Trophy, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const db = getFirestore(app);
const auth = getAuth(app);

type Event = {
  date: Date;
  type: 'session' | 'match';
  title: string;
  details: string;
  link: string;
};

export default function EventosPage() {
  const [user, loadingAuth] = useAuthState(auth);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!user) {
        setLoadingEvents(false);
        return;
      }

      try {
        setLoadingEvents(true);
        
        // 1. Get user's teams
        const teamsQuery1 = query(collection(db, 'teams'), where('ownerId', '==', user.uid));
        const teamsQuery2 = query(collection(db, 'teams'), where('memberIds', 'array-contains', user.uid));
        
        const [ownedTeamsSnapshot, memberTeamsSnapshot] = await Promise.all([
          getDocs(teamsQuery1),
          getDocs(teamsQuery2)
        ]);

        const teamIds = new Set<string>();
        ownedTeamsSnapshot.forEach(doc => teamIds.add(doc.id));
        memberTeamsSnapshot.forEach(doc => teamIds.add(doc.id));
        const userTeamIds = Array.from(teamIds);

        // 2. Fetch matches and sessions
        let matches: any[] = [];
        let sessions: any[] = [];
        
        const sessionPromises: Promise<any>[] = [getDocs(query(collection(db, 'sessions'), where('userId', '==', user.uid)))];
        if (userTeamIds.length > 0) {
            sessionPromises.push(getDocs(query(collection(db, 'sessions'), where('teamId', 'in', userTeamIds))));
            const matchesQuery = query(collection(db, 'matches'), where('teamId', 'in', userTeamIds));
            const matchesSnapshot = await getDocs(matchesQuery);
            matches = matchesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

        const sessionSnapshots = await Promise.all(sessionPromises);
        const sessionDocs = new Map<string, any>();
        sessionSnapshots.forEach(snapshot => {
            snapshot.docs.forEach(doc => {
                if (!sessionDocs.has(doc.id)) {
                    sessionDocs.set(doc.id, { id: doc.id, ...doc.data() });
                }
            });
        });
        sessions = Array.from(sessionDocs.values());


        // 3. Format events
        const formattedEvents: Event[] = [
          ...sessions.map((s: any) => ({
            date: (s.date as Timestamp).toDate(),
            type: 'session' as const,
            title: 'Sesión de entrenamiento:',
            details: s.name || `Sesión del ${format((s.date as Timestamp).toDate(), 'P')}`,
            link: `/sesiones/${s.id}`
          })),
          ...matches.map((m: any) => ({
            date: (m.date as Timestamp).toDate(),
            type: 'match' as const,
            title: 'Partido:',
            details: `${m.localTeam} vs ${m.visitorTeam}`,
            link: `/partidos/${m.id}`
          }))
        ];
        
        setAllEvents(formattedEvents);

      } catch (error) {
        console.error("Error fetching events: ", error);
      } finally {
        setLoadingEvents(false);
      }
    };

    if (!loadingAuth) {
      fetchEvents();
    }
  }, [user, loadingAuth]);

  const matchDates = allEvents.filter(e => e.type === 'match').map(e => e.date);
  const sessionDates = allEvents.filter(e => e.type === 'session').map(e => e.date);
  const selectedEvents = date ? allEvents.filter(e => e.date.toDateString() === date.toDateString()) : [];

  const isLoading = loadingAuth || loadingEvents;

  return (
    <div className="container mx-auto px-4 py-8">
      <style>{`
        .session-day {
          border: 1px solid hsl(var(--primary));
          background-color: transparent;
          color: hsl(var(--foreground));
        }
        .match-day {
            background-color: hsl(var(--primary) / 0.2);
        }
        .rdp-day_today:not(.rdp-day_outside) {
            font-weight: bold;
            background-color: hsl(var(--accent));
        }
        .session-day.rdp-day_today:not(.rdp-day_outside) {
             background-color: hsl(var(--accent));
             border: 1px solid hsl(var(--primary));
        }
         .match-day.rdp-day_today:not(.rdp-day_outside) {
             background-color: hsl(var(--primary) / 0.4);
        }

      `}</style>
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link href="/panel">
            <ArrowLeft className="mr-2" />
            Volver al Panel
          </Link>
        </Button>
      </div>
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold font-headline text-primary">Mis Eventos</h1>
        <p className="text-lg text-muted-foreground mt-2">
          Tu calendario de partidos y sesiones de entrenamiento.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        <div className="md:col-span-2">
           <Card>
            {isLoading ? (
                <div className="p-4"><Skeleton className="w-full aspect-square" /></div>
            ) : (
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="p-0 flex justify-center"
                    locale={es}
                    weekStartsOn={1}
                    modifiers={{ 
                        matches: matchDates,
                        sessions: sessionDates,
                    }}
                    modifiersClassNames={{
                        matches: 'match-day',
                        sessions: 'session-day',
                    }}
                />
            )}
           </Card>
        </div>
        <div className="md:col-span-1">
          <Card>
            <CardContent className="p-6">
              {isLoading ? (
                 <div className="flex items-center justify-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-4 text-sm text-muted-foreground">
                      <CalendarIcon className="w-5 h-5"/>
                      <p>{date ? format(date, 'EEEE, dd MMMM yyyy', { locale: es }) : 'Selecciona una fecha'}</p>
                  </div>
                  
                  {selectedEvents.length > 0 ? (
                    <div className="space-y-4">
                      {selectedEvents.map((event, index) => (
                        <div key={index} className="p-3 bg-muted/50 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                                {event.type === 'match' ? <Trophy className="w-4 h-4 text-primary" /> : <ClipboardList className="w-4 h-4 text-primary" />}
                                <p className="font-semibold text-sm">{event.title}</p>
                            </div>
                            <p className="text-muted-foreground text-sm truncate">{event.details}</p>
                            <Link href={event.link} className="text-primary hover:underline text-xs font-semibold">
                              Ver detalles completos
                            </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-10">No hay eventos para este día.</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
