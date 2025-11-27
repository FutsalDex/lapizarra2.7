import { cn } from "@/lib/utils";

export const FutsalCourt = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 200"
      className={cn("w-full h-auto", className)}
      aria-label="Cancha de futsal"
    >
      {/* Background */}
      <rect width="400" height="200" fill="hsl(var(--primary))" fillOpacity="0.8" />

      {/* Outlines */}
      <rect x="10" y="10" width="380" height="180" stroke="hsl(var(--card-foreground))" strokeOpacity="0.5" fill="none" strokeWidth="2" />

      {/* Center line and circle */}
      <line x1="200" y1="10" x2="200" y2="190" stroke="hsl(var(--card-foreground))" strokeOpacity="0.5" strokeWidth="2" />
      <circle cx="200" cy="100" r="30" stroke="hsl(var(--card-foreground))" strokeOpacity="0.5" fill="none" strokeWidth="2" />
      <circle cx="200" cy="100" r="2" fill="hsl(var(--card-foreground))" fillOpacity="0.5" />

      {/* Left penalty area */}
      <rect x="10" y="50" width="60" height="100" stroke="hsl(var(--card-foreground))" strokeOpacity="0.5" fill="none" strokeWidth="2" />
      <circle cx="70" cy="100" r="1" fill="hsl(var(--card-foreground))" fillOpacity="0.5" />
      <path d="M 70 70 A 20 20 0 0 1 70 130" stroke="hsl(var(--card-foreground))" strokeOpacity="0.5" fill="none" strokeWidth="2" />


      {/* Right penalty area */}
      <rect x="330" y="50" width="60" height="100" stroke="hsl(var(--card-foreground))" strokeOpacity="0.5" fill="none" strokeWidth="2" />
      <circle cx="330" cy="100" r="1" fill="hsl(var(--card-foreground))" fillOpacity="0.5" />
      <path d="M 330 70 A 20 20 0 0 0 330 130" stroke="hsl(var(--card-foreground))" strokeOpacity="0.5" fill="none" strokeWidth="2" />

      {/* Goals */}
      <rect x="0" y="85" width="10" height="30" fill="hsl(var(--background))" stroke="hsl(var(--card-foreground))" strokeWidth="1" />
      <rect x="390" y="85" width="10" height="30" fill="hsl(var(--background))" stroke="hsl(var(--card-foreground))" strokeWidth="1" />
    </svg>
  );
};

    