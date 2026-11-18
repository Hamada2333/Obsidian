"use client";

import Link from "next/link";
import { Fragment, useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Small, dependency-free Markdown renderer that outputs React elements
 * (never raw HTML), so user content can't inject markup.
 * Supports headings, emphasis, code, lists, quotes, tables, rules,
 * links, [[wiki links]] and [n] citations.
 */

export interface MarkdownProps {
  source: string;
  className?: string;
  resolveWiki?: (title: string) => string | null; // href or null if missing
  onMissingWiki?: (title: string) => void;
  citations?: Array<{ href: string; title: string }>;
}

type Ctx = Omit<MarkdownProps, "source" | "className">;

function inline(text: string, ctx: Ctx, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\[\[([^\]\n]+?)\]\])|(`([^`]+)`)|(\*\*([^*]+)\*\*)|(\*([^*\s][^*]*?)\*)|(_([^_\s][^_]*?)_)|(\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\))|(\[(\d{1,2})\])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${keyBase}-${i++}`;
    if (m[1]) {
      const title = m[2].trim();
      const href = ctx.resolveWiki?.(title);
      if (href) {
        out.push(
          <Link key={k} href={href} className="wikilink">
            {title}
          </Link>,
        );
      } else {
        out.push(
          <span
            key={k}
            role={ctx.onMissingWiki ? "button" : undefined}
            tabIndex={ctx.onMissingWiki ? 0 : undefined}
            title={ctx.onMissingWiki ? `Create “${title}”` : "No page with this title yet"}
            className="wikilink missing"
            onClick={() => ctx.onMissingWiki?.(title)}
            onKeyDown={(e) => e.key === "Enter" && ctx.onMissingWiki?.(title)}
          >
            {title}
          </span>,
        );
      }
    } else if (m[3]) out.push(<code key={k}>{m[4]}</code>);
    else if (m[5]) out.push(<strong key={k}>{inline(m[6], ctx, k)}</strong>);
    else if (m[7]) out.push(<em key={k}>{inline(m[8], ctx, k)}</em>);
    else if (m[9]) out.push(<em key={k}>{inline(m[10], ctx, k)}</em>);
    else if (m[11]) {
      const href = m[13];
      out.push(
        href.startsWith("/") ? (
          <Link key={k} href={href}>
            {m[12]}
          </Link>
        ) : (
          <a key={k} href={href} target="_blank" rel="noreferrer noopener">
            {m[12]}
          </a>
        ),
      );
    } else if (m[14]) {
      const n = Number(m[15]);
      const c = ctx.citations?.[n - 1];
      out.push(
        c ? (
          <Link
            key={k}
            href={c.href}
            title={c.title}
            className="mx-0.5 inline-flex size-[18px] -translate-y-px items-center justify-center rounded-md border border-gold/25 bg-gold/10 align-middle font-mono text-[10px] text-gold-soft no-underline hover:bg-gold/20"
          >
            {n}
          </Link>
        ) : (
          m[0]
        ),
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function parse(src: string, ctx: Ctx): ReactNode[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;
  const nextKey = () => `b${key++}`;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    // Code fence
    if (/^```/.test(line)) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      blocks.push(
        <pre key={nextKey()}>
          <code>{buf.join("\n")}</code>
        </pre>,
      );
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const k = nextKey();
      const content = inline(h[2], ctx, k);
      blocks.push(h[1].length === 1 ? <h1 key={k}>{content}</h1> : h[1].length === 2 ? <h2 key={k}>{content}</h2> : <h3 key={k}>{content}</h3>);
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      blocks.push(<hr key={nextKey()} />);
      i++;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ""));
      const k = nextKey();
      blocks.push(<blockquote key={k}>{inline(buf.join(" "), ctx, k)}</blockquote>);
      continue;
    }
    if (/^\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const row = (l: string) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = row(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) rows.push(row(lines[i++]));
      const k = nextKey();
      blocks.push(
        <div key={k} className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                {head.map((c, j) => (
                  <th key={j}>{inline(c, ctx, `${k}h${j}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, j) => (
                    <td key={j}>{inline(c, ctx, `${k}r${ri}c${j}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    const ul = /^\s*[-*+]\s+(?:\[( |x)\]\s+)?/;
    const ol = /^\s*\d+[.)]\s+/;
    if (ul.test(line) || ol.test(line)) {
      const ordered = ol.test(line);
      const re = ordered ? ol : ul;
      const items: ReactNode[] = [];
      while (i < lines.length && re.test(lines[i])) {
        const k = nextKey();
        const task = /^\s*[-*+]\s+\[( |x)\]\s+/.exec(lines[i]);
        const text = lines[i].replace(re, "");
        items.push(
          <li key={k}>
            {task && <span className={cn("mr-2 inline-block size-3 rounded-[4px] border align-[-1px]", task[1] === "x" ? "border-emerald/60 bg-emerald/40" : "border-white/25")} />}
            {inline(text, ctx, k)}
          </li>,
        );
        i++;
      }
      blocks.push(ordered ? <ol key={nextKey()}>{items}</ol> : <ul key={nextKey()}>{items}</ul>);
      continue;
    }
    // Paragraph: gather until blank or block start
    const buf: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|```|>|\s*[-*+]\s|\s*\d+[.)]\s|\|)/.test(lines[i])) buf.push(lines[i++]);
    const k = nextKey();
    blocks.push(
      <p key={k}>
        {buf.map((b, j) => (
          <Fragment key={j}>
            {j > 0 && " "}
            {inline(b, ctx, `${k}-${j}`)}
          </Fragment>
        ))}
      </p>,
    );
  }
  return blocks;
}

export function Markdown({ source, className, ...ctx }: MarkdownProps) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const nodes = useMemo(() => parse(source, ctx), [source, ctx.resolveWiki, ctx.citations, ctx.onMissingWiki]);
  return <div className={cn("prose-brain", className)}>{nodes}</div>;
}
