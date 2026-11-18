import type { Activity, Conversation, Idea, LinkItem, Page, Project, Snapshot } from "./types";
import { DAY } from "./dates";

/**
 * Realistic demo workspace so the app feels alive on first run.
 * Timestamps are generated relative to "now" so charts and "this week"
 * metrics are always meaningful. A small seeded PRNG keeps it deterministic.
 */

export const SNAPSHOT_VERSION = 1;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type PageSeed = [title: string, category: string, tags: string[], content: string, pinned?: boolean];

const PAGE_SEEDS: PageSeed[] = [
  [
    "North Star 2027",
    "Plans",
    ["strategy", "vision"],
    `# North Star 2027

The single sentence: **build calm, compounding systems that make a small team feel like a large one.**

## Three bets
1. Ship [[Atlas — Client Portal]] to 40 paying studios.
2. Turn the [[Weekly Review Ritual]] into a product feature.
3. Publish one long-form essay a month — see [[Writing System]].

## What I will not do
- Chase every new framework.
- Take projects without a clear owner.

> Focus is saying no to good ideas.`,
    true,
  ],
  [
    "Weekly Review Ritual",
    "Reviews",
    ["ritual", "productivity"],
    `# Weekly Review Ritual

Every Friday, 45 minutes. No exceptions.

## Checklist
- Clear inbox to zero, file everything into the right page.
- Re-read [[North Star 2027]] and score each bet 1–5.
- Review open [[Decision Log]] entries older than 30 days.
- Pick the **one** thing that would make next week a win.

## Prompts
- What surprised me?
- What did I avoid?
- What am I proud of?`,
    true,
  ],
  [
    "Decision Log",
    "Decisions",
    ["decisions", "process"],
    `# Decision Log

A running record so future-me understands *why*.

| Date | Decision | Confidence |
| --- | --- | --- |
| Nov 12 | Move Atlas auth to Supabase | High |
| Nov 03 | Price Atlas at $49 / seat | Medium |
| Oct 21 | Drop the mobile app for v1 | High |

See also [[Pricing Experiments]] and [[Atlas — Architecture]].`,
    true,
  ],
  [
    "Atlas — Client Portal",
    "Projects",
    ["atlas", "product"],
    `# Atlas — Client Portal

A portal where design studios share progress, files and invoices with clients.

## Status
Private beta with 12 studios. Next milestone: self-serve onboarding.

## Links
- [[Atlas — Architecture]]
- [[Atlas — Onboarding Flow]]
- [[Pricing Experiments]]`,
  ],
  [
    "Atlas — Architecture",
    "Projects",
    ["atlas", "engineering"],
    `# Atlas — Architecture

- **Frontend:** Next.js App Router, React Server Components where it helps.
- **Data:** Postgres via Supabase, row-level security per workspace.
- **Files:** S3-compatible storage with signed URLs.
- **Jobs:** queue for thumbnail generation and invoice reminders.

## Open questions
- Do we need realtime presence for v1? Probably not.
- Webhook retries — exponential backoff, max 8 attempts.

Related: [[Decision Log]].`,
  ],
  [
    "Atlas — Onboarding Flow",
    "Projects",
    ["atlas", "ux"],
    `# Atlas — Onboarding Flow

Goal: first client invite sent in **under 4 minutes**.

1. Create workspace (name + logo).
2. Import first project from a template.
3. Invite a client with a magic link.

Friction log lives in [[User Interview Notes]].`,
  ],
  [
    "Pricing Experiments",
    "Decisions",
    ["pricing", "atlas"],
    `# Pricing Experiments

## Experiment 3 — per-seat vs flat
- Per-seat at $49 converted **2.1×** better for studios under 10 people.
- Flat $299 won for agencies above 25 seats.

Decision recorded in [[Decision Log]].`,
  ],
  [
    "User Interview Notes",
    "Reference notes",
    ["research", "atlas"],
    `# User Interview Notes

## Studio Nine — Oct 28
- "Clients never find the latest file." → strongest pain.
- Wants branded portal, doesn't care about custom domains yet.

## Fieldwork — Nov 06
- Invoices are sent from a separate tool; would switch if reminders were automatic.

Synthesis feeds [[Atlas — Onboarding Flow]].`,
  ],
  [
    "Writing System",
    "Reference notes",
    ["writing", "process"],
    `# Writing System

1. Capture fragments as ideas.
2. Promote to a draft page once three fragments connect.
3. Edit in two passes: **structure**, then **sentences**.

Essays in flight: [[Essay — The Quiet Compounding]].`,
  ],
  [
    "Essay — The Quiet Compounding",
    "Plans",
    ["writing", "essay"],
    `# The Quiet Compounding

Draft 2. The thesis: small systems, maintained weekly, beat heroic sprints.

## Outline
- The myth of the big push
- Compounding needs a ledger — your [[Weekly Review Ritual]]
- Tools should disappear`,
  ],
  [
    "Reading Notes — Thinking in Systems",
    "Reference notes",
    ["books", "systems"],
    `# Thinking in Systems — Donella Meadows

- A system is more than the sum of its parts.
- **Stocks and flows**: you can only change a stock by changing its flows.
- Leverage points, in increasing order of effectiveness: parameters → feedback loops → goals → paradigms.

Connects to [[North Star 2027]].`,
  ],
  [
    "Reading Notes — Shape Up",
    "Reference notes",
    ["books", "process"],
    `# Shape Up — Basecamp

- Fixed time, variable scope.
- Appetite over estimates.
- Hill charts to show unknowns vs knowns.

Using this for [[Atlas — Client Portal]] cycles.`,
  ],
  [
    "Q4 Review",
    "Reviews",
    ["review", "quarterly"],
    `# Q4 Review

## Wins
- Atlas beta live with 12 studios.
- 3 essays published, newsletter at 2,140 subscribers.

## Misses
- Onboarding still manual.
- Didn't ship the analytics dashboard.

Next: update [[North Star 2027]].`,
  ],
  [
    "October Retrospective",
    "Reviews",
    ["review", "monthly"],
    `# October Retrospective

- Energy dipped mid-month — too many context switches.
- Best day: the deep-work Wednesday with no meetings.
- Keep: Friday [[Weekly Review Ritual]].`,
  ],
  [
    "Hiring Plan — First Engineer",
    "Plans",
    ["hiring", "team"],
    `# Hiring Plan — First Engineer

Profile: product-minded full-stack engineer, comfortable owning [[Atlas — Architecture]].

- Paid trial project, 1 week.
- Decision criteria in [[Decision Log]].`,
  ],
  [
    "Newsletter Playbook",
    "Plans",
    ["writing", "growth"],
    `# Newsletter Playbook

- Publish Tuesdays 8am.
- One idea, one story, one link.
- Repurpose essays from [[Writing System]].`,
  ],
  [
    "Design Principles",
    "Reference notes",
    ["design", "principles"],
    `# Design Principles

1. **Calm by default.** Motion explains, never decorates.
2. **Dense, not cluttered.** Show more with hierarchy, not boxes.
3. **Keyboard first.** Every action ≤ 2 keystrokes away.`,
  ],
  [
    "Supabase Row Level Security Cheatsheet",
    "Reference notes",
    ["engineering", "supabase"],
    "# RLS Cheatsheet\n\n```sql\ncreate policy \"own rows\" on items\n  for all using (auth.uid() = user_id);\n```\n\n- Always enable RLS before exposing a table.\n- Test with the anon key, not the service role.\n\nUsed in [[Atlas — Architecture]].",
  ],
  [
    "Meeting — Studio Nine Kickoff",
    "Projects",
    ["meeting", "atlas"],
    `# Studio Nine Kickoff

Attendees: Maya, Theo, me.

- They'll migrate 6 active clients in December.
- Need: custom email sender, PDF invoice branding.
- Follow-up: send onboarding checklist ([[Atlas — Onboarding Flow]]).`,
  ],
  [
    "Personal Operating Manual",
    "Reference notes",
    ["self", "work"],
    `# Personal Operating Manual

- Best hours: 8–11am. Protect them.
- I think by writing — ask me for a doc, not a call.
- Feedback: direct and specific is kindest.`,
  ],
  [
    "Investor Update — November",
    "Reviews",
    ["investors", "update"],
    `# Investor Update — November

**MRR:** $8.4k (+18% MoM)
**Studios:** 12 beta → 9 paying

Asks: intros to agency operators running 20+ person teams.`,
  ],
  [
    "Health Protocol",
    "Plans",
    ["health", "personal"],
    `# Health Protocol

- Walk 30 minutes before deep work.
- Strength training Mon / Wed / Fri.
- Screens off at 22:30.`,
  ],
  [
    "AI Prompt Library",
    "Reference notes",
    ["ai", "prompts"],
    `# AI Prompt Library

## Summarise meeting
"Summarise this transcript into decisions, open questions and owners."

## Critique draft
"Act as a demanding editor. Point out the three weakest paragraphs and why."`,
  ],
  [
    "Content Calendar — Q1",
    "Plans",
    ["writing", "calendar"],
    `# Content Calendar — Q1

| Week | Piece |
| --- | --- |
| 1 | The Quiet Compounding |
| 3 | Building Atlas in public |
| 5 | Notes on pricing |

Source: [[Newsletter Playbook]].`,
  ],
  [
    "Decision — Drop Mobile App for v1",
    "Decisions",
    ["decisions", "atlas"],
    `# Decision — Drop Mobile App for v1

**Context:** 92% of studio sessions are desktop.
**Decision:** Responsive web only for v1.
**Revisit:** when clients request push notifications.

Logged in [[Decision Log]].`,
  ],
  [
    "Decision — Supabase for Auth",
    "Decisions",
    ["decisions", "engineering"],
    `# Decision — Supabase for Auth

Chosen over rolling our own because RLS gives us tenant isolation for free.
See [[Supabase Row Level Security Cheatsheet]].`,
  ],
];

type IdeaSeed = [title: string, description: string, category: string, tags: string[], status: Idea["status"]];

const IDEA_SEEDS: IdeaSeed[] = [
  ["Automatic invoice reminders", "Send polite nudges 3, 7 and 14 days after due date — tone adapts to client history.", "Product", ["atlas", "billing"], "in-progress"],
  ["Client-facing timeline view", "A cinematic timeline of every deliverable so clients see momentum, not just files.", "Product", ["atlas", "ux"], "thinking"],
  ["Weekly review as a feature", "Turn my Friday ritual into a guided flow inside Atlas for studio owners.", "Product", ["ritual", "atlas"], "thinking"],
  ["Essay: tools should disappear", "Great software fades into the background of the work.", "Writing", ["essay"], "inbox"],
  ["Podcast with studio founders", "10 episodes, 30 minutes, one operational lesson each.", "Growth", ["content", "growth"], "inbox"],
  ["Template marketplace", "Studios sell onboarding templates to each other; we take 15%.", "Business", ["atlas", "revenue"], "thinking"],
  ["Keyboard-first command bar", "Every action reachable with ⌘K. Fuzzy, instant, learns from usage.", "Product", ["ux"], "completed"],
  ["Founder office hours", "Monthly open call for newsletter readers.", "Growth", ["community"], "inbox"],
  ["Morning pages, digitally", "Three pages every morning, auto-tagged and searchable.", "Personal", ["writing", "habit"], "in-progress"],
  ["AI meeting digests", "Pipe transcripts in, get decisions + owners out, filed to the right project.", "Product", ["ai", "meetings"], "in-progress"],
  ["Pricing page rewrite", "Lead with outcomes, not features. Add an ROI calculator.", "Marketing", ["pricing", "atlas"], "thinking"],
  ["Referral credits", "One month free for both sides when a studio refers a studio.", "Growth", ["growth", "revenue"], "inbox"],
  ["Dark-room focus mode", "A full-screen writing mode with ambient sound and nothing else.", "Product", ["ux", "focus"], "completed"],
  ["Book: Systems for Small Studios", "Long-term: compile essays into a short book.", "Writing", ["book"], "inbox"],
  ["Quarterly offsite format", "Two days, one question, no laptops before noon.", "Personal", ["team"], "thinking"],
  ["Open-source the design tokens", "Publish Atlas design tokens as a package for goodwill + hiring.", "Engineering", ["design", "oss"], "inbox"],
  ["Client happiness score", "Single NPS-like question after every milestone.", "Product", ["atlas", "metrics"], "thinking"],
  ["Automated changelog", "Generate weekly changelog from merged PRs, edit before publish.", "Engineering", ["ai", "process"], "completed"],
  ["Studio benchmark report", "Anonymous benchmarks across Atlas studios: turnaround, revisions, payment days.", "Marketing", ["data", "content"], "inbox"],
  ["Voice capture for ideas", "Hold a key, speak, idea appears transcribed and categorised.", "Product", ["ai", "capture"], "thinking"],
  ["Annual letter to myself", "Write in December, open the next December.", "Personal", ["ritual"], "inbox"],
  ["Slack digest integration", "Daily digest of client activity posted to the studio Slack.", "Product", ["integrations"], "archived"],
  ["Minimal CRM inside Atlas", "Pipeline for prospective clients, lightweight.", "Product", ["atlas", "crm"], "archived"],
  ["Learning sprint: Rust", "Two weeks of Rust to build the thumbnail worker.", "Engineering", ["learning"], "inbox"],
  ["Gratitude log", "One line per day. Weekly reread.", "Personal", ["habit"], "completed"],
  ["Studio dinner series", "Quarterly dinners for London studio owners.", "Growth", ["community"], "thinking"],
];

type LinkSeed = [url: string, title: string, description: string, category: string, tags: string[]];

const LINK_SEEDS: LinkSeed[] = [
  ["https://supabase.com/docs/guides/auth/row-level-security", "Row Level Security — Supabase Docs", "Reference for tenant isolation policies.", "Engineering", ["supabase", "security"]],
  ["https://nextjs.org/docs/app", "Next.js App Router", "Routing, layouts and server components.", "Engineering", ["nextjs"]],
  ["https://basecamp.com/shapeup", "Shape Up", "Basecamp's product development method.", "Reading", ["process", "books"]],
  ["https://www.paulgraham.com/makersschedule.html", "Maker's Schedule, Manager's Schedule", "Why meetings cost makers more.", "Reading", ["productivity", "essay"]],
  ["https://stripe.com/docs/billing", "Stripe Billing", "Subscriptions, invoices and dunning.", "Engineering", ["billing", "atlas"]],
  ["https://linear.app/method", "The Linear Method", "Principles for building software with focus.", "Reading", ["process", "design"]],
  ["https://www.refactoringui.com", "Refactoring UI", "Practical design tactics for developers.", "Design", ["design", "books"]],
  ["https://motion.dev", "Motion", "Animation library docs.", "Design", ["animation"]],
  ["https://www.anthropic.com/news", "Anthropic News", "Model releases and research updates.", "AI", ["ai"]],
  ["https://docs.claude.com", "Claude Docs", "API reference for the Claude models.", "AI", ["ai", "docs"]],
  ["https://fs.blog/mental-models", "Mental Models — Farnam Street", "A latticework of models for better thinking.", "Reading", ["thinking"]],
  ["https://www.figma.com/community", "Figma Community", "Files and plugins for inspiration.", "Design", ["design"]],
  ["https://thebookofshaders.com", "The Book of Shaders", "Gentle introduction to fragment shaders.", "Design", ["webgl", "learning"]],
  ["https://web.dev/articles/vitals", "Web Vitals", "Performance metrics that matter.", "Engineering", ["performance"]],
  ["https://www.nngroup.com/articles/ten-usability-heuristics", "10 Usability Heuristics", "Nielsen's classic heuristics.", "Design", ["ux"]],
  ["https://every.to", "Every", "Essays on business, tech and productivity.", "Reading", ["writing"]],
  ["https://tailwindcss.com/docs", "Tailwind CSS", "Utility-first CSS framework docs.", "Engineering", ["css"]],
  ["https://www.lennysnewsletter.com", "Lenny's Newsletter", "Product and growth advice.", "Reading", ["growth", "product"]],
];

type ProjectSeed = {
  title: string;
  description: string;
  status: Project["status"];
  progress: number;
  deadlineInDays?: number;
  color: Project["color"];
  tags: string[];
  pageTitles: string[];
  ideaTitles: string[];
  tasks: Array<[string, boolean]>;
};

const PROJECT_SEEDS: ProjectSeed[] = [
  {
    title: "Atlas v1 Launch",
    description: "Self-serve onboarding, billing and the public launch of the Atlas client portal.",
    status: "active",
    progress: 0,
    deadlineInDays: 24,
    color: "gold",
    tags: ["atlas", "launch"],
    pageTitles: ["Atlas — Client Portal", "Atlas — Architecture", "Atlas — Onboarding Flow", "Pricing Experiments"],
    ideaTitles: ["Automatic invoice reminders", "Pricing page rewrite"],
    tasks: [
      ["Finish onboarding flow", true],
      ["Stripe billing + dunning", true],
      ["Invoice reminders", false],
      ["Pricing page rewrite", false],
      ["Launch post + Product Hunt", false],
    ],
  },
  {
    title: "The Quiet Compounding (essay)",
    description: "Long-form essay on small systems maintained weekly.",
    status: "active",
    progress: 60,
    deadlineInDays: 6,
    color: "violet",
    tags: ["writing"],
    pageTitles: ["Essay — The Quiet Compounding", "Writing System"],
    ideaTitles: ["Essay: tools should disappear"],
    tasks: [],
  },
  {
    title: "Hire First Engineer",
    description: "Find a product-minded full-stack engineer to co-own Atlas.",
    status: "planning",
    progress: 20,
    deadlineInDays: 52,
    color: "blue",
    tags: ["team", "hiring"],
    pageTitles: ["Hiring Plan — First Engineer"],
    ideaTitles: [],
    tasks: [
      ["Write role description", true],
      ["Post to 3 communities", false],
      ["Design trial project", false],
    ],
  },
  {
    title: "AI Meeting Digests",
    description: "Pipe call transcripts in, get decisions, owners and follow-ups filed automatically.",
    status: "active",
    progress: 35,
    deadlineInDays: 18,
    color: "emerald",
    tags: ["ai", "atlas"],
    pageTitles: ["AI Prompt Library", "Meeting — Studio Nine Kickoff"],
    ideaTitles: ["AI meeting digests"],
    tasks: [],
  },
  {
    title: "Newsletter Relaunch",
    description: "New format, new cadence, new landing page.",
    status: "completed",
    progress: 100,
    deadlineInDays: -9,
    color: "rose",
    tags: ["writing", "growth"],
    pageTitles: ["Newsletter Playbook", "Content Calendar — Q1"],
    ideaTitles: [],
    tasks: [
      ["New template", true],
      ["Landing page", true],
      ["Migrate subscribers", true],
    ],
  },
  {
    title: "Health Reset",
    description: "Rebuild energy: sleep, strength, walking.",
    status: "paused",
    progress: 40,
    color: "emerald",
    tags: ["personal", "health"],
    pageTitles: ["Health Protocol"],
    ideaTitles: [],
    tasks: [],
  },
];

const CONVERSATION_SEEDS: Array<[string, string, string, string, number]> = [
  [
    "Atlas pricing strategy",
    "Compared per-seat vs flat pricing. Concluded per-seat at $49 for studios under 10 people, flat tier for agencies. Next step: rewrite pricing page around outcomes.",
    "Decisions",
    "Claude",
    1,
  ],
  [
    "RLS policy review",
    "Walked through Supabase row level security for multi-tenant workspaces. Agreed to scope every table by workspace_id and test with the anon key.",
    "Engineering",
    "Claude",
    2,
  ],
  [
    "Studio Nine kickoff call",
    "Studio Nine will migrate 6 clients in December. They need custom email sender and branded PDF invoices. Follow-up: send onboarding checklist.",
    "Projects",
    "Meeting",
    4,
  ],
  [
    "Essay structure feedback",
    "Restructured 'The Quiet Compounding' into three movements. Cut the opening anecdote; lead with the ledger metaphor.",
    "Writing",
    "Claude",
    6,
  ],
  [
    "Hiring trial project design",
    "Designed a one-week paid trial: build the invoice reminder service end to end. Evaluate on judgment and communication, not speed.",
    "Plans",
    "Claude",
    9,
  ],
  [
    "Q4 planning session",
    "Set three bets for the quarter and moved the mobile app out of scope. Weekly review stays the core ritual.",
    "Reviews",
    "Manual",
    15,
  ],
];

export function createSeed(now = new Date()): Snapshot {
  const rand = mulberry32(42);
  const t = now.getTime();
  // Skewed toward recent: most items in last 60 days, tail to ~200 days.
  const pastIso = (maxDays: number, minDays = 0) => {
    const r = Math.pow(rand(), 1.6);
    return new Date(t - (minDays + r * (maxDays - minDays)) * DAY - rand() * DAY).toISOString();
  };
  const after = (iso: string, maxDays: number) => {
    const base = new Date(iso).getTime();
    const upd = Math.min(t - (2 + rand() * 30) * 3_600_000, base + rand() * maxDays * DAY);
    return new Date(upd).toISOString();
  };
  const id = (p: string, i: number) => `${p}_seed${String(i).padStart(3, "0")}`;

  const pages: Page[] = PAGE_SEEDS.map(([title, category, tags, content, pinned], i) => {
    const createdAt = pastIso(200);
    return {
      id: id("pg", i),
      title,
      content,
      category,
      tags,
      pinned: !!pinned,
      linkIds: [],
      createdAt,
      updatedAt: after(createdAt, 40),
      archived: false,
    };
  });
  // A few pages edited very recently so "updated this week" is alive.
  for (const idx of [0, 3, 6, 7, 12, 20]) {
    pages[idx].updatedAt = new Date(t - rand() * 5 * DAY).toISOString();
  }
  pages.push({
    id: id("pg", 900),
    title: "Old Brand Guidelines",
    content: "# Old Brand Guidelines\n\nSuperseded by [[Design Principles]].",
    category: "Reference notes",
    tags: ["design", "legacy"],
    pinned: false,
    linkIds: [],
    createdAt: pastIso(220, 150),
    updatedAt: pastIso(140, 100),
    archived: true,
  });

  const byTitle = new Map(pages.map((p) => [p.title, p]));

  const ideas: Idea[] = IDEA_SEEDS.map(([title, description, category, tags, status], i) => {
    const createdAt = pastIso(150);
    return {
      id: id("id", i),
      title,
      description,
      category,
      tags,
      status,
      linkIds: [],
      createdAt,
      updatedAt: after(createdAt, 30),
      archived: status === "archived",
    };
  });
  const ideaByTitle = new Map(ideas.map((x) => [x.title, x]));

  const links: LinkItem[] = LINK_SEEDS.map(([url, title, description, category, tags], i) => {
    const createdAt = pastIso(170);
    return { id: id("ln", i), url, title, description, category, tags, linkIds: [], createdAt, updatedAt: createdAt, archived: false };
  });

  const projects: Project[] = PROJECT_SEEDS.map((s, i) => {
    const createdAt = pastIso(120, 20);
    const deadline =
      s.deadlineInDays === undefined ? undefined : new Date(t + s.deadlineInDays * DAY).toISOString().slice(0, 10);
    const p: Project = {
      id: id("pj", i),
      title: s.title,
      description: s.description,
      status: s.status,
      progress: s.progress,
      deadline,
      color: s.color,
      tags: s.tags,
      pageIds: s.pageTitles.map((n) => byTitle.get(n)?.id).filter(Boolean) as string[],
      ideaIds: s.ideaTitles.map((n) => ideaByTitle.get(n)?.id).filter(Boolean) as string[],
      tasks: s.tasks.map(([title, done], k) => ({ id: `${id("tk", i)}_${k}`, title, done })),
      createdAt,
      updatedAt: after(createdAt, 60),
      archived: false,
    };
    for (const ideaId of p.ideaIds) {
      const idea = ideas.find((x) => x.id === ideaId);
      if (idea) idea.projectId = p.id;
    }
    return p;
  });

  // Cross-type connections that make the graph interesting.
  const link = (a: { linkIds: string[] }, bId?: string) => {
    if (bId && !a.linkIds.includes(bId)) a.linkIds.push(bId);
  };
  link(byTitle.get("Atlas — Architecture")!, links[0].id);
  link(byTitle.get("Atlas — Architecture")!, links[1].id);
  link(byTitle.get("Supabase Row Level Security Cheatsheet")!, links[0].id);
  link(byTitle.get("Reading Notes — Shape Up")!, links[2].id);
  link(byTitle.get("Design Principles")!, links[6].id);
  link(byTitle.get("Design Principles")!, links[14].id);
  link(byTitle.get("AI Prompt Library")!, links[9].id);
  link(byTitle.get("Weekly Review Ritual")!, ideaByTitle.get("Weekly review as a feature")!.id);
  link(byTitle.get("Writing System")!, ideaByTitle.get("Morning pages, digitally")!.id);
  link(byTitle.get("Essay — The Quiet Compounding")!, ideaByTitle.get("Essay: tools should disappear")!.id);
  link(ideaByTitle.get("Voice capture for ideas")!, ideaByTitle.get("AI meeting digests")!.id);
  link(ideaByTitle.get("Dark-room focus mode")!, byTitle.get("Design Principles")!.id);
  link(links[13], byTitle.get("Atlas — Architecture")!.id);

  const conversations: Conversation[] = CONVERSATION_SEEDS.map(([title, summary, category, source, d], i) => {
    const date = new Date(t - d * DAY - rand() * 6 * 3_600_000).toISOString();
    return { id: id("cv", i), title, summary, category, source, date, createdAt: date, updatedAt: date };
  });

  // Activity is derived from the data so it stays consistent.
  const activity: Activity[] = [];
  const push = (a: Omit<Activity, "id">) => activity.push({ ...a, id: `ac_${activity.length}` });
  for (const p of pages) {
    push({ kind: "page", action: "created", entityId: p.id, title: p.title, at: p.createdAt });
    if (p.updatedAt !== p.createdAt) push({ kind: "page", action: "updated", entityId: p.id, title: p.title, at: p.updatedAt });
    if (p.archived) push({ kind: "page", action: "archived", entityId: p.id, title: p.title, at: p.updatedAt });
  }
  for (const x of ideas) {
    push({ kind: "idea", action: "created", entityId: x.id, title: x.title, at: x.createdAt });
    if (x.status === "completed") push({ kind: "idea", action: "completed", entityId: x.id, title: x.title, at: x.updatedAt });
    else if (x.status === "archived") push({ kind: "idea", action: "archived", entityId: x.id, title: x.title, at: x.updatedAt });
    else if (x.updatedAt !== x.createdAt) push({ kind: "idea", action: "updated", entityId: x.id, title: x.title, at: x.updatedAt });
  }
  for (const l of links) push({ kind: "link", action: "created", entityId: l.id, title: l.title, at: l.createdAt });
  for (const p of projects) push({ kind: "project", action: "created", entityId: p.id, title: p.title, at: p.createdAt });
  for (const c of conversations) push({ kind: "conversation", action: "created", entityId: c.id, title: c.title, at: c.date });
  activity.sort((a, b) => b.at.localeCompare(a.at));

  return {
    version: SNAPSHOT_VERSION,
    pages,
    ideas,
    links,
    projects,
    conversations,
    activity: activity.slice(0, 300),
    profile: { name: "Alex", email: "", role: "Founder · Northwind Studio" },
    preferences: { reducedMotion: false, showIntro: true },
  };
}

export function emptySnapshot(): Snapshot {
  return {
    version: SNAPSHOT_VERSION,
    pages: [],
    ideas: [],
    links: [],
    projects: [],
    conversations: [],
    activity: [],
    profile: { name: "", email: "", role: "" },
    preferences: { reducedMotion: false, showIntro: true },
  };
}
