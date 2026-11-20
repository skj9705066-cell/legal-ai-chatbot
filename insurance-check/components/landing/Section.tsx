import { cn } from "@/lib/utils";

/**
 * 섹션 제목. 50~60대 고객 기준: 제목 모바일 28px·데스크톱 40px, 설명 18~19px, 줄 간격 넉넉하게.
 */
export function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  align = "left",
}: {
  id: string;
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow && <p className="text-[17px] font-bold text-forest-700">{eyebrow}</p>}
      <h2
        id={`${id}-title`}
        tabIndex={-1}
        className="mt-2 text-balance text-[28px] font-extrabold leading-[1.35] tracking-[-0.025em] text-charcoal focus:outline-none sm:text-[34px] lg:text-[40px]"
      >
        {title}
      </h2>
      {description && <p className="mt-3 text-pretty text-[18px] leading-[1.7] text-navy-600 lg:text-[19px]">{description}</p>}
    </div>
  );
}

export function Section({
  id,
  children,
  className,
  tone = "ivory",
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
  tone?: "ivory" | "sage" | "white";
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn(
        "scroll-mt-20 py-14 sm:py-20 lg:py-24",
        tone === "ivory" && "bg-ivory",
        tone === "sage" && "bg-sage",
        tone === "white" && "bg-white",
        className,
      )}
    >
      <div className="container">{children}</div>
    </section>
  );
}
