// npm run repos: lists every public repo you own and the portfolio section it is in.
import { classifyRepo, fetchRepos, resolveToken } from '../src/lib/github';

const repos = (await fetchRepos({ token: resolveToken() })).filter((repo) => !repo.private);

const rows = repos.map((repo) => {
  const placement = classifyRepo(repo);
  const section = !placement ? '-' : placement.sub ? `data/${placement.sub}` : 'software';
  const notes = [repo.fork && 'fork', repo.archived && 'archived'].filter(Boolean).join(',');
  const description = repo.description ?? '';
  return {
    repo: repo.name,
    section,
    lang: repo.language ?? '',
    pushed: repo.pushed_at.slice(0, 10),
    notes,
    description: description.length > 60 ? `${description.slice(0, 59)}…` : description,
  };
});

const columns = ['repo', 'section', 'lang', 'pushed', 'notes', 'description'] as const;
const widths = columns.map((col) => Math.max(col.length, ...rows.map((row) => row[col].length)));
const line = (cells: string[]) => cells.map((cell, i) => cell.padEnd(widths[i]!)).join('  ').trimEnd();

console.log(line([...columns]));
console.log(line(widths.map((w) => '-'.repeat(w))));
for (const row of rows) console.log(line(columns.map((col) => row[col])));

const tagged = rows.filter((row) => row.section !== '-').length;
console.log(`\n${repos.length} public repos, ${tagged} on the portfolio.`);
