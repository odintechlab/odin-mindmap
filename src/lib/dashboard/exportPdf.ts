import type { DashboardStats } from "@/types/dashboard";
import type { Content, TDocumentDefinitions, TableCell } from "pdfmake/interfaces";

export type ExportLocale = "en" | "mn";

function formatRangeLabel(from: string, to: string): string {
  const parse = (value: string) => {
    const [y, m, d] = value.split("-").map(Number);
    if (!y || !m || !d) return null;
    const date = new Date(y, m - 1, d);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const fromDate = parse(from);
  const toDate = parse(to);
  if (!fromDate || !toDate) return `${from} – ${to}`;
  const sameYear = fromDate.getFullYear() === toDate.getFullYear();
  const fromLabel = fromDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const toLabel = toDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${fromLabel} – ${toLabel}`;
}

type Copy = {
  title: string;
  subtitle: string;
  period: string;
  allTime: string;
  project: string;
  allProjects: string;
  generated: string;
  overview: string;
  totalTasks: string;
  open: string;
  inProgress: string;
  closed: string;
  completionRate: string;
  overdue: string;
  dueThisWeek: string;
  collaborators: string;
  collabTasks: string;
  forecast: string;
  remaining: string;
  velocity: string;
  eta: string;
  confidence: string;
  perWeek: string;
  none: string;
  high: string;
  low: string;
  teamWorkload: string;
  member: string;
  done: string;
  notDone: string;
  milestones: string;
  status: string;
  due: string;
  goals: string;
  progress: string;
  recentCompleted: string;
  task: string;
  list: string;
  footer: string;
};

const COPY: Record<ExportLocale, Copy> = {
  en: {
    title: "Dashboard Report",
    subtitle: "Odin Mindmap",
    period: "Period",
    allTime: "All time",
    project: "Project",
    allProjects: "All projects",
    generated: "Generated",
    overview: "Overview",
    totalTasks: "Total tasks",
    open: "Open",
    inProgress: "In progress",
    closed: "Completed",
    completionRate: "Completion rate",
    overdue: "Overdue",
    dueThisWeek: "Due this week",
    collaborators: "Active collaborators",
    collabTasks: "Collaborative tasks",
    forecast: "Forecast",
    remaining: "Remaining",
    velocity: "Velocity",
    eta: "Estimated completion",
    confidence: "Confidence",
    perWeek: "/ week",
    none: "None",
    high: "High",
    low: "Low",
    teamWorkload: "Team workload",
    member: "Member",
    done: "Done",
    notDone: "Not done",
    milestones: "Milestones",
    status: "Status",
    due: "Due",
    goals: "Goals",
    progress: "Progress",
    recentCompleted: "Recently completed",
    task: "Task",
    list: "List",
    footer: "Confidential — generated from Odin Mindmap",
  },
  mn: {
    title: "Хяналтын самбарын тайлан",
    subtitle: "Odin Mindmap",
    period: "Хугацаа",
    allTime: "Бүх хугацаа",
    project: "Төсөл",
    allProjects: "Бүх төсөл",
    generated: "Үүсгэсэн",
    overview: "Ерөнхий үзүүлэлт",
    totalTasks: "Нийт даалгавар",
    open: "Нээлттэй",
    inProgress: "Хийгдэж буй",
    closed: "Дууссан",
    completionRate: "Гүйцэтгэлийн хувь",
    overdue: "Хугацаа хэтэрсэн",
    dueThisWeek: "Энэ долоо хоногт",
    collaborators: "Идэвхтэй гишүүд",
    collabTasks: "Хамтарсан даалгавар",
    forecast: "Таамаглал",
    remaining: "Үлдсэн",
    velocity: "Хурд",
    eta: "Дуусах төлөвлөгөөт огноо",
    confidence: "Итгэлцүүр",
    perWeek: "/ долоо хоног",
    none: "Байхгүй",
    high: "Өндөр",
    low: "Бага",
    teamWorkload: "Багийн ачаалал",
    member: "Гишүүн",
    done: "Дууссан",
    notDone: "Үлдсэн",
    milestones: "Үе шатууд",
    status: "Төлөв",
    due: "Дуусах огноо",
    goals: "Зорилтууд",
    progress: "Явц",
    recentCompleted: "Саяхан дууссан",
    task: "Даалгавар",
    list: "Жагсаалт",
    footer: "Нууцлалтай — Odin Mindmap-аас үүсгэсэн",
  },
};

function formatDate(isoOrMs: string | null | undefined, locale: ExportLocale): string {
  if (!isoOrMs) return "—";
  const ms = Number(isoOrMs);
  const d =
    Number.isFinite(ms) && ms > 1e10
      ? new Date(ms)
      : new Date(isoOrMs.includes("T") ? isoOrMs : `${isoOrMs}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale === "mn" ? "mn-MN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function confidenceLabel(
  confidence: DashboardStats["forecast"]["confidence"],
  t: Copy,
): string {
  if (confidence === "high") return t.high;
  if (confidence === "low") return t.low;
  return t.none;
}

function sectionHeading(text: string): Content {
  return {
    text: text.toUpperCase(),
    style: "section",
    margin: [0, 16, 0, 8],
  };
}

function kpiGrid(items: Array<[string, string]>, columnsPerRow = 3): Content {
  const columns = items.map(([label, value]) => ({
    width: "*" as const,
    stack: [
      { text: label.toUpperCase(), style: "kpiLabel" },
      { text: value, style: "kpiValue", margin: [0, 2, 0, 0] as [number, number, number, number] },
    ],
    style: "kpiBox",
  }));

  const rows: Content[] = [];
  for (let i = 0; i < columns.length; i += columnsPerRow) {
    rows.push({
      columns: columns.slice(i, i + columnsPerRow),
      columnGap: 8,
      margin: [0, 0, 0, 8],
    });
  }
  return { stack: rows };
}

function table(
  headers: string[],
  rows: string[][],
  widths: Array<number | "*" | "auto">,
  rightAlignFrom = 1,
): Content {
  const head: TableCell[] = headers.map((h, i) => ({
    text: h.toUpperCase(),
    style: "th",
    alignment: i >= rightAlignFrom ? "right" : "left",
  }));
  const body: TableCell[][] = [
    head,
    ...rows.map((row) =>
      row.map((cell, i) => ({
        text: cell,
        style: "td",
        alignment: (i >= rightAlignFrom ? "right" : "left") as "left" | "right",
      })),
    ),
  ];
  return {
    table: {
      headerRows: 1,
      widths,
      body,
    },
    layout: {
      hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length ? 0.6 : 0.4),
      vLineWidth: () => 0,
      hLineColor: () => "#e4e4e7",
      paddingLeft: () => 4,
      paddingRight: () => 4,
      paddingTop: () => 5,
      paddingBottom: () => 5,
    },
  };
}

function buildDocDefinition(
  stats: DashboardStats,
  locale: ExportLocale,
  options?: { projectName?: string | null },
): TDocumentDefinitions {
  const t = COPY[locale];
  const period =
    stats.from && stats.to ? formatRangeLabel(stats.from, stats.to) : t.allTime;
  const project = options?.projectName ?? t.allProjects;
  const { totals, forecast, teamWorkload, milestones, goals, recentActivity } =
    stats;

  const eta =
    forecast.estimatedCompletion
      ? formatDate(forecast.estimatedCompletion, locale)
      : "—";
  const velocity =
    forecast.velocityPerWeek != null
      ? `${forecast.velocityPerWeek}${t.perWeek}`
      : "—";

  const content: Content[] = [
    {
      columns: [
        {
          stack: [
            { text: t.subtitle.toUpperCase(), style: "brand" },
            { text: t.title, style: "title", margin: [0, 4, 0, 0] },
          ],
        },
        {
          width: "auto",
          alignment: "right",
          stack: [
            { text: [{ text: `${t.period}: `, bold: true }, period], style: "meta" },
            { text: [{ text: `${t.project}: `, bold: true }, project], style: "meta" },
            {
              text: [
                { text: `${t.generated}: `, bold: true },
                formatDate(stats.generatedAt, locale),
              ],
              style: "meta",
            },
          ],
        },
      ],
      margin: [0, 0, 0, 8],
    },
    {
      canvas: [
        {
          type: "line",
          x1: 0,
          y1: 0,
          x2: 515,
          y2: 0,
          lineWidth: 2,
          lineColor: "#312e81",
        },
      ],
      margin: [0, 0, 0, 8],
    },

    sectionHeading(t.overview),
    kpiGrid([
      [t.totalTasks, String(totals.total)],
      [t.open, String(totals.open)],
      [t.inProgress, String(totals.inProgress)],
      [t.closed, String(totals.closed)],
      [t.completionRate, `${totals.completionRate}%`],
      [t.overdue, String(totals.overdue)],
      [t.dueThisWeek, String(totals.dueThisWeek)],
      [t.collaborators, String(totals.activeCollaborators)],
      [t.collabTasks, String(totals.collabTasks)],
    ]),

    sectionHeading(t.forecast),
    kpiGrid(
      [
        [t.remaining, String(forecast.remaining)],
        [t.velocity, velocity],
        [t.eta, eta],
        [t.confidence, confidenceLabel(forecast.confidence, t)],
      ],
      4,
    ),
  ];

  if (teamWorkload.length > 0) {
    content.push(
      sectionHeading(t.teamWorkload),
      table(
        [t.member, t.done, t.notDone, t.progress],
        teamWorkload
          .slice(0, 25)
          .map((m) => [m.name, String(m.done), String(m.notDone), `${m.completionPct}%`]),
        ["*", 50, 55, 55],
      ),
    );
  }

  if (milestones.length > 0) {
    content.push(
      sectionHeading(t.milestones),
      table(
        [t.task, t.status, t.due],
        milestones
          .slice(0, 20)
          .map((m) => [m.name, m.status.label, formatDate(m.dueDate, locale)]),
        ["*", 90, 80],
        3,
      ),
    );
  }

  if (goals.length > 0) {
    content.push(
      sectionHeading(t.goals),
      table(
        [t.task, t.progress],
        goals
          .slice(0, 15)
          .map((g) => [g.name, `${Math.round(g.percentComplete)}%`]),
        ["*", 60],
      ),
    );
  }

  if (recentActivity.completed.length > 0) {
    content.push(
      sectionHeading(t.recentCompleted),
      table(
        [t.task, t.list],
        recentActivity.completed
          .slice(0, 15)
          .map((task) => [task.name, task.listName ?? "—"]),
        ["*", 120],
        2,
      ),
    );
  }

  content.push({
    columns: [
      { text: t.footer, style: "footer" },
      { text: period, style: "footer", alignment: "right" },
    ],
    margin: [0, 24, 0, 0],
  });

  return {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40],
    defaultStyle: {
      font: "Roboto",
      fontSize: 10,
      color: "#18181b",
    },
    styles: {
      brand: {
        fontSize: 9,
        bold: true,
        color: "#6366f1",
        characterSpacing: 1,
      },
      title: {
        fontSize: 18,
        bold: true,
      },
      meta: {
        fontSize: 9,
        color: "#52525b",
        lineHeight: 1.35,
      },
      section: {
        fontSize: 10,
        bold: true,
        color: "#4338ca",
        characterSpacing: 0.6,
      },
      kpiLabel: {
        fontSize: 8,
        color: "#71717a",
        characterSpacing: 0.4,
      },
      kpiValue: {
        fontSize: 14,
        bold: true,
      },
      kpiBox: {
        margin: [0, 0, 0, 0],
      },
      th: {
        fontSize: 8,
        bold: true,
        color: "#71717a",
      },
      td: {
        fontSize: 9,
      },
      footer: {
        fontSize: 8,
        color: "#71717a",
      },
    },
    content,
  };
}

function fileName(stats: DashboardStats, locale: ExportLocale): string {
  const stamp =
    stats.from && stats.to
      ? `${stats.from}_${stats.to}`
      : formatDate(stats.generatedAt, "en").replace(/[^a-zA-Z0-9]+/g, "-");
  return `odin-dashboard-${locale}-${stamp}.pdf`;
}

type PdfMakeApi = typeof import("pdfmake");

let pdfMakeReady: Promise<PdfMakeApi> | null = null;

async function getPdfMake(): Promise<PdfMakeApi> {
  if (!pdfMakeReady) {
    pdfMakeReady = (async () => {
      const pdfMakeMod = await import("pdfmake/build/pdfmake");
      const pdfFontsMod = await import("pdfmake/build/vfs_fonts");
      const pdfMake = (pdfMakeMod.default ?? pdfMakeMod) as PdfMakeApi;
      const vfs =
        ("default" in pdfFontsMod ? pdfFontsMod.default : pdfFontsMod) as
          import("pdfmake/interfaces").TVirtualFileSystem;
      pdfMake.addVirtualFileSystem(vfs);
      return pdfMake;
    })();
  }
  return pdfMakeReady;
}

/** Generates a PDF and triggers a direct file download (no popup / print dialog). */
export async function exportDashboardPdf(
  stats: DashboardStats,
  locale: ExportLocale,
  options?: { projectName?: string | null },
): Promise<void> {
  const pdfMake = await getPdfMake();
  const doc = buildDocDefinition(stats, locale, options);
  const pdf = pdfMake.createPdf(doc);
  await pdf.download(fileName(stats, locale));
}
