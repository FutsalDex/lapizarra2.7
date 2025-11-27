"use client";

import React, { useState, useRef, useEffect } from 'react';
import { FutsalCourt } from '@/components/futsal-court';
import { Button } from '@/components/ui/button';
import { Trash2, Pen, MousePointer, PlusCircle, MinusCircle, Eraser } from 'lucide-react';
import { cn } from '@/lib/utils';

type Player = {
  id: number;
  x: number;
  y: number;
  color: string;
  label: string;
};

type Line = {
  points: { x: number; y: number }[];
};

export function TacticsBoard() {
  const [players, setPlayers] = useState<Player[]>([
    { id: 1, x: 120, y: 100, color: 'hsl(var(--destructive))', label: '1' },
    { id: 2, x: 160, y: 50, color: 'hsl(var(--destructive))', label: '2' },
    { id: 3, x: 160, y: 150, color: 'hsl(var(--destructive))', label: '3' },
    { id: 4, x: 200, y: 100, color: 'hsl(var(--destructive))', label: '4' },
  ]);
  const [lines, setLines] = useState<Line[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [mode, setMode] = useState<'move' | 'draw' | 'erase'>('move');
  const boardRef = useRef<HTMLDivElement>(null);
  const [draggingPlayer, setDraggingPlayer] = useState<number | null>(null);

  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    if (!boardRef.current) return { x: 0, y: 0 };
    const rect = boardRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) / rect.width * 400,
      y: (clientY - rect.top) / rect.height * 200,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (mode === 'draw') {
      setDrawing(true);
      const { x, y } = getCoords(e);
      setLines(prev => [...prev, { points: [{ x, y }] }]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (mode === 'draw' && drawing) {
      const { x, y } = getCoords(e);
      setLines(prev => {
        const newLines = [...prev];
        newLines[newLines.length - 1].points.push({ x, y });
        return newLines;
      });
    } else if (mode === 'move' && draggingPlayer !== null) {
      const { x, y } = getCoords(e);
      setPlayers(prev => prev.map(p => p.id === draggingPlayer ? { ...p, x, y } : p));
    }
  };

  const handleMouseUp = () => {
    if (mode === 'draw') setDrawing(false);
    if (mode === 'move') setDraggingPlayer(null);
  };
  
  const handleMouseLeave = () => {
    if (drawing) setDrawing(false);
    if (draggingPlayer !== null) setDraggingPlayer(null);
  };

  const addPlayer = () => {
    setPlayers(prev => [...prev, {
      id: Date.now(),
      x: 200, y: 100,
      color: 'hsl(var(--primary))',
      label: (prev.length + 1).toString()
    }]);
  };

  const removePlayer = () => {
    if (players.length > 0) {
      setPlayers(prev => prev.slice(0, -1));
    }
  };

  const clearBoard = () => {
    setPlayers([]);
    setLines([]);
  };

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.target instanceof HTMLElement && e.target.dataset.playerId) {
        if(mode === 'move') {
            setDraggingPlayer(Number(e.target.dataset.playerId));
        }
    } else if (mode === 'draw') {
        setDrawing(true);
        const { x, y } = getCoords(e);
        setLines(prev => [...prev, { points: [{ x, y }] }]);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (mode === 'draw' && drawing) {
        e.preventDefault();
        const { x, y } = getCoords(e);
        setLines(prev => {
            const newLines = [...prev];
            newLines[newLines.length - 1].points.push({ x, y });
            return newLines;
        });
    } else if (mode === 'move' && draggingPlayer !== null) {
        e.preventDefault();
        const { x, y } = getCoords(e);
        setPlayers(prev => prev.map(p => p.id === draggingPlayer ? { ...p, x, y } : p));
    }
  };

  const handleTouchEnd = () => {
    if (mode === 'draw') setDrawing(false);
    if (mode === 'move') setDraggingPlayer(null);
  };

  return (
    <div className="p-4 md:p-6 flex flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button variant={mode === 'move' ? 'secondary' : 'ghost'} size="sm" onClick={() => setMode('move')}>
          <MousePointer className="mr-2 h-4 w-4" /> Mover
        </Button>
        <Button variant={mode === 'draw' ? 'secondary' : 'ghost'} size="sm" onClick={() => setMode('draw')}>
          <Pen className="mr-2 h-4 w-4" /> Dibujar
        </Button>
        <Button variant="ghost" size="sm" onClick={addPlayer}>
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Jugador
        </Button>
        <Button variant="ghost" size="sm" onClick={removePlayer}>
          <MinusCircle className="mr-2 h-4 w-4" /> Quitar Jugador
        </Button>
        <Button variant="destructive" size="sm" onClick={() => setLines([])}>
          <Eraser className="mr-2 h-4 w-4" /> Borrar Líneas
        </Button>
        <Button variant="destructive" size="sm" onClick={clearBoard}>
          <Trash2 className="mr-2 h-4 w-4" /> Limpiar Todo
        </Button>
      </div>

      <div
        ref={boardRef}
        className="relative w-full max-w-4xl aspect-[2/1] bg-card rounded-lg shadow-lg cursor-crosshair overflow-hidden touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <FutsalCourt />
        <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 400 200">
          {lines.map((line, i) => (
            <polyline
              key={i}
              points={line.points.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="hsl(var(--card-foreground))"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
        {players.map(player => (
          <div
            key={player.id}
            data-player-id={player.id}
            className={cn("absolute w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold shadow-md -translate-x-1/2 -translate-y-1/2", { "cursor-grab active:cursor-grabbing": mode === 'move' })}
            style={{
              left: `${player.x / 400 * 100}%`,
              top: `${player.y / 200 * 100}%`,
              backgroundColor: player.color,
              color: 'hsl(var(--primary-foreground))',
              cursor: mode === 'move' ? 'grab' : 'crosshair'
            }}
            onMouseDown={(e) => { 
                if(mode === 'move') {
                    setDraggingPlayer(player.id);
                    // Prevent text selection while dragging
                    e.preventDefault();
                }
            }}
          >
            {player.label}
          </div>
        ))}
      </div>
    </div>
  );
}

    