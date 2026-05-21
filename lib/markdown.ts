/**
 * Markdown renderer + Korean legal-citation autolinker.
 *
 * Citations linked:
 *  - 법령: "민법 제750조", "근로기준법 제36조", "주택임대차보호법 제3조의2 제1항"
 *    → https://www.law.go.kr/lsSc.do?menuId=1&query={법령명}#법령명
 *  - 판례: "대법원 2024도1234", "대법원 99다12345 전원합의체"
 *    → https://www.law.go.kr/precSc.do?menuId=7&query={번호}
 *
 * Both render as `<a class="cite-link cite-law|cite-case">` with target="_blank".
 */

// Law citation: "<XX법|법률|시행령|시행규칙> 제O조[의 O][ 제O항]"
export const LAW_REGEX =
  /([가-힣A-Za-z·]+(?:법|법률|시행령|시행규칙))\s*제\s*(\d+)조(?:의\s*\d+)?(?:\s*제\s*\d+항)?/g;

// Court precedent: "대법원 YYYY{도|다|가|두|허|드|모|마|초|즈|므|재|러|머|버|수|우|자|차|카|타|파|하|누|구|로|소|아}NNNNN[ 전원합의체]"
export const CASE_REGEX =
  /대법원\s*\d{2,4}(?:도|다|가|두|허|드|모|마|초|즈|므|재|러|머|버|수|우|자|차|카|타|파|하|누|구|로|소|아|후)\s*\d{1,6}(?:\s*전원합의체)?/g;

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function lawHref(label: string): string {
  return `https://www.law.go.kr/lsSc.do?menuId=1&query=${encodeURIComponent(label)}`;
}

function caseHref(label: string): string {
  // strip "대법원" prefix and whitespace for cleaner query
  const q = label.replace(/^대법원\s*/, "").replace(/\s+/g, "");
  return `https://www.law.go.kr/precSc.do?menuId=7&query=${encodeURIComponent(q)}`;
}

/**
 * Inject anchor tags around legal citations in already-escaped HTML.
 * Runs on plain escaped text inside a single inline pass.
 */
function linkifyCitations(html: string): string {
  // Cases first — bigger pattern, fewer collisions with law names.
  let out = html.replace(CASE_REGEX, (m) => {
    return `<a href="${caseHref(m)}" target="_blank" rel="noopener noreferrer" class="cite-link cite-case"><strong>${m}</strong></a>`;
  });
  out = out.replace(LAW_REGEX, (m, lawName: string) => {
    return `<a href="${lawHref(lawName)}" target="_blank" rel="noopener noreferrer" class="cite-link cite-law"><strong>${m}</strong></a>`;
  });
  return out;
}

export function renderMarkdown(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let inUl = false;
  let inOl = false;
  let para: string[] = [];

  const inline = (s: string) => {
    let html = escape(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
    html = linkifyCitations(html);
    return html;
  };

  const flushPara = () => {
    if (para.length === 0) return;
    out.push(`<p>${inline(para.join(" "))}</p>`);
    para = [];
  };
  const closeLists = () => {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      out.push("</ol>");
      inOl = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.trim() === "") {
      flushPara();
      closeLists();
      continue;
    }

    const hMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (hMatch) {
      flushPara();
      closeLists();
      const level = hMatch[1].length;
      out.push(`<h${level}>${inline(hMatch[2])}</h${level}>`);
      continue;
    }

    const ulMatch = line.match(/^[\s]*[-*]\s+(.*)$/);
    if (ulMatch) {
      flushPara();
      if (inOl) {
        out.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        out.push("<ul>");
        inUl = true;
      }
      out.push(`<li>${inline(ulMatch[1])}</li>`);
      continue;
    }

    const olMatch = line.match(/^[\s]*\d+\.\s+(.*)$/);
    if (olMatch) {
      flushPara();
      if (inUl) {
        out.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        out.push("<ol>");
        inOl = true;
      }
      out.push(`<li>${inline(olMatch[1])}</li>`);
      continue;
    }

    closeLists();
    para.push(line);
  }

  flushPara();
  closeLists();
  return out.join("\n");
}

export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "방금 전";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Pull citation labels (law + case) from an array of assistant messages.
 * Used by the sidebar "인용된 법령·판례" panel.
 */
export interface Citation {
  kind: "law" | "case";
  label: string;
  href: string;
}

export function extractCitations(texts: string[]): Citation[] {
  const seen = new Set<string>();
  const result: Citation[] = [];

  for (const t of texts) {
    let m: RegExpExecArray | null;

    const lawRegex = new RegExp(LAW_REGEX.source, "g");
    while ((m = lawRegex.exec(t)) !== null) {
      const label = m[0].replace(/\s+/g, " ").trim();
      const key = `law:${label}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ kind: "law", label, href: lawHref(m[1]) });
    }

    const caseRegex = new RegExp(CASE_REGEX.source, "g");
    while ((m = caseRegex.exec(t)) !== null) {
      const label = m[0].replace(/\s+/g, " ").trim();
      const key = `case:${label}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ kind: "case", label, href: caseHref(label) });
    }
  }

  return result.slice(0, 24);
}
