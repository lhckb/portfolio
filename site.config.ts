// All personal content lives here; everything else reads from this file.
export default {
  githubUsername: 'lhckb',
  name: 'Luís Cruz',
  handle: 'luiscruz', // shown as ~/<handle> in the header
  role: 'Computer Scientist',
  disciplines: 'software engineering · data science', // shown after the role
  intro:
    'Software engineer with 5 years of experience solving businesses’ needs with code. Experienced in web, mobile and native software projects, and in machine learning and data engineering.',
  description: 'Software engineer in Recife, Brazil. Software engineering and data science projects, synced from GitHub.', // meta + social cards
  location: 'Recife, Brazil',
  focus: 'Building tech solutions so businesses can focus on business.',
  email: 'luis.carv.cruz@gmail.com',
  linkedin: 'https://www.linkedin.com/in/lcruz03',
  // Badge left of each project name, keyed by repo name. Without an entry, Data
  // projects show ds/de and Software projects show the repo's first other GitHub
  // topic (GitHub sorts topics alphabetically). Set '' to show no badge.
  tags: {
    Breakpoint: 'ios',
    'C-projects': 'linux',
    'ci-cd-terraform': 'devops',
    'citizen-register-api': 'api',
    lsh: 'shell',
    SecondBrainAPI: 'api',
    'takenote-v3': 'web',
  },
  topics: {
    software: 'portfolio-software',
    dataScience: 'portfolio-data-science',
    dataEngineering: 'portfolio-data-engineering',
  },
  goatcounterCode: '', // empty = no analytics
} as const;
