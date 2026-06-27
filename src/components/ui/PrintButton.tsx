"use client";

import { Button } from "./Button";

export function PrintButton({ label = "Print / Save as PDF" }: { label?: string }) {
  return (
    <Button variant="secondary" size="md" onClick={() => window.print()}>
      {label}
    </Button>
  );
}
