import Image from "next/image";
import { cn } from "@/lib/utils";

/** The ring mark with the product name. Brand colors live in the SVG asset, not in tokens. */
export function Brand({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <Image src="/logo-mark.svg" alt="" width={size} height={size} priority unoptimized />
      GenMentor
    </span>
  );
}

/** The full logo (mark + wordmark), for the landing page and other brand moments. */
export function Logo({ className, width = 220 }: { className?: string; width?: number }) {
  return <Image src="/logo.svg" alt="GenMentor" width={width} height={Math.round((width * 387) / 1986)} priority unoptimized className={className} />;
}
