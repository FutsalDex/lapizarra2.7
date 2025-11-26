
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import app from "@/firebase/config";
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, GoogleAuthProvider, getAuth } from "firebase/auth";
import { doc, setDoc, serverTimestamp, getFirestore } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const auth = getAuth(app);
const db = getFirestore(app);

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.36 1.84-4.06 1.84-4.81 0-8.73-3.88-8.73-8.73 0-4.84 3.92-8.73 8.73-8.73 2.83 0 4.54.99 5.61 1.98l2.56-2.56C19.43 1.82 16.25 0 12.48 0 5.61 0 0 5.61 0 12.48s5.61 12.48 12.48 12.48c7.2 0 12.03-4.19 12.03-12.35 0-.79-.09-1.39-.18-1.98h-11.85z" />
    </svg>
);


export default function RegistroContent() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');
  const { toast } = useToast();
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
        toast({
            variant: "destructive",
            title: "Contraseña demasiado corta",
            description: "La contraseña debe tener al menos 6 caracteres.",
        });
        return;
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: nombre });

      // Create user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        displayName: nombre,
        email: user.email,
        createdAt: serverTimestamp(),
        subscription: null,
        subscriptionEndDate: null,
      });

      router.push(redirectUrl || "/panel");

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Error en el registro",
            description: error.message,
        });
    } finally {
        setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

       // Create user document in Firestore if it doesn't exist
       await setDoc(doc(db, "users", user.uid), {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
        subscription: null,
        subscriptionEndDate: null,
      }, { merge: true }); // Merge to avoid overwriting existing data if user logs in again

      router.push(redirectUrl || "/panel");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error con Google",
        description: error.message,
      });
    } finally {
        setGoogleLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-background p-4">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader>
          <CardTitle className="text-xl">Regístrate</CardTitle>
          <CardDescription>
            Crea tu cuenta para empezar a gestionar tu equipo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="first-name">Nombre</Label>
              <Input 
                id="first-name" 
                placeholder="Tu nombre" 
                required 
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                disabled={loading || googleLoading}
                />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@ejemplo.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading || googleLoading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input 
                id="password" 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading || googleLoading}
                />
            </div>
            <Button type="submit" className="w-full" disabled={loading || googleLoading}>
               {loading ? <Loader2 className="animate-spin" /> : "Crear una cuenta"}
            </Button>
            <Button variant="outline" className="w-full" onClick={handleGoogleLogin} disabled={loading || googleLoading}>
              {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4 fill-current"/>}
              Registrarse con Google
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            ¿Ya tienes una cuenta?{" "}
            <Link href="/login" className="underline">
              Iniciar sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
