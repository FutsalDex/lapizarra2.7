"use client";

import { Suspense } from "react";
import RegistroContent from "./registro-content";

export default function RegistroPage() {
  return (
    <Suspense>
      <RegistroContent />
    </Suspense>
  );
}
