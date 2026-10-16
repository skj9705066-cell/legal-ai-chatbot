import { cn } from "@/lib/utils";

export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  align = "left",
  tone = "light",
}: {
  id: string;
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  tone?: "light" | "dark";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow && <p className={cn("text-[15px] font-bold", tone === "dark" ? "text-blue-300" : "text-blue-700")}>{eyebrow}</p>}
      <h2
        id={`${id}-title`}
        tabIndex={-1}
        className={cn(
          "focus:outline-none",
          "mt-2.5 text-balance text-[26px] font-extrabold leading-[1.32] tracking-[-0.03em] sm:text-[32px] lg:text-[38px]",
          tone === "dark" ? "text-white" : "text-navy",
        )}
      >
        {title}
      </h2>
      {description && (
        <p className={cn("mt-3 text-pretty text-[16px] leading-[1.65] lg:text-[17px]", tone === "dark" ? "text-navy-300" : "text-navy-600")}>
          {description}
        </p>
      )}
    </div>
  );
}

export function Section({
  id,
  children,
  className,
  tone = "white",
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
  tone?: "white" | "tint" | "navy";
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn(
        "py-14 sm:py-20 lg:py-24",
        tone === "tint" && "bg-navy-50",
        tone === "navy" && "bg-navy text-white",
        className,
      )}
    >
      <div className="container">{children}</div>
    </section>
  );
}
