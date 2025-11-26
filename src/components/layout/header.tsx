
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
import { Menu, BookOpen, PenSquare, Star, LayoutDashboard, UserCog, Gift, Users, User, LogOut, LogIn } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState } from "react";
import app from "@/firebase/config";
import { useAuthState } from "react-firebase-hooks/auth";
import { signOut, getAuth } from "firebase/auth";
import { FirebaseLogo } from "./logo";
import { useCollection } from "react-firebase-hooks/firestore";
import { collection, query, where, getFirestore } from "firebase/firestore";

const auth = getAuth(app);
const db = getFirestore(app);

const navLinks = [
  { href: "/ejercicios", label: "Ver ejercicios", icon: <BookOpen className="w-5 h-5"/>, auth: false },
  { href: "/sesiones/crear", label: "Crear Sesión", icon: <PenSquare className="w-5 h-5"/>, auth: true },
  { href: "/favoritos", label: "Favoritos", icon: <Star className="w-5 h-5"/>, auth: true },
  { href: "/panel", label: "Mi Panel", icon: <LayoutDashboard className="w-5 h-5"/>, auth: true },
];

const adminNavLinks = [
    { href: "/admin", label: "Panel Admin", icon: <UserCog className="w-5 h-5"/>, auth: true },
]

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, loadingAuth] = useAuthState(auth);
  const isLoggedIn = !!user;
  
  const isAdmin = isLoggedIn && user.email === 'futsaldex@gmail.com'; 
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Fetch pending users (users without a subscription)
  const [usersSnapshot, loadingUsers] = useCollection(
    isAdmin ? query(collection(db, 'users'), where('subscription', '==', null)) : null
  );
  const pendingUsers = usersSnapshot?.docs.length || 0;

  // Fetch pending invitations (completed but not approved)
  const [invitationsSnapshot, loadingInvitations] = useCollection(
    isAdmin ? query(collection(db, 'invitations'), where('status', '==', 'completed'), where('isApproved', '!=', true)) : null
  );
  const pendingInvitations = invitationsSnapshot?.docs.length || 0;

  
  const visibleNavLinks = navLinks;
  const visibleAdminNavLinks = adminNavLinks.filter(link => !link.auth || isAdmin);

  const handleLinkClick = () => {
    setIsSheetOpen(false);
  };
  
  const handleLogout = async () => {
    await signOut(auth);
    handleLinkClick();
    router.push('/');
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
            {visibleNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "transition-colors hover:text-white flex items-center gap-2",
                  pathname === link.href
                    ? "text-white"
                    : "text-primary-foreground/80"
                )}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
             {isAdmin && visibleAdminNavLinks.map((link) => (
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
                {[...visibleNavLinks, ...(isAdmin ? visibleAdminNavLinks : [])].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={handleLinkClick}
                    className={cn(
                      "flex items-center gap-2 text-lg font-semibold transition-colors hover:text-foreground/80",
                      pathname === link.href
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
                            <Link href="https://console.firebase.google.com/project/lapizarra-95eqd" target="_blank">
                                <FirebaseLogo />
                                <span className="sr-only">Proyecto de Firebase</span>
                            </Link>
                        </Button>
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
