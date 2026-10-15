import { cn } from "@/lib/utils";

export function Section({
  id,
  eyebrow,
  title,
  description,
  children,
  className,
  tone = "white",
}: {
  id: string;
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  tone?: "white" | "tint";
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={cn("py-16 sm:py-20 lg:py-24", tone === "tint" && "bg-navy-50/70", className)}>
      <div className="container">
        <div className="max-w-2xl">
          {eyebrow && <p className="text-[13.5px] font-bold tracking-wide text-blue">{eyebrow}</p>}
          <h2 id={`${id}-title`} className="mt-2 text-balance text-[24px] font-extrabold leading-snug tracking-[-0.015em] text-navy sm:text-[30px] lg:text-[34px]">
            {title}
          </h2>
          {description && <p className="mt-3 text-[15.5px] leading-[1.75] text-navy-600 sm:text-[17px]">{description}</p>}
        </div>
        <div className="mt-8 sm:mt-10">{children}</div>
      </div>
    </section>
  );
}
