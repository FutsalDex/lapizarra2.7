import { TacticsBoard } from "@/components/tactics-board";

export default function TacticasPage() {
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

    