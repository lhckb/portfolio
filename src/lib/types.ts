export type Section = 'software' | 'data';
export type DataSub = 'ds' | 'de';

export interface Project {
  name: string;
  description: string | null;
  url: string; // html_url
  homepage?: string; // shown as demo link
  language?: string;
  tag?: string; // ds | de | first other topic
  section: Section;
  sub?: DataSub;
  pushedAt: Date;
}

/** The fields of GitHub's repository object that this site reads. */
export interface GitHubRepo {
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  topics?: string[];
  pushed_at: string;
  private: boolean;
  fork: boolean;
  archived: boolean;
}
