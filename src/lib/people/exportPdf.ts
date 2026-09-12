import type { Content, TDocumentDefinitions, TableCell } from "pdfmake/interfaces";
import { APP_TIMEZONE, formatHourRange } from "@/lib/datetime";
import { INSIGHT_MESSAGE_KEYS } from "@/lib/people/metrics";
import { translate } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/locale";
import type { MessageKey } from "@/lib/i18n/messages";
import type {
  MemberPerformance,
  PerformanceGradeLevel,
  PerformanceGradeReasonId,
} from "@/types/people";

export type ExportLocale = Locale;

type Copy = {
  title: string;
  subtitle: string;
  period: string;
  allTime: string;
  project: string;
  allProjects: string;
  generated: string;
  overall: string;
  score: string;
  kpis: string;
  completed: string;
  open: string;
  completionRate: string;
  overdue: string;
  stale: string;
  onTime: string;
  throughput: string;
  touchDays: string;
  mostActive: string;
  collaboration: string;
  insights: string;
  recentCompleted: string;
  overdueTasks: string;
  task: string;
  list: string;
  status: string;
  completedOn: string;
  none: string;
  footer: string;
};

const GRADE_LABEL: Record<ExportLocale, Record<PerformanceGradeLevel, string>> = {
  en: {
    good: "Good",
    average: "Average",
    bad: "Needs attention",
    insufficient: "No data",
  },
  mn: {
    good: "Сайн",
    average: "Дунд",
    bad: "Анхаарах",
    insufficient: "Өгөгдөлгүй",
  },
};

const REASON_LABEL: Record<
  ExportLocale,
  Record<PerformanceGradeReasonId, string>
> = {
  en: {
    noData: "No assigned tasks in this period.",
    inactive: "No recent activity. Open work looks abandoned.",
    overdueHeavy: "Too much open work is past due.",
    overdueOpen: "Open work is past due.",
    staleWork: "Several open tasks have gone stale.",
    coldActivity: "Little recent task activity.",
    lateDelivery: "Many finished tasks missed their due date.",
    onTrack: "Delivery, load, and activity look healthy.",
    steady: "Mixed signals: steady but not standout.",
    mixed: "Signals are mixed across delivery and load.",
  },
  mn: {
    noData: "Энэ хугацаанд хариуцсан даалгавар алга.",
    inactive: "Саяхны идэвх байхгүй. Нээлттэй ажил орхигдсон харагдана.",
    overdueHeavy: "Нээлттэй ажлын ихэнх нь хугацаа хэтэрсэн.",
    overdueOpen: "Нээлттэй ажил хугацаа хэтэрсэн.",
    staleWork: "Хэд хэдэн нээлттэй даалгавар хуучирсан.",
    coldActivity: "Саяхны даалгаврын идэвх бага.",
    lateDelivery: "Дууссан олон даалгавар хугацаандаа амжаагүй.",
    onTrack: "Гүйцэтгэл, ачаалал, идэвх хэвийн харагдаж байна.",
    steady: "Холимог дохио: тогтвортой боловч онцгүй.",
    mixed: "Гүйцэтгэл болон ачааллын дохио холимог.",
  },
};

const COPY: Record<ExportLocale, Copy> = {
  en: {
    title: "Performance report",
    subtitle: "Odin Mindmap",
    period: "Period",
    allTime: "All time",
    project: "Project",
    allProjects: "All projects",
    generated: "Generated",
    overall: "Overall signal",
    score: "Score",
    kpis: "Key metrics",
    completed: "Completed",
    open: "Open / in progress",
    completionRate: "Completion rate",
    overdue: "Overdue",
    stale: "Stale",
    onTime: "On time",
    throughput: "Throughput / week",
    touchDays: "Touch days",
    mostActive: "Most active hour",
    collaboration: "Collaboration",
    insights: "What to look at",
    recentCompleted: "Recently completed",
    overdueTasks: "Overdue tasks",
    task: "Task",
    list: "List",
    status: "Status",
    completedOn: "Completed",
    none: "None",
    footer: "Confidential. Generated from Odin Mindmap",
  },
  mn: {
    title: "Гүйцэтгэлийн тайлан",
    subtitle: "Odin Mindmap",
    period: "Хугацаа",
    allTime: "Бүх хугацаа",
    project: "Төсөл",
    allProjects: "Бүх төсөл",
    generated: "Үүсгэсэн",
    overall: "Ерөнхий үнэлгээ",
    score: "Оноо",
    kpis: "Гол үзүүлэлт",
    completed: "Дууссан",
    open: "Нээлттэй / хийгдэж буй",
    completionRate: "Гүйцэтгэлийн хувь",
    overdue: "Хугацаа хэтэрсэн",
    stale: "Хуучирсан",
    onTime: "Хугацаандаа",
    throughput: "7 хоногийн гүйцэтгэл",
    touchDays: "Хөндсөн өдөр",
    mostActive: "Хамгийн идэвхтэй цаг",
    collaboration: "Хамтын ажиллагаа",
    insights: "Анхаарах зүйлс",
    recentCompleted: "Саяхан дууссан",
    overdueTasks: "Хугацаа хэтэрсэн даалгавар",
    task: "Даалгавар",
    list: "Жагсаалт",
    status: "Төлөв",
    completedOn: "Дууссан огноо",
    none: "Байхгүй",
    footer: "Нууцлалтай. Odin Mindmap-аас үүсгэсэн",
  },
};

function formatRangeLabel(from: string, to: string, locale: ExportLocale): string {
  const parse = (value: string) => {
    const [y, m, d] = value.split("-").map(Number);
    if (!y || !m || !d) return null;
    const date = new Date(y, m - 1, d);
    return Number.isNaN(date.getTime()) ? null : date;
  };
  const fromDate = parse(from);
  const toDate = parse(to);
  if (!fromDate || !toDate) return `${from} – ${to}`;
  const loc = locale === "mn" ? "mn-MN" : "en-US";
  const sameYear = fromDate.getFullYear() === toDate.getFullYear();
  const fromLabel = fromDate.toLocaleDateString(loc, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
  const toLabel = toDate.toLocaleDateString(loc, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${fromLabel} – ${toLabel}`;
}

function formatDate(isoOrMs: string | null | undefined, locale: ExportLocale): string {
  if (!isoOrMs) return "-";
  const ms = Number(isoOrMs);
  const d =
    Number.isFinite(ms) && ms > 1e10
      ? new Date(ms)
      : new Date(String(isoOrMs).includes("T") ? isoOrMs : `${isoOrMs}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(locale === "mn" ? "mn-MN" : "en-US", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function sectionHeading(text: string): Content {
  return {
    text: text.toUpperCase(),
    style: "section",
    margin: [0, 16, 0, 8],
  };
}

function kpiGrid(items: Array<[string, string]>): Content {
  const columns = items.map(([label, value]) => ({
    width: "*" as const,
    stack: [
      { text: label.toUpperCase(), style: "kpiLabel" },
      {
        text: value,
        style: "kpiValue",
        margin: [0, 2, 0, 0] as [number, number, number, number],
      },
    ],
    style: "kpiBox",
  }));

  const rows: Content[] = [];
  for (let i = 0; i < columns.length; i += 3) {
    rows.push({
      columns: columns.slice(i, i + 3),
      columnGap: 10,
      margin: [0, 0, 0, 8],
    });
  }
  return { stack: rows };
}

function taskTable(
  tasks: MemberPerformance["completedTasks"],
  t: Copy,
  locale: ExportLocale,
  options?: { includeCompletedOn?: boolean },
): Content {
  if (tasks.length === 0) {
    return { text: t.none, style: "muted", margin: [0, 0, 0, 4] };
  }
  const withDate = options?.includeCompletedOn === true;
  const body: TableCell[][] = [
    withDate
      ? [
          { text: t.task, style: "tableHeader" },
          { text: t.list, style: "tableHeader" },
          { text: t.completedOn, style: "tableHeader" },
          { text: t.status, style: "tableHeader" },
        ]
      : [
          { text: t.task, style: "tableHeader" },
          { text: t.list, style: "tableHeader" },
          { text: t.status, style: "tableHeader" },
        ],
    ...tasks.slice(0, 12).map((task) =>
      withDate
        ? [
            { text: task.name, style: "tableCell" },
            { text: task.listName ?? "-", style: "tableCell" },
            { text: formatDate(task.dateDone, locale), style: "tableCell" },
            { text: task.status.label, style: "tableCell" },
          ]
        : [
            { text: task.name, style: "tableCell" },
            { text: task.listName ?? "-", style: "tableCell" },
            { text: task.status.label, style: "tableCell" },
          ],
    ),
  ];
  return {
    table: {
      headerRows: 1,
      widths: withDate ? ["*", "auto", "auto", "auto"] : ["*", "auto", "auto"],
      body,
    },
    layout: "lightHorizontalLines",
  };
}

function buildDocDefinition(
  stats: MemberPerformance,
  locale: ExportLocale,
  options?: { projectName?: string | null },
): TDocumentDefinitions {
  const t = COPY[locale];
  const period =
    stats.from && stats.to
      ? formatRangeLabel(stats.from, stats.to, locale)
      : t.allTime;
  const project = options?.projectName ?? t.allProjects;
  const { kpis, grade } = stats;
  const gradeLabel =
    grade.reasonId === "inactive"
      ? locale === "mn"
        ? "Идэвхгүй"
        : "Inactive"
      : GRADE_LABEL[locale][grade.level];
  const reason = REASON_LABEL[locale][grade.reasonId];

  const insightLines = stats.insights.map((insight) =>
    translate(locale, INSIGHT_MESSAGE_KEYS[insight.id] as MessageKey, insight.params),
  );

  const content: Content[] = [
    { text: t.title, style: "title" },
    { text: t.subtitle, style: "subtitle", margin: [0, 2, 0, 12] },
    {
      columns: [
        {
          width: "*",
          stack: [
            { text: stats.member.name, style: "memberName" },
            {
              text: `${t.period}: ${period}  ·  ${t.project}: ${project}`,
              style: "meta",
              margin: [0, 4, 0, 0],
            },
            {
              text: `${t.generated}: ${formatDate(stats.generatedAt, locale)}`,
              style: "meta",
              margin: [0, 2, 0, 0],
            },
          ],
        },
      ],
    },
    sectionHeading(t.overall),
    {
      stack: [
        { text: gradeLabel, style: "gradeValue" },
        {
          text:
            grade.level === "insufficient"
              ? reason
              : `${t.score} ${grade.score}/100: ${reason}`,
          style: "muted",
          margin: [0, 4, 0, 0],
        },
      ],
      style: "gradeBox",
    },
    sectionHeading(t.kpis),
    kpiGrid([
      [t.completed, String(kpis.completed)],
      [t.open, String(kpis.open + kpis.inProgress)],
      [t.completionRate, `${kpis.completionRate}%`],
      [t.overdue, String(kpis.overdue)],
      [t.stale, String(kpis.stale)],
      [
        t.onTime,
        kpis.onTimeRate !== null ? `${kpis.onTimeRate}%` : "-",
      ],
      [
        t.throughput,
        kpis.throughputPerWeek !== null ? String(kpis.throughputPerWeek) : "-",
      ],
      [t.touchDays, String(kpis.touchDays)],
      [
        t.mostActive,
        kpis.peakActiveHour !== null
          ? formatHourRange(kpis.peakActiveHour)
          : "-",
      ],
      [t.collaboration, String(kpis.collabTasks)],
    ]),
  ];

  if (insightLines.length > 0) {
    content.push(sectionHeading(t.insights));
    content.push({
      ul: insightLines,
      style: "body",
      margin: [0, 0, 0, 4],
    });
  }

  content.push(sectionHeading(t.overdueTasks));
  content.push(taskTable(stats.overdueTasks, t, locale));
  content.push(sectionHeading(t.recentCompleted));
  content.push(
    taskTable(stats.completedTasks, t, locale, { includeCompletedOn: true }),
  );
  content.push({
    text: t.footer,
    style: "footer",
    margin: [0, 24, 0, 0],
  });

  return {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 48],
    defaultStyle: {
      font: "Roboto",
      fontSize: 10,
      color: "#18181b",
    },
    styles: {
      title: { fontSize: 20, bold: true },
      subtitle: { fontSize: 10, color: "#71717a" },
      memberName: { fontSize: 16, bold: true },
      meta: { fontSize: 9, color: "#71717a" },
      section: { fontSize: 9, bold: true, color: "#0071e3", characterSpacing: 0.6 },
      gradeBox: {
        fillColor: "#f4f4f5",
        margin: [0, 0, 0, 4],
      },
      gradeValue: { fontSize: 18, bold: true },
      kpiBox: {
        fillColor: "#fafafa",
        margin: [0, 0, 0, 0],
      },
      kpiLabel: { fontSize: 7, color: "#71717a", bold: true },
      kpiValue: { fontSize: 14, bold: true },
      tableHeader: { bold: true, fontSize: 9, color: "#3f3f46" },
      tableCell: { fontSize: 9 },
      body: { fontSize: 10, lineHeight: 1.35 },
      muted: { fontSize: 9, color: "#71717a" },
      footer: { fontSize: 8, color: "#71717a" },
    },
    content,
  };
}

function fileName(stats: MemberPerformance, locale: ExportLocale): string {
  const slug = stats.member.name
    .toLowerCase()
    .replace(/[^a-z0-9а-яөүё]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const stamp =
    stats.from && stats.to
      ? `${stats.from}_${stats.to}`
      : formatDate(stats.generatedAt, "en").replace(/[^a-zA-Z0-9]+/g, "-");
  return `odin-performance-${slug || stats.member.id}-${locale}-${stamp}.pdf`;
}

type PdfMakeApi = typeof import("pdfmake");

let pdfMakeReady: Promise<PdfMakeApi> | null = null;

async function getPdfMake(): Promise<PdfMakeApi> {
  if (!pdfMakeReady) {
    pdfMakeReady = (async () => {
      const pdfMakeMod = await import("pdfmake/build/pdfmake");
      const pdfFontsMod = await import("pdfmake/build/vfs_fonts");
      const pdfMake = (pdfMakeMod.default ?? pdfMakeMod) as PdfMakeApi;
      const vfs = (
        "default" in pdfFontsMod ? pdfFontsMod.default : pdfFontsMod
      ) as import("pdfmake/interfaces").TVirtualFileSystem;
      pdfMake.addVirtualFileSystem(vfs);
      return pdfMake;
    })();
  }
  return pdfMakeReady;
}

export async function exportPerformancePdf(
  stats: MemberPerformance,
  locale: ExportLocale,
  options?: { projectName?: string | null },
): Promise<void> {
  const pdfMake = await getPdfMake();
  const doc = buildDocDefinition(stats, locale, options);
  const pdf = pdfMake.createPdf(doc);
  await pdf.download(fileName(stats, locale));
}
