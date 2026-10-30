import { describe, expect, it, vi } from 'vitest';
import { buildProjects, classifyRepo, fetchRepos, formatMonth, parseNextLink, toProject } from './github';
import type { GitHubRepo } from './types';
import fixture from './fixtures/repos.json';

const repos = fixture as GitHubRepo[];
const topics = {
  software: 'portfolio-software',
  dataScience: 'portfolio-data-science',
  dataEngineering: 'portfolio-data-engineering',
};
const repo = (name: string) => repos.find((r) => r.name === name)!;

describe('classifyRepo', () => {
  it('places software repos and tags them with their first other topic', () => {
    expect(classifyRepo(repo('web-app'), topics)).toEqual({ section: 'software', tag: 'astro' });
  });

  it('leaves the tag off software repos with no other topic', () => {
    expect(classifyRepo(repo('cli-tool'), topics)).toEqual({ section: 'software' });
  });

  it('places data science and data engineering repos in Data with ds/de tags', () => {
    expect(classifyRepo(repo('ml-notebook'), topics)).toEqual({ section: 'data', sub: 'ds', tag: 'ds' });
    expect(classifyRepo(repo('etl-pipeline'), topics)).toEqual({ section: 'data', sub: 'de', tag: 'de' });
  });

  it('skips repos without a portfolio topic, even with a similar general topic', () => {
    expect(classifyRepo(repo('untagged'), topics)).toBeNull();
  });

  it('skips private repos even when tagged', () => {
    expect(classifyRepo(repo('secret'), topics)).toBeNull();
  });

  it('includes tagged forks and archived repos', () => {
    expect(classifyRepo(repo('forked-lib'), topics)).toEqual({ section: 'software', tag: 'library' });
    expect(classifyRepo(repo('old-archived'), topics)).toEqual({ section: 'software' });
  });

  it('warns on several portfolio topics and uses software, data science, data engineering order', () => {
    const warn = vi.fn();
    expect(classifyRepo(repo('double-tagged'), topics, warn)).toEqual({ section: 'data', sub: 'ds', tag: 'ds' });
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]![0]).toContain('double-tagged');

    const both = { ...repo('double-tagged'), topics: ['portfolio-data-science', 'portfolio-software'] };
    expect(classifyRepo(both, topics, () => {})?.section).toBe('software');
  });

  it('follows renamed topics from the config', () => {
    const renamed = { software: 'showcase-sw', dataScience: 'showcase-ds', dataEngineering: 'showcase-de' };
    const tagged = { ...repo('untagged'), topics: ['python', 'showcase-de'] };
    expect(classifyRepo(tagged, renamed)).toEqual({ section: 'data', sub: 'de', tag: 'de' });
    expect(classifyRepo(repo('etl-pipeline'), renamed)).toBeNull();
  });
});

describe('toProject', () => {
  it('keeps the needed fields and drops an empty homepage', () => {
    const project = toProject(repo('cli-tool'), { section: 'software' });
    expect(project).toEqual({
      name: 'cli-tool',
      description: 'A command-line tool.',
      url: 'https://github.com/octo/cli-tool',
      language: 'Go',
      section: 'software',
      pushedAt: new Date('2026-10-15T10:00:00Z'),
    });
    expect(project).not.toHaveProperty('homepage');
  });

  it('keeps a set homepage for the demo link', () => {
    expect(toProject(repo('web-app'), { section: 'software' }).homepage).toBe('https://octo.example/web-app');
  });

  it('warns about and nulls a missing description', () => {
    const warn = vi.fn();
    const project = toProject(repo('no-description'), { section: 'data', sub: 'de', tag: 'de' }, warn);
    expect(project.description).toBeNull();
    expect(project).not.toHaveProperty('language');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('no-description'));
  });
});

describe('buildProjects', () => {
  it('splits into sections, newest push first', () => {
    const { software, data } = buildProjects(repos, topics, () => {});
    expect(software.map((p) => p.name)).toEqual(['cli-tool', 'web-app', 'forked-lib', 'old-archived']);
    expect(data.map((p) => p.name)).toEqual(['etl-pipeline', 'double-tagged', 'ml-notebook', 'no-description']);
  });
});

describe('fetchRepos', () => {
  const page = (body: unknown, link?: string) =>
    new Response(JSON.stringify(body), { status: 200, headers: link ? { link } : {} });

  it('follows the Link header across pages and sends the token', async () => {
    const next = 'https://api.github.com/user/1/repos?type=owner&per_page=100&sort=pushed&page=2';
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(page([repos[0]], `<${next}>; rel="next", <${next}>; rel="last"`))
      .mockResolvedValueOnce(page([repos[1]]));

    const result = await fetchRepos({ username: 'octo', token: 'abc', fetchImpl });

    expect(result.map((r) => r.name)).toEqual(['web-app', 'cli-tool']);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0]![0]).toBe(
      'https://api.github.com/users/octo/repos?type=owner&per_page=100&sort=pushed',
    );
    expect(fetchImpl.mock.calls[1]![0]).toBe(next);
    const headers = fetchImpl.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer abc');
  });

  it('sends no Authorization header without a token', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(page([]));
    await fetchRepos({ username: 'octo', token: undefined, fetchImpl });
    const headers = fetchImpl.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(headers).not.toHaveProperty('Authorization');
  });

  it('throws when the API fails, so the build fails', async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('{"message":"API rate limit exceeded"}', { status: 403, statusText: 'Forbidden' }));
    await expect(fetchRepos({ username: 'octo', token: undefined, fetchImpl })).rejects.toThrow(/403/);
  });
});

describe('helpers', () => {
  it('parses the next link', () => {
    expect(parseNextLink(null)).toBeUndefined();
    expect(parseNextLink('<https://x/last>; rel="last"')).toBeUndefined();
    expect(parseNextLink('<https://x/prev>; rel="prev", <https://x/next>; rel="next"')).toBe('https://x/next');
  });

  it('formats dates like Oct 2026, in UTC', () => {
    expect(formatMonth(new Date('2026-10-30T12:00:00Z'))).toBe('Oct 2026');
    expect(formatMonth(new Date('2026-11-01T00:30:00Z'))).toBe('Nov 2026');
  });
});
