"use client";

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { doc, collection, getFirestore } from 'firebase/firestore';
import { useDocumentData, useCollection } from 'react-firebase-hooks/firestore';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Printer, Download, Edit } from 'lucide-react';
import { app } from '@/firebase/config';
import { useToast } from '@/hooks/use-toast';
import type { Exercise } from '@/lib/data';

const db = getFirestore(app);

// ---------------------------------------------------------------
// Helper: render A4 page containers (SessionProPreview)
// ---------------------------------------------------------------
const SessionProPreview = React.forwardRef<HTMLDivElement, { session: any; exercises: Exercise[]; teamName: string }>(
  ({ session, exercises, teamName }, ref) => {
    // build flat exercise list
    const getByIds = (ids: string[] = []) =>
      ids.map((id) => exercises.find((e) => e.id === id)).filter(Boolean) as Exercise[];

    const all = [...getByIds(session.initialExercises), ...getByIds(session.mainExercises), ...getByIds(session.finalExercises)];

    // first page: header + 2 exercises
    const firstPage = all.slice(0, 2);
    const rest = all.slice(2);

    // chunk rest into groups of 3
    const chunks: Exercise[][] = [];
    for (let i = 0; i < rest.length; i += 3) chunks.push(rest.slice(i, i + 3));

    // Each ".a4-page" will be treated as a single PDF page by the download handler
    return (
      <div ref={ref} aria-hidden style={{ width: "210mm" }}>
        {/* First page (header + 2 exercises) */}
        <div className="a4-page" style={{ boxSizing: "border-box", padding: 20, background: "#fff", width: "210mm" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 12 }}>
            <tbody>
              <tr>
                <td style={{ width: "32%", verticalAlign: "top", paddingRight: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Equipo</div>
                  <div>{teamName}</div>
                  <div style={{ height: 8 }} />
                  <div style={{ fontWeight: 700 }}>Instalación</div>
                  <div>{session.facility || "-"}</div>
                  <div style={{ height: 8 }} />
                  <div style={{ fontWeight: 700 }}>Microciclo</div>
                  <div>{session.microcycle || "-"}</div>
                  <div style={{ height: 8 }} />
                  <div style={{ fontWeight: 700 }}>Nº Sesión</div>
                  <div>{session.sessionNumber || "-"}</div>
                </td>
                <td style={{ width: "68%", verticalAlign: "top" }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Objetivos</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {(session.objectives || []).map((o: string, i: number) => (
                      <li key={i} style={{ marginBottom: 4 }}>{o}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            </tbody>
          </table>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {firstPage.map((ex) => (
              <div key={ex.id} style={{ border: "1px solid #ddd", borderRadius: 6, overflow: "hidden", background: "#fff" }}>
                <div style={{ padding: 8, borderBottom: "1px solid #eee", fontWeight: 700, fontSize: 12 }}>{ex.Ejercicio}</div>
                <div style={{ display: "flex", padding: 8, gap: 8 }}>
                  <div style={{ width: 160, height: 110, position: "relative", background: "#fafafa" }}>
                    {ex.Imagen ? (
                      <Image src={ex.Imagen} alt={ex.Ejercicio} fill style={{ objectFit: "contain" }} unoptimized />
                    ) : null}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>Descripción</div>
                    <div style={{ marginBottom: 8, fontSize: 11 }}>{ex["Descripción de la tarea"]}</div>
                    <div style={{ fontWeight: 700 }}>Objetivos</div>
                    <div style={{ fontSize: 11 }}>{ex.Objetivos}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Remaining pages (3 per page) */}
        {chunks.map((group, idx) => (
          <div key={idx} className="a4-page" style={{ boxSizing: "border-box", padding: 20, background: "#fff", width: "210mm", marginTop: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {group.map((ex) => (
                <div key={ex.id} style={{ border: "1px solid #ddd", borderRadius: 6, overflow: "hidden", background: "#fff" }}>
                  <div style={{ padding: 8, borderBottom: "1px solid #eee", fontWeight: 700, fontSize: 12 }}>{ex.Ejercicio}</div>
                  <div style={{ display: "flex", padding: 8, gap: 8 }}>
                    <div style={{ width: 160, height: 110, position: "relative", background: "#fafafa" }}>
                      {ex.Imagen ? <Image src={ex.Imagen} alt={ex.Ejercicio} fill style={{ objectFit: "contain" }} unoptimized /> : null}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700 }}>Descripción</div>
                      <div style={{ marginBottom: 8, fontSize: 11 }}>{ex["Descripción de la tarea"]}</div>
                      <div style={{ fontWeight: 700 }}>Objetivos</div>
                      <div style={{ fontSize: 11 }}>{ex.Objetivos}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }
);
SessionProPreview.displayName = "SessionProPreview";

// ---------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------
export default function SesionDetallePage() {
  const params = useParams();
  const sessionId = params.id as string;
  const { toast } = useToast();
  const proRef = useRef<HTMLDivElement | null>(null);
  const basicRef = useRef<HTMLDivElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [sessionSnapshot, loadingSession, errorSession] = useDocumentData(doc(db, "sessions", sessionId));
  const [exercisesSnapshot, loadingExercises, errorExercises] = useCollection(collection(db, "exercises"));
  const teamId = sessionSnapshot?.teamId;
  const [teamSnapshot] = useDocumentData(teamId ? doc(db, "teams", teamId) : null);

  const isLoading = loadingSession || loadingExercises;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-64" />
        <div className="space-y-4 mt-6">
          <Skeleton className="h-40" />
          <Skeleton className="h-20" />
        </div>
      </div>
    );
  }

  if (errorSession || !sessionSnapshot) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold">Sesión no encontrada</h1>
        <p>{errorSession?.message || "La sesión no existe"}</p>
        <Link href="/sesiones">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="mr-2" />
            Volver
          </Button>
        </Link>
      </div>
    );
  }

  const session = { id: sessionId, ...sessionSnapshot } as any;
  const allExercises = exercisesSnapshot?.docs.map((d) => ({ id: d.id, ...d.data() })) as Exercise[] || [];
  const teamName = teamSnapshot?.name || "No especificado";

  // ---------- DOWNLOAD HANDLER: produce multi-page PDF ----------
  const handleDownloadPdf = async (type: "pro" | "basic") => {
    const root = type === "pro" ? proRef.current : basicRef.current;
    if (!root) return;
    setIsDownloading(true);
    setIsDialogOpen(false);

    try {
      // create PDF in mm
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidthMm = pdf.internal.pageSize.getWidth(); // e.g. 210
      const pdfHeightMm = pdf.internal.pageSize.getHeight(); // e.g. 297

      // conversion factor mm -> px (approx at 96dpi)
      const pxPerMm = 3.7795275591;

      // find page elements (.a4-page) in the rendered hidden root
      const pages = Array.from(root.querySelectorAll<HTMLElement>(".a4-page"));

      if (pages.length === 0) {
        throw new Error("No se encontraron páginas para exportar.");
      }

      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i];

        // Temporarily set explicit width & height in px so html2canvas captures exactly A4 area
        const targetPxWidth = Math.round(pdfWidthMm * pxPerMm);
        const targetPxHeight = Math.round(pdfHeightMm * pxPerMm);

        const prevStyleWidth = pageEl.style.width;
        const prevStyleHeight = pageEl.style.height;
        const prevStyleBoxSizing = pageEl.style.boxSizing;

        pageEl.style.boxSizing = "border-box";
        pageEl.style.width = `${targetPxWidth}px`;
        // ensure page's content fits inside A4 height. If content overflows it will be clipped — ideally your page generation keeps content to A4 height.
        pageEl.style.height = `${targetPxHeight}px`;
        pageEl.style.overflow = "hidden";

        // Wait next tick so styles take effect (helps in some browsers)
        await new Promise<void>((res) => setTimeout(() => res(), 50));

        // capture
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true,
          backgroundColor: "#ffffff",
        });

        // restore inline styles
        pageEl.style.width = prevStyleWidth;
        pageEl.style.height = prevStyleHeight;
        pageEl.style.boxSizing = prevStyleBoxSizing;

        const imgData = canvas.toDataURL("image/png");
        const imgProps = pdf.getImageProperties(imgData);
        const imgWidthMm = pdfWidthMm;
        const imgHeightMm = (imgProps.height * imgWidthMm) / imgProps.width;

        if (i > 0) pdf.addPage();
        // Place image at (0,0) and fit width to page width
        pdf.addImage(imgData, "PNG", 0, 0, imgWidthMm, imgHeightMm);
      }

      pdf.save(`sesion-${type}-${sessionId}.pdf`);
      toast({
        title: "PDF descargado",
      });
    } catch (err) {
      console.error("Error generando PDF:", err);
      toast({
        title: "Error al generar PDF",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">{session.name || "Sesión"}</h1>
            <p className="text-sm text-muted-foreground">
              {session.date ? format((session.date as any).toDate?.() ?? session.date, "eeee, d 'de' MMMM 'de' yyyy", { locale: es }) : ""}
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/sesiones">
                <ArrowLeft className="mr-2" />
                Volver
              </Link>
            </Button>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Printer className="mr-2" />
                  Imprimir / PDF
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Exportar ficha</DialogTitle>
                  <div className="text-sm text-muted-foreground">Elige plantilla y descarga el PDF (A4).</div>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="flex flex-col items-center">
                    <div style={{ width: 160, height: 226, border: "1px solid #ddd", borderRadius: 6, overflow: "hidden" }}>
                      {/* mini preview (rendered image static) */}
                      <Image src="https://i.ibb.co/hJ2DscG7/basico.png" alt="Basico" width={160} height={226} unoptimized />
                    </div>
                    <Button className="w-full mt-3" onClick={() => handleDownloadPdf("basic")} disabled={isDownloading}>
                      <Download className="mr-2" /> {isDownloading ? "Generando..." : "Descargar Básica"}
                    </Button>
                  </div>

                  <div className="flex flex-col items-center">
                    <div style={{ width: 160, height: 226, border: "1px solid #ddd", borderRadius: 6, overflow: "hidden" }}>
                      <Image src="https://i.ibb.co/pBKy6D20/pro.png" alt="Pro" width={160} height={226} unoptimized />
                    </div>
                    <Button className="w-full mt-3" onClick={() => handleDownloadPdf("pro")} disabled={isDownloading}>
                      <Download className="mr-2" /> {isDownloading ? "Generando..." : "Descargar Pro"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button asChild>
              <Link href={`/sesiones/${sessionId}/editar`}>
                <Edit className="mr-2" />
                Editar
              </Link>
            </Button>
          </div>
        </div>

        {/* session content (visible) */}
        <div className="max-w-4xl mx-auto space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Detalles de la sesión</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <div className="font-semibold">Equipo</div>
                  <div className="text-muted-foreground">{teamName}</div>
                </div>
                <div>
                  <div className="font-semibold">Instalación</div>
                  <div className="text-muted-foreground">{session.facility}</div>
                </div>
                <div>
                  <div className="font-semibold">Microciclo</div>
                  <div className="text-muted-foreground">{session.microcycle || "-"}</div>
                </div>
                <div>
                  <div className="font-semibold">Nº Sesión</div>
                  <div className="text-muted-foreground">{session.sessionNumber || "-"}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hidden area used for PDF generation. Keep it off-screen but mounted so html2canvas can render it */}
      <div style={{ position: "absolute", left: -99999, top: 0, width: "210mm" }} aria-hidden>
        <div ref={basicRef}>
          {/* Basic preview could be implemented similarly; for now we reuse pro preview layout for basic */}
          <div className="a4-page" style={{ padding: 20, background: "#fff", width: "210mm" }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{session.name}</div>
            <div style={{ marginBottom: 8 }}>{teamName}</div>
            {/* simple basic layout */}
            <div>
              {/* list a few exercises in grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {allExercises.slice(0, 6).map((ex) => (
                  <div key={ex.id} style={{ border: "1px solid #eee", padding: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 12 }}>{ex.Ejercicio}</div>
                    <div style={{ height: 6 }} />
                    <div style={{ width: 120, height: 90, position: "relative" }}>
                      {ex.Imagen ? <Image src={ex.Imagen} alt={ex.Ejercicio} fill style={{ objectFit: "contain" }} unoptimized /> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div ref={proRef}>
          <SessionProPreview session={session} exercises={allExercises} teamName={teamName} />
        </div>
      </div>
    </>
  );
}
