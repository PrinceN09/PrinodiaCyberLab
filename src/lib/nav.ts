import {
  LayoutDashboard,
  NotebookText,
  Code2,
  Workflow,
  Library,
  CalendarClock,
  Layers,
  BookMarked,
  FolderKanban,
  Siren,
  Bug,
  ScrollText,
  Radar,
  Crosshair,
  Fingerprint,
  FileText,
  Linkedin,
  Mail,
  Briefcase,
  MessagesSquare,
  FolderGit2,
  GraduationCap,
  Timer,
  Target,
  CalendarCheck,
  User,
  Palette,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

export type NavLeaf = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export type NavSection = {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string; // present = the section header itself is a page
  children?: NavLeaf[];
};

export const NAV: NavSection[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
  },
  {
    id: "learning",
    label: "Learning",
    icon: GraduationCap,
    children: [
      { href: "/notes", label: "Notes / Wiki", icon: NotebookText },
      { href: "/code", label: "Code Workspace", icon: Code2 },
      { href: "/diagrams", label: "Diagram Studio", icon: Workflow },
      { href: "/learning/courses", label: "Course Library", icon: Library },
      { href: "/learning/sessions", label: "Study Sessions", icon: CalendarClock },
      { href: "/learning/flashcards", label: "Flashcards", icon: Layers },
      { href: "/resources", label: "Resources", icon: BookMarked },
    ],
  },
  {
    id: "operations",
    label: "Cyber Operations",
    icon: Radar,
    children: [
      { href: "/projects", label: "Cyber Projects", icon: FolderKanban },
      { href: "/reports/incident", label: "Incident Reports", icon: Siren },
      { href: "/reports/vulnerability", label: "Vulnerability Reports", icon: Bug },
      { href: "/reports/grc", label: "GRC Reports", icon: ScrollText },
      { href: "/operations/siem", label: "SIEM Rules", icon: Radar },
      { href: "/operations/threat-hunting", label: "Threat Hunting", icon: Crosshair },
      { href: "/operations/ioc", label: "IOC Library", icon: Fingerprint },
    ],
  },
  {
    id: "career",
    label: "Career Center",
    icon: Briefcase,
    children: [
      { href: "/career/resume", label: "Resume Builder", icon: FileText },
      { href: "/career/linkedin", label: "LinkedIn Optimization", icon: Linkedin },
      { href: "/career/cover-letters", label: "Cover Letters", icon: Mail },
      { href: "/career/jobs", label: "Job Tracker", icon: Briefcase },
      { href: "/career/interview", label: "Interview Preparation", icon: MessagesSquare },
      { href: "/career/portfolio", label: "Portfolio", icon: FolderGit2 },
    ],
  },
  {
    id: "progress",
    label: "Progress",
    icon: Target,
    children: [
      { href: "/progress", label: "Learning Progress", icon: GraduationCap },
      { href: "/progress/hours", label: "Study Hours", icon: Timer },
      { href: "/progress/goals", label: "Goals", icon: Target },
      { href: "/progress/weekly", label: "Weekly Review", icon: CalendarCheck },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: SlidersHorizontal,
    children: [
      { href: "/settings", label: "Profile", icon: User },
      { href: "/settings/theme", label: "Theme", icon: Palette },
      { href: "/settings/preferences", label: "Preferences", icon: SlidersHorizontal },
    ],
  },
];

/** Which section owns a given pathname (for auto-expanding on load). */
export function sectionForPath(pathname: string): string | null {
  for (const s of NAV) {
    if (s.children?.some((c) => isActive(pathname, c.href))) return s.id;
  }
  return null;
}

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}
