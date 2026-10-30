import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import siteConfig from '../../site.config';
import type { DataSub, GitHubRepo, Project, Section } from './types';

export type Topics = { software: string; dataScience: string; dataEngineering: string };
export type Tags = Readonly<Partial<Record<string, string>>>;
export type Warn = (message: string) => void;

export interface Placement {
  section: Section;
  sub?: DataSub;
  tag?: string;
}

export interface Projects {
  software: Project[];
  data: Project[];
}

const API = 'https://api.github.com';

const defaultWarn: Warn = (message) => console.warn(`[portfolio] ${message}`);

/** GITHUB_TOKEN if set (CI), else the local `gh` login, else unauthenticated. */
export function resolveToken(): string | undefined {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || undefined;
  } catch {
    return undefined;
  }
}

/** Returns the URL of the next page from a GitHub `Link` header, if any. */
export function parseNextLink(header: string | null): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(',')) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="next"/);
    if (match) return match[1];
  }
  return undefined;
}

interface FetchOptions {
  username?: string;
  token?: string;
  fetchImpl?: typeof fetch;
}

/** Fetches every repo the user owns, following pagination. Throws on any API error. */
export async function fetchRepos({
  username = siteConfig.githubUsername,
  token,
  fetchImpl = fetch,
}: FetchOptions = {}): Promise<GitHubRepo[]> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': `${username}-portfolio`,
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const repos: GitHubRepo[] = [];
  let url: string | undefined =
    `${API}/users/${encodeURIComponent(username)}/repos?type=owner&per_page=100&sort=pushed`;

  while (url) {
    const res = await fetchImpl(url, { headers });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`GitHub API request failed: ${res.status} ${res.statusText} for ${url}\n${body}`);
    }
    repos.push(...((await res.json()) as GitHubRepo[]));
    url = parseNextLink(res.headers.get('link'));
  }
  return repos;
}

/**
 * Decides whether a repo appears on the site and where. Only public repos with a
 * portfolio topic are placed; with several, the first in the order software, data
 * science, data engineering wins and a warning is logged.
 */
export function classifyRepo(
  repo: GitHubRepo,
  topics: Topics = siteConfig.topics,
  warn: Warn = defaultWarn,
): Placement | null {
  if (repo.private) return null;

  const repoTopics = repo.topics ?? [];
  const ordered = [topics.software, topics.dataScience, topics.dataEngineering];
  const matches = ordered.filter((topic) => repoTopics.includes(topic));
  if (matches.length === 0) return null;
  if (matches.length > 1) {
    warn(`${repo.name} has several portfolio topics (${matches.join(', ')}); using ${matches[0]}.`);
  }

  switch (matches[0]) {
    case topics.dataScience:
      return { section: 'data', sub: 'ds', tag: 'ds' };
    case topics.dataEngineering:
      return { section: 'data', sub: 'de', tag: 'de' };
    default: {
      const tag = repoTopics.find((topic) => !ordered.includes(topic) && !topic.startsWith('portfolio-'));
      return tag ? { section: 'software', tag } : { section: 'software' };
    }
  }
}

/** Applies the tag set for this repo in the config, if any, over the default one; '' removes it. */
export function applyTag(placement: Placement, repoName: string, tags: Tags = siteConfig.tags): Placement {
  const tag = tags[repoName];
  if (tag === undefined) return placement;
  const { tag: _default, ...rest } = placement;
  return tag ? { ...rest, tag } : rest;
}

export function toProject(repo: GitHubRepo, placement: Placement, warn: Warn = defaultWarn): Project {
  const description = repo.description?.trim() || null;
  if (!description) warn(`${repo.name} has no description.`);

  const homepage = repo.homepage?.trim();
  return {
    name: repo.name,
    description,
    url: repo.html_url,
    ...(homepage ? { homepage } : {}),
    ...(repo.language ? { language: repo.language } : {}),
    ...placement,
    pushedAt: new Date(repo.pushed_at),
  };
}

interface BuildOptions {
  topics?: Topics;
  tags?: Tags;
  warn?: Warn;
}

/** Classifies repos into the two sections, each sorted newest push first. */
export function buildProjects(
  repos: GitHubRepo[],
  { topics = siteConfig.topics, tags = siteConfig.tags, warn = defaultWarn }: BuildOptions = {},
): Projects {
  const projects: Projects = { software: [], data: [] };
  const unusedTags = new Set(Object.keys(tags));
  for (const repo of repos) {
    const placement = classifyRepo(repo, topics, warn);
    if (!placement) continue;
    unusedTags.delete(repo.name);
    projects[placement.section].push(toProject(repo, applyTag(placement, repo.name, tags), warn));
  }
  for (const name of unusedTags) warn(`A tag is set for ${name}, which isn't on the portfolio.`);
  const newestFirst = (a: Project, b: Project) =>
    b.pushedAt.getTime() - a.pushedAt.getTime() || a.name.localeCompare(b.name);
  projects.software.sort(newestFirst);
  projects.data.sort(newestFirst);
  return projects;
}

/**
 * Loads repos from the GitHub API, or from the JSON file named by REPOS_FILE
 * (handy for previewing a tagging plan offline).
 */
export async function loadRepos(): Promise<GitHubRepo[]> {
  const file = process.env.REPOS_FILE;
  if (file) {
    defaultWarn(`Using repos from ${file} instead of the GitHub API.`);
    return JSON.parse(await readFile(file, 'utf8')) as GitHubRepo[];
  }
  return fetchRepos({ token: resolveToken() });
}

let cached: Promise<Projects> | undefined;

/** The site's projects, fetched once per build and shared by every page. */
export function getProjects(): Promise<Projects> {
  cached ??= loadRepos().then((repos) => buildProjects(repos));
  return cached;
}

const monthYear = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const dayMonthYear = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** Formats a date like `Oct 2026`. */
export function formatMonth(date: Date): string {
  return monthYear.format(date);
}

/** Formats a date like `Oct 30, 2026`. */
export function formatDay(date: Date): string {
  return dayMonthYear.format(date);
}
