/**
 * Type definitions for src/data/content.json
 *
 * This is the single source of truth for the content schema.
 * All site copy lives in content.json — these types enforce its shape at build time.
 */

export type AccentColor = 'blue' | 'sage' | 'peach' | 'lavender' | 'gold';

// ── Navigation ─────────────────────────────────────────────────────────────

export interface NavLink {
  name: string;
  url: string;
  newTab?: boolean;
}

export interface NavCta {
  label: string;
  href: string;
}

export interface Navigation {
  links: NavLink[];
  cta: NavCta;
}

// ── Hero ───────────────────────────────────────────────────────────────────

export interface HeroSecondaryAction {
  label: string;
  href: string;
}

export interface Hero {
  title: string;
  subtitle: string;
  cta: string;
  secondaryCta: HeroSecondaryAction;
}

// ── Areas ──────────────────────────────────────────────────────────────────

export interface AreaItem {
  id: string;
  title: string;
  tags: string[];
  description: string;
  accent: AccentColor;
}

export interface Areas {
  header: string;
  items: AreaItem[];
}

// ── Projects ───────────────────────────────────────────────────────────────

export interface ProjectItem {
  title: string;
  subtitle: string;
  description: string;
  image: string;
  cta: string;
  url: string;
  accent: AccentColor;
}

export interface Projects {
  header: string;
  items: ProjectItem[];
}

// ── About ──────────────────────────────────────────────────────────────────

export interface About {
  title: string;
  paragraphs: string[];
  quote: string;
}

// ── Get Involved ───────────────────────────────────────────────────────────

export type GetInvolvedTheme = 'volunteer' | 'donate' | 'partner';

export interface GetInvolvedOption {
  title: string;
  description: string;
  cta: string;
  url: string;
  theme: GetInvolvedTheme;
}

export interface GetInvolved {
  heading: string;
  intro: string;
  options: GetInvolvedOption[];
}

// ── FAQ ────────────────────────────────────────────────────────────────────

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQ {
  heading: string;
  items: FAQItem[];
}

// ── Contact ────────────────────────────────────────────────────────────────

export interface Contact {
  heading: string;
  description: string;
}

// ── Footer ─────────────────────────────────────────────────────────────────

export interface FooterLink {
  name: string;
  url: string;
}

export interface FooterOrg {
  name: string;
  city: string;
  nip: string;
  krs: string;
}

export interface Footer {
  description: string;
  tagline: string;
  org: FooterOrg;
  legal: FooterLink[];
  connect: FooterLink[];
  copyright: string;
}

// ── Root ───────────────────────────────────────────────────────────────────

export interface Content {
  navigation: Navigation;
  hero: Hero;
  areas: Areas;
  projects: Projects;
  about: About;
  getInvolved: GetInvolved;
  faq: FAQ;
  contact: Contact;
  footer: Footer;
}
