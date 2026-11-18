import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export const runtime = "nodejs";

/**
 * Fetches a URL's <title> and description so saved links get real metadata.
 * Guarded against SSRF: http(s) only, no private / loopback / link-local targets,
 * 5s timeout, 300KB read cap, no redirects to private hosts.
 */
function isPrivate(ip: string) {
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    return v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v === "::" || v.startsWith("::ffff:127.") || v.startsWith("::ffff:10.") || v.startsWith("::ffff:192.168.");
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

async function assertPublic(url: URL) {
  if (!/^https?:$/.test(url.protocol)) throw new Error("Only http(s) URLs are supported");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("Private host");
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (addrs.some((a) => isPrivate(a.address))) throw new Error("Private host");
}

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();

function meta(html: string, name: string) {
  const re = new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*>`, "i");
  const tag = re.exec(html)?.[0];
  return tag ? decode(/content=["']([^"']*)["']/i.exec(tag)?.[1] ?? "") : "";
}

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("url");
  if (!raw) return Response.json({ error: "Missing url" }, { status: 400 });
  try {
    let url = new URL(raw);
    let res: Response | null = null;
    for (let hop = 0; hop < 4; hop++) {
      await assertPublic(url);
      res = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
        headers: { "User-Agent": "SecondBrainBot/1.0 (+link preview)", Accept: "text/html" },
      });
      const loc = res.headers.get("location");
      if (res.status >= 300 && res.status < 400 && loc) {
        url = new URL(loc, url);
        continue;
      }
      break;
    }
    if (!res || !res.ok || !res.body) return Response.json({ error: `Fetch failed (${res?.status ?? "?"})` }, { status: 502 });
    if (!(res.headers.get("content-type") ?? "").includes("html")) return Response.json({ title: "", description: "", url: url.toString() });

    const reader = res.body.getReader();
    let html = "";
    const dec = new TextDecoder();
    while (html.length < 300_000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += dec.decode(value, { stream: true });
      if (/<\/head>/i.test(html)) break;
    }
    void reader.cancel();
    const title = meta(html, "og:title") || decode(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "");
    const description = meta(html, "og:description") || meta(html, "description");
    return Response.json({ title: title.slice(0, 200), description: description.slice(0, 400), url: url.toString() });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Unfurl failed" }, { status: 400 });
  }
}
