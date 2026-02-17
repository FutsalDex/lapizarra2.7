
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "../ui/button";
import { Menu, BookOpen, PenSquare, Star, LayoutDashboard, UserCog, Gift, Users, User, LogOut, LogIn, ClipboardList, Bell, Info } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState, useEffect } from "react";
import app from "@/firebase/config";
import { useAuthState } from "react-firebase-hooks/auth";
import { signOut, getAuth } from "firebase/auth";
import { FirebaseLogo } from "./logo";
import { useCollection, useDocumentData } from "react-firebase-hooks/firestore";
import { collection, query, where, getFirestore, doc, orderBy, Timestamp } from "firebase/firestore";
import { Skeleton } from "../ui/skeleton";
import { differenceInDays } from "date-fns";

const auth = getAuth(app);
const db = getFirestore(app);

const navLinks = [
  { href: "/ejercicios", label: "Ver ejercicios", icon: <BookOpen className="w-5 h-5"/> },
  { href: "/sesiones/crear", label: "Crear Sesión", icon: <PenSquare className="w-5 h-5"/> },
  { href: "/favoritos", label: "Favoritos", icon: <Star className="w-5 h-5"/> },
  { href: "/panel", label: "Mi Panel", icon: <LayoutDashboard className="w-5 h-5"/> },
];

const adminNavLinks = [
    { href: "/admin", label: "Panel Admin", icon: <UserCog className="w-5 h-5"/> },
]

const HeaderSkeleton = () => (
    <header className="sticky top-0 z-50 w-full border-b bg-primary text-primary-foreground">
        <div className="container flex h-16 items-center">
            <div className="mr-4 hidden md:flex">
                <Link href="/" className="mr-6 flex items-center space-x-2">
                    <span className="hidden font-bold sm:inline-block font-headline text-lg">
                    LaPizarra
                    </span>
                </Link>
                <nav className="flex items-center space-x-6 text-sm font-medium">
                    <Skeleton className="h-5 w-32 bg-primary/50" />
                </nav>
            </div>
            <div className="flex flex-1 items-center justify-between md:hidden">
                <Link href="/" className="flex items-center space-x-2">
                    <span className="font-bold font-headline">LaPizarra</span>
                </Link>
                <Skeleton className="h-10 w-10 bg-primary/50" />
            </div>
            <div className="hidden md:flex flex-1 items-center justify-end space-x-2">
                <Skeleton className="h-9 w-24 bg-primary/50" />
                <Skeleton className="h-9 w-28 bg-primary/50" />
            </div>
        </div>
    </header>
);


export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, loadingAuth] = useAuthState(auth);
  
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const [userProfile, loadingProfile] = useDocumentData(user ? doc(db, 'users', user.uid) : null);

  const isLoggedIn = !!user;
  const isAdmin = isLoggedIn && user.email === 'futsaldex@gmail.com'; 
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const [usersSnapshot, loadingUsers] = useCollection(
    isClient && isAdmin ? query(collection(db, 'users'), where('subscription', '==', null)) : null
  );
  const pendingUsers = usersSnapshot?.docs.length || 0;

  const [invitationsSnapshot, loadingInvitations] = useCollection(
    isClient && isAdmin ? query(collection(db, 'invitations'), where('status', '==', 'completed'), where('isApproved', '!=', true)) : null
  );
  const pendingInvitations = invitationsSnapshot?.docs.length || 0;

  // Admin-sent notifications
  const notificationsQuery = query(collection(db, 'notifications'), where('active', '==', true), orderBy('createdAt', 'desc'));
  const [notificationsSnapshot, loadingNotifications] = useCollection(notificationsQuery);

  const [unreadInfoCount, setUnreadInfoCount] = useState(0);
  const [remainingTrialDays, setRemainingTrialDays] = useState(0);

  // This effect calculates all notifications from different sources
  useEffect(() => {
    if (loadingAuth || loadingProfile || loadingNotifications || !user || !userProfile) {
        setUnreadInfoCount(0);
        return;
    }

    // == Bell Icon Logic (Trial Days) ==
    let trialDays = 0;
    if (!userProfile.subscription && userProfile.createdAt) {
        try {
            const creationDate = new Date(userProfile.createdAt);
            const trialEndDate = new Date(creationDate.getTime() + 7 * 24 * 60 * 60 * 1000);
            trialDays = differenceInDays(trialEndDate, new Date());
            setRemainingTrialDays(trialDays > 0 ? trialDays : 0);
        } catch (e) {
            setRemainingTrialDays(0);
        }
    } else {
        setRemainingTrialDays(0);
    }
    
    // == Info Icon Logic (Admin msgs + Expiry) ==
    const infoNotifications: any[] = [];
    
    // Subscription expiry logic
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

    // Admin-sent notifications
    const userPlan = userProfile.subscription;
    const isTrial = !userPlan && trialDays > 0;

    const adminNotifications = notificationsSnapshot?.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(notif => {
        if (notif.target === 'all') return true;
        if (isTrial && notif.target === 'trial') return true;
        if (userPlan && notif.target === userPlan) return true;
        return false;
    }) || [];
    
    const combined = [...infoNotifications, ...adminNotifications];
    
    const seenNotifications = JSON.parse(localStorage.getItem('seenNotifications') || '[]');
    const newUnreadCount = combined.filter(n => !seenNotifications.includes(n.id)).length;
    setUnreadInfoCount(newUnreadCount);

  }, [user, userProfile, notificationsSnapshot, loadingAuth, loadingProfile, loadingNotifications]);
  
  
  const visibleAdminNavLinks = isAdmin ? adminNavLinks : [];

  const handleLinkClick = () => {
    setIsSheetOpen(false);
  };
  
  const handleLogout = async () => {
    await signOut(auth);
    handleLinkClick();
    router.push('/');
  }

  if (!isClient) {
    return <HeaderSkeleton />;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-primary text-primary-foreground">
      <div className="container flex h-16 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            
            <span className="hidden font-bold sm:inline-block font-headline text-lg">
              LaPizarra
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navLinks.map((link) => (
               <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "transition-colors hover:text-white flex items-center gap-2",
                  (pathname.startsWith(link.href) && link.href !== '/') || pathname === link.href
                    ? "text-white"
                    : "text-primary-foreground/80"
                )}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
             {isAdmin && adminNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "transition-colors hover:text-white flex items-center gap-2",
                  pathname.startsWith(link.href)
                    ? "text-white"
                    : "text-primary-foreground/80"
                )}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        
        <div className="flex flex-1 items-center justify-between md:hidden">
           <Link href="/" className="flex items-center space-x-2">
            
            <span className="font-bold font-headline">
              LaPizarra
            </span>
          </Link>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="hover:bg-primary/80">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetTitle className="sr-only">Menú</SheetTitle>
              <nav className="grid gap-6 text-lg font-medium mt-8">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={handleLinkClick}
                    className={cn(
                      "flex items-center gap-2 text-lg font-semibold transition-colors hover:text-foreground/80",
                      (pathname.startsWith(link.href) && link.href !== '/') || pathname === link.href
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                ))}
                {visibleAdminNavLinks.map((link) => (
                   <Link
                    key={link.href}
                    href={link.href}
                    onClick={handleLinkClick}
                    className={cn(
                      "flex items-center gap-2 text-lg font-semibold transition-colors hover:text-foreground/80",
                      pathname.startsWith(link.href)
                        ? "text-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                ))}
              </nav>
                <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2">
                  {isLoggedIn ? (
                     <Button variant="outline" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Cerrar Sesión
                    </Button>
                  ) : (
                    <>
                        <Button asChild>
                            <Link href="/login" onClick={handleLinkClick}>
                                <LogIn className="mr-2 h-4 w-4" />
                                Iniciar Sesión
                            </Link>
                        </Button>
                        <Button variant="secondary" asChild>
                            <Link href="/registro" onClick={handleLinkClick}>
                                Registrarse
                            </Link>
                        </Button>
                    </>
                  )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
        <div className="hidden md:flex flex-1 items-center justify-end space-x-2">
            {isLoggedIn ? (
            <>
                {isAdmin && (
                    <>
                        
                        <Button variant="ghost" size="icon" className="relative hover:bg-primary/80" asChild>
                        <Link href="/admin/invitations">
                            <Gift className="h-5 w-5" />
                            {pendingInvitations > 0 && (
                                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                                    {pendingInvitations}
                                </span>
                            )}
                            <span className="sr-only">Invitaciones pendientes</span>
                        </Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="relative hover:bg-primary/80" asChild>
                            <Link href="/admin/users">
                                <Users className="h-5 w-5" />
                                {pendingUsers > 0 && (
                                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                                        {pendingUsers}
                                    </span>
                                )}
                                <span className="sr-only">Usuarios pendientes</span>
                            </Link>
                        </Button>
                    </>
                )}
                
                {remainingTrialDays > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="relative hover:bg-primary/80">
                                <Bell className="h-5 w-5" />
                                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                                    {remainingTrialDays}
                                </span>
                                <span className="sr-only">Días de prueba restantes</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-64" align="end" forceMount>
                            <DropdownMenuLabel>Prueba Gratuita</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="flex-col items-start !cursor-default whitespace-normal">
                                <p className="text-sm">Te quedan {remainingTrialDays} día(s) de tu prueba PRO.</p>
                                <p className="text-xs text-muted-foreground mt-1">Suscríbete para no perder el acceso.</p>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href="/planes">
                                    <Star className="mr-2 h-4 w-4" />
                                    <span>Ver Planes</span>
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}

                <Button asChild variant="ghost" size="icon" className="relative hover:bg-primary/80">
                    <Link href="/notificaciones">
                        <Info className="h-5 w-5" />
                        {unreadInfoCount > 0 && (
                            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-xs text-white">
                                {unreadInfoCount}
                            </span>
                        )}
                        <span className="sr-only">Notificaciones</span>
                    </Link>
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative hover:bg-primary/80">
                            <User className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none text-foreground">{user.displayName || 'Usuario'}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                            </p>
                        </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/perfil">
                                <User className="mr-2 h-4 w-4" />
                                <span>Mi Perfil</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/suscripcion">
                                <Star className="mr-2 h-4 w-4" />
                                <span>Suscripción y Puntos</span>
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Cerrar Sesión</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </>
            ) : (
            <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" asChild>
                    <Link href="/login">Iniciar Sesión</Link>
                </Button>
                <Button variant="default" size="sm" asChild>
                    <Link href="/registro">Registrarse</Link>
                </Button>
            </div>
            )}
        </div>
      </div>
    </header>
  );
}
