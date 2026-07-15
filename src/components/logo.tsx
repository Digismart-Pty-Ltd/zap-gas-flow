import logoSrc from "@/assets/zapgas-logo.png";

export function Logo({ className = "h-8 w-8", withWordmark = false }: { className?: string; withWordmark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <img src={logoSrc} alt="Zap Gas" className={className} width={64} height={64} />
      {withWordmark && (
        <span className="font-display text-base font-bold tracking-wide">
          ZAP GAS
        </span>
      )}
    </span>
  );
}
