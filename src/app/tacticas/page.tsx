"use client";

import { TacticsBoard } from "@/components/tactics-board";
import { useAuthState } from 'react-firebase-hooks/auth';
import { getAuth } from "firebase/auth";
import app from "@/firebase/config";
import { useRouter } from 'next/navigation';
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

const auth = getAuth(app);

export default function TacticasPage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user || user.email !== 'futsaldex@gmail.com') {
        router.push('/panel');
      }
    }
  }, [user, loading, router]);

  if (loading || !user || user.email !== 'futsaldex@gmail.com') {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold font-headline">Pizarra Táctica</h1>
        <p className="text-lg text-muted-foreground mt-2">Diseña tus jugadas, formaciones y estrategias.</p>
      </div>
      <TacticsBoard />
    </div>
  );
}
