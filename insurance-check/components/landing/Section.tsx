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
      {eyebrow && <p className={cn("text-[15px] font-bold", tone === "dark" ? "text-blue-300" : "text-blue")}>{eyebrow}</p>}
      <h2
        id={`${id}-title`}
        className={cn(
          "mt-2.5 text-balance text-[28px] font-extrabold leading-[1.32] tracking-[-0.03em] sm:text-[34px] lg:text-[40px]",
          tone === "dark" ? "text-white" : "text-navy",
        )}
      >
        {title}
      </h2>
      {description && (
        <p className={cn("mt-4 text-pretty text-[17px] leading-[1.7] lg:text-[18px]", tone === "dark" ? "text-navy-300" : "text-navy-600")}>
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
        "py-20 sm:py-24 lg:py-32",
        tone === "tint" && "bg-navy-50",
        tone === "navy" && "bg-navy text-white",
        className,
      )}
    >
      <div className="container">{children}</div>
    </section>
  );
}
