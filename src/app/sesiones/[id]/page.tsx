"use client";

import { useEffect, useState } from "react";

interface Ejercicio {
  id: string;
  title: string;
  description: string;
  image: string;
  duration: string;
  players: string;
  material: string;
  objectives: string[];
  phase: "inicial" | "principal" | "final";
}

export default function PDFPage() {
  const [session, setSession] = useState<any>(null);
  const [exercises, setExercises] = useState<Ejercicio[]>([]);

  useEffect(() => {
    // ➜ Inserta aquí tus datos reales
    setSession({
      equipo: "Juvenil B",
      instalacion: "Pabellón Fernando",
      microciclo: "1",
      sesion: "1",
      objetivos: [
        "Desarrollar regates y fintas para superar rivales.",
        "Potenciar diferentes finalizaciones.",
        "Entrenar defensas zonales.",
        "Fomentar paredes y triangulaciones.",
        "Mejorar transiciones rápidas."
      ]
    });

    // ➜ Añade tus ejercicios reales aquí
    setExercises([
      {
        id: "1",
        title: "Superioridad en progresión 2×1 a 4×4",
        description:
          "El ejercicio comienza con un 2×1 donde los atacantes deben superar al defensor...",
        image: "/ej1.png",
        duration: "15 min",
        players: "10 jugadores",
        material: "Balones y conos",
        objectives: ["Mejorar decisiones en ataque", "Coordinación ofensiva"],
        phase: "inicial"
      },
      // añade más...
    ]);
  }, []);

  const handlePrint = () => window.print();

  if (!session) return null;

  const inicial = exercises.filter(e => e.phase === "inicial");
  const principal = exercises.filter(e => e.phase === "principal");
  const final = exercises.filter(e => e.phase === "final");

  const renderExercise = (e: Ejercicio, key: number) => (
    <div key={key} className="exercise-block">
      <div className="exercise-row">
        <img src={e.image} className="exercise-img" />

        <div className="exercise-text">
          <h3 className="ex-title">{e.title}</h3>

          <h4 className="sub-title">Descripción</h4>
          <p className="ex-desc">{e.description}</p>

          <div className="meta">
            <p><strong>Duración:</strong> {e.duration}</p>
            <p><strong>Jugadores:</strong> {e.players}</p>
            <p><strong>Material:</strong> {e.material}</p>
          </div>

          <h4 className="sub-title">Objetivos del Ejercicio</h4>
          <ul className="obj-list">
            {e.objectives.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <button
        onClick={handlePrint}
        className="px-4 py-2 bg-emerald-600 text-white rounded-lg"
      >
        Descargar PDF
      </button>

      <div id="print-area">
        {/* -------------------------------------- */}
        {/* PRIMERA PÁGINA                         */}
        {/* -------------------------------------- */}
        <div className="print-page">

          <h2 className="section-title">Detalles & Objetivos de la Sesión</h2>

          <table className="session-table">
            <tbody>
              <tr>
                <td><strong>Equipo:</strong></td>
                <td>{session.equipo}</td>
                <td><strong>Instalación:</strong></td>
                <td>{session.instalacion}</td>
              </tr>
              <tr>
                <td><strong>Microciclo:</strong></td>
                <td>{session.microciclo}</td>
                <td><strong>Nº Sesión:</strong></td>
                <td>{session.sesion}</td>
              </tr>
            </tbody>
          </table>

          <h3 className="obj-title">Objetivos</h3>
          <ul className="obj-list">
            {session.objetivos.map((o: string, i: number) => (
              <li key={i}>{o}</li>
            ))}
          </ul>

          {/* Fase inicial */}
          <h2 className="phase-header">Fase Inicial (Calentamiento)</h2>

          {inicial.slice(0, 2).map(renderExercise)}
        </div>

        {/* -------------------------------------- */}
        {/* SIGUIENTES PÁGINAS → 3 ejercicios/pag */}
        {/* -------------------------------------- */}
        {(() => {
          const restante = [
            ...inicial.slice(2),
            ...principal,
            ...final
          ];

          const paginas = Math.ceil(restante.length / 3);

          return Array.from({ length: paginas }).map((_, i) => {
            const inicio = i * 3;
            const items = restante.slice(inicio, inicio + 3);

            return (
              <div key={i} className="print-page">
                {items.map(renderExercise)}
              </div>
            );
          });
        })()}
      </div>
    </div>
  );
}
