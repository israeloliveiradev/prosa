import type { ReactNode } from "react";
import { PageHeader } from "@/ui";
import { keepWords } from "@/lib/text";

export function PageMasthead({
  kicker: _kicker,
  title,
  dek,
  trailing,
}: {
  kicker?: string;
  title: string;
  dek?: string;
  trailing?: ReactNode;
}) {
  return (
    <PageHeader
      title={keepWords(title)}
      description={dek ? keepWords(dek) : undefined}
      actions={trailing}
    />
  );
}
