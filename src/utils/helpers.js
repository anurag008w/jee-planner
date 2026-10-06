import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try { return format(parseISO(dateStr), 'dd MMM yyyy'); } catch { return dateStr; }
};

export const formatDateShort = (dateStr) => {
  if (!dateStr) return '';
  try { return format(parseISO(dateStr), 'dd MMM'); } catch { return dateStr; }
};

export const formatDateFull = (dateStr) => {
  if (!dateStr) return '';
  try { return format(parseISO(dateStr), 'EEEE, dd MMMM yyyy'); } catch { return dateStr; }
};

export const getToday = () => new Date().toISOString().split('T')[0];

export const daysUntil = (dateStr) => differenceInDays(parseISO(dateStr), new Date());

export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  if (hour < 21) return 'Good Evening';
  return 'Good Night';
};

export const getPhaseColor = (phase) => {
  const colors = {
    'Phase 1': { bg: 'bg-indigo-100', text: 'text-indigo-700', dark: 'dark:bg-indigo-900/30 dark:text-indigo-300', hex: '#6366f1' },
    'Phase 2': { bg: 'bg-violet-100', text: 'text-violet-700', dark: 'dark:bg-violet-900/30 dark:text-violet-300', hex: '#8b5cf6' },
    'Phase 3': { bg: 'bg-purple-100', text: 'text-purple-700', dark: 'dark:bg-purple-900/30 dark:text-purple-300', hex: '#a855f7' },
    'Phase 4': { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700', dark: 'dark:bg-fuchsia-900/30 dark:text-fuchsia-300', hex: '#d946ef' },
  };
  return colors[phase] || colors['Phase 1'];
};

const KNOWN_SUBJECTS = {
  Physics: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    dark: 'dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
    hex: '#3b82f6',
    iconBg: 'from-blue-500 to-blue-600',
    hero: 'from-blue-600 to-indigo-600 shadow-blue-500/15',
    bar: 'bg-blue-500',
    active: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/30',
  },
  Mathematics: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    dark: 'dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800',
    hex: '#f59e0b',
    iconBg: 'from-amber-500 to-orange-600',
    hero: 'from-amber-500 to-orange-600 shadow-amber-500/15',
    bar: 'bg-amber-500',
    active: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/30',
  },
  Chemistry: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
    dark: 'dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
    hex: '#10b981',
    iconBg: 'from-emerald-500 to-teal-600',
    hero: 'from-emerald-600 to-teal-600 shadow-emerald-500/15',
    bar: 'bg-emerald-500',
    active: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/30',
  },
  Biology: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    badge: 'bg-rose-100 text-rose-700',
    dark: 'dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800',
    hex: '#f43f5e',
    iconBg: 'from-rose-500 to-pink-600',
    hero: 'from-rose-600 to-pink-600 shadow-rose-500/15',
    bar: 'bg-rose-500',
    active: 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/30',
  },
  Zoology: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    badge: 'bg-purple-100 text-purple-700',
    dark: 'dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800',
    hex: '#a855f7',
    iconBg: 'from-purple-500 to-indigo-600',
    hero: 'from-purple-600 to-indigo-600 shadow-purple-500/15',
    bar: 'bg-purple-500',
    active: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/30',
  },
  Botany: {
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    badge: 'bg-teal-100 text-teal-700',
    dark: 'dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-800',
    hex: '#14b8a6',
    iconBg: 'from-teal-500 to-emerald-600',
    hero: 'from-teal-600 to-emerald-600 shadow-teal-500/15',
    bar: 'bg-teal-500',
    active: 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/30',
  },
  English: {
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    badge: 'bg-violet-100 text-violet-700',
    dark: 'dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800',
    hex: '#8b5cf6',
    iconBg: 'from-violet-500 to-purple-600',
    hero: 'from-violet-600 to-purple-600 shadow-violet-500/15',
    bar: 'bg-violet-500',
    active: 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/30',
  },
  'Computer Science': {
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    badge: 'bg-cyan-100 text-cyan-700',
    dark: 'dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-800',
    hex: '#06b6d4',
    iconBg: 'from-cyan-500 to-blue-600',
    hero: 'from-cyan-600 to-blue-600 shadow-cyan-500/15',
    bar: 'bg-cyan-500',
    active: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/30',
  },
};

const DYNAMIC_PALETTES = [
  {
    bg: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    badge: 'bg-indigo-100 text-indigo-700',
    dark: 'dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800',
    hex: '#6366f1',
    iconBg: 'from-indigo-500 to-purple-600',
    hero: 'from-indigo-600 to-purple-600 shadow-indigo-500/15',
    bar: 'bg-indigo-500',
    active: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/30',
  },
  {
    bg: 'bg-pink-50',
    text: 'text-pink-700',
    border: 'border-pink-200',
    badge: 'bg-pink-100 text-pink-700',
    dark: 'dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-800',
    hex: '#ec4899',
    iconBg: 'from-pink-500 to-rose-600',
    hero: 'from-pink-600 to-rose-600 shadow-pink-500/15',
    bar: 'bg-pink-500',
    active: 'bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800/30',
  },
  {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    badge: 'bg-sky-100 text-sky-700',
    dark: 'dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-800',
    hex: '#0284c7',
    iconBg: 'from-sky-500 to-indigo-600',
    hero: 'from-sky-600 to-indigo-600 shadow-sky-500/15',
    bar: 'bg-sky-500',
    active: 'bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/30',
  },
  {
    bg: 'bg-lime-50',
    text: 'text-lime-700',
    border: 'border-lime-200',
    badge: 'bg-lime-100 text-lime-700',
    dark: 'dark:bg-lime-900/20 dark:text-lime-300 dark:border-lime-800',
    hex: '#65a30d',
    iconBg: 'from-lime-500 to-emerald-600',
    hero: 'from-lime-600 to-emerald-600 shadow-lime-500/15',
    bar: 'bg-lime-500',
    active: 'bg-lime-50 dark:bg-lime-900/20 text-lime-700 dark:text-lime-300 border-lime-200 dark:border-lime-800/30',
  },
  {
    bg: 'bg-fuchsia-50',
    text: 'text-fuchsia-700',
    border: 'border-fuchsia-200',
    badge: 'bg-fuchsia-100 text-fuchsia-700',
    dark: 'dark:bg-fuchsia-900/20 dark:text-fuchsia-300 dark:border-fuchsia-800',
    hex: '#c026d3',
    iconBg: 'from-fuchsia-500 to-pink-600',
    hero: 'from-fuchsia-600 to-pink-600 shadow-fuchsia-500/15',
    bar: 'bg-fuchsia-500',
    active: 'bg-fuchsia-50 dark:bg-fuchsia-900/20 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-200 dark:border-fuchsia-800/30',
  },
];

export const getSubjectColor = (subject) => {
  if (!subject) return KNOWN_SUBJECTS.Physics;
  const direct = KNOWN_SUBJECTS[subject];
  if (direct) return direct;

  const norm = String(subject).trim().toLowerCase();
  if (norm === 'maths' || norm === 'math') return KNOWN_SUBJECTS.Mathematics;
  if (norm === 'cs') return KNOWN_SUBJECTS['Computer Science'];
  if (norm === 'bio') return KNOWN_SUBJECTS.Biology;

  // Deterministic palette hash for custom subjects
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = (hash << 5) - hash + norm.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % DYNAMIC_PALETTES.length;
  return DYNAMIC_PALETTES[idx];
};

export const getSubjectMeta = (subject, fallbackIndex = 0) => {
  const name = subject || 'Subject';
  const color = getSubjectColor(name);
  return {
    key: name,
    label: name,
    color,
    iconBg: color.iconBg || 'from-indigo-500 to-purple-600',
    hero: color.hero || 'from-indigo-600 to-purple-600 shadow-indigo-500/15',
    bar: color.bar || 'bg-indigo-500',
    active: color.active || 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/30',
  };
};

export const getBranchColor = (branch) => {
  const colors = {
    'Physical Chemistry': { bg: 'bg-cyan-50', text: 'text-cyan-700', badge: 'bg-cyan-100 text-cyan-700', dark: 'dark:bg-cyan-900/20 dark:text-cyan-300', hex: '#06b6d4' },
    'Organic Chemistry': { bg: 'bg-violet-50', text: 'text-violet-700', badge: 'bg-violet-100 text-violet-700', dark: 'dark:bg-violet-900/20 dark:text-violet-300', hex: '#8b5cf6' },
    'Inorganic Chemistry': { bg: 'bg-pink-50', text: 'text-pink-700', badge: 'bg-pink-100 text-pink-700', dark: 'dark:bg-pink-900/20 dark:text-pink-300', hex: '#ec4899' },
  };
  return colors[branch] || { bg: 'bg-gray-50', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-700', dark: 'dark:bg-gray-800 dark:text-gray-300', hex: '#6b7280' };
};

export const getCalendarDays = (year, month) => {
  const start = startOfMonth(new Date(year, month));
  const end = endOfMonth(new Date(year, month));
  const days = eachDayOfInterval({ start, end });
  const startDay = getDay(start);
  return { days, startDay };
};

const KNOWN_11TH_CHAPTERS = new Set([
  'units and measurements', 'units & measurements', 'units and dimensions', 'physical world',
  'motion in a straight line', 'motion in a plane', 'kinematics', 'rectilinear motion', 'projectile motion',
  'laws of motion', "newton's laws of motion", 'nlm', 'friction', 'circular motion',
  'work, energy, and power', 'work, energy and power', 'wep', 'work power energy',
  'system of particles and rotational motion', 'rotational motion', 'rotational dynamics', 'center of mass',
  'gravitation', 'properties of bulk matter', 'mechanical properties of solids',
  'mechanical properties of fluids', 'fluid mechanics', 'surface tension', 'viscosity', 'elasticity',
  'thermal properties of matter', 'calorimetry', 'heat transfer',
  'thermodynamics', 'kinetic theory', 'kinetic theory of gases', 'ktg',
  'oscillations', 'simple harmonic motion', 'shm', 'waves', 'sound waves', 'string waves', 'basic maths', 'vectors',
  'sets', 'relations & functions (11th)', 'trigonometric functions', 'trigonometry',
  'trigonometric ratios & identities', 'trigonometric equations', 'solution of triangles',
  'principle of mathematical induction', 'pmi', 'complex numbers', 'quadratic equations',
  'linear inequalities', 'permutations and combinations', 'permutation & combination', 'pnc',
  'binomial theorem', 'sequences and series', 'sequence and series', 'straight lines',
  'conic sections', 'circles', 'parabola', 'ellipse', 'hyperbola',
  'introduction to three dimensional geometry', '3d (11th)',
  'limits and derivatives', 'statistics', 'mathematical reasoning',
  'some basic concepts of chemistry', 'mole concept', 'structure of atom', 'atomic structure',
  'classification of elements & periodicity in properties', 'periodic table', 'periodicity',
  'chemical bonding and molecular structure', 'chemical bonding',
  'states of matter', 'chemical thermodynamics', 'equilibrium', 'chemical equilibrium', 'ionic equilibrium',
  'redox reaction', 'redox reactions', 'hydrogen', 'the s-block elements', 's-block',
  'the p-block elements (xi)', 'p-block (11th)',
  'some basic principles and techniques: general organic chemistry', 'general organic chemistry', 'goc',
  'organic chemistry - some basic principles and techniques', 'hydrocarbon', 'hydrocarbons', 'environmental chemistry',
  'the living world', 'biological classification', 'plant kingdom', 'animal kingdom',
  'morphology of flowering plants', 'anatomy of flowering plants', 'structural organisation in animals',
  'cell: the unit of life', 'cell - the unit of life', 'cell biology', 'cell cycle and cell division',
  'transport in plants', 'mineral nutrition', 'photosynthesis in higher plants', 'respiration in plants',
  'plant growth and development', 'digestion and absorption', 'breathing and exchange of gases',
  'body fluids and circulation', 'excretory products and their elimination', 'locomotion and movement',
  'neural control and coordination', 'chemical coordination and integration',
]);

const KNOWN_12TH_CHAPTERS = new Set([
  'electrostatics', 'electric charges and fields', 'electric potential and capacitance',
  'electric potential and dipole', 'capacitance', 'current electricity',
  'moving charges and magnetism', 'magnetism and matter', 'electromagnetic induction', 'emi',
  'alternating current', 'ac', 'electromagnetic waves', 'em waves',
  'ray optics and optical instruments', 'ray optics', 'wave optics',
  'dual nature of radiation and matter', 'dual nature', 'atoms', 'nuclei',
  'semiconductor electronics: materials, devices and simple circuits', 'semiconductors',
  'relations and functions', 'inverse trigonometric functions', 'itf', 'matrices', 'determinants',
  'continuity and differentiability', 'limit, continuity and differentiability',
  'method of differentiation', 'application of derivatives', 'aod',
  'indefinite integration', 'definite integration', 'application of integrals', 'area under curves',
  'differential equation', 'differential equations', 'vector algebra', 'vectors (12th)',
  'three dimensional geometry', '3d geometry', 'linear programming', 'probability',
  'the solid state', 'solid state', 'solutions', 'electrochemistry', 'chemical kinetics',
  'surface chemistry', 'general principles and processes of isolation of elements', 'metallurgy',
  'the p-block elements (xii)', 'the d and f-block elements', 'd and f block',
  'coordination compounds', 'haloalkanes and haloarenes', 'alcohols, phenols and ethers',
  'aldehydes, ketones and carboxylic acids', 'amines', 'biomolecules', 'polymers',
  'chemistry in everyday life', 'optical isomerism', 'principles of qualitative analysis:salt analysis',
  'reproduction in organisms', 'sexual reproduction in flowering plants', 'human reproduction',
  'reproductive health', 'principles of inheritance and variation', 'genetics',
  'molecular basis of inheritance', 'evolution', 'human health and disease',
  'strategies for enhancement in food production', 'microbes in human welfare',
  'biotechnology: principles and processes', 'biotechnology and its applications',
  'organisms and populations', 'ecosystem', 'biodiversity and conservation', 'environmental issues',
]);

export const normalizeClassLevel = (val) => {
  if (!val) return '';
  const s = String(val).trim().toLowerCase();
  if (s === '11' || s === '11th' || s === 'class 11' || s === 'class 11th' || s.includes('11')) return '11th';
  if (s === '12' || s === '12th' || s === 'class 12' || s === 'class 12th' || s.includes('12')) return '12th';
  return '';
};

import { resolveCanonicalChapter } from '../data/chapterAliases.js';

export const detectChapterClass = (chapterName, explicitClass = '') => {
  const normalized = normalizeClassLevel(explicitClass);
  if (normalized) return normalized;
  if (!chapterName) return '';
  const c = String(chapterName).trim().toLowerCase();

  if (c.includes('11th') || c.includes('class 11') || c.includes('(xi)')) return '11th';
  if (c.includes('12th') || c.includes('class 12') || c.includes('(xii)')) return '12th';

  if (KNOWN_11TH_CHAPTERS.has(c)) return '11th';
  if (KNOWN_12TH_CHAPTERS.has(c)) return '12th';

  const { canonical, isMatched } = resolveCanonicalChapter(chapterName);
  if (isMatched && canonical) {
    const canonLower = canonical.toLowerCase();
    if (KNOWN_11TH_CHAPTERS.has(canonLower)) return '11th';
    if (KNOWN_12TH_CHAPTERS.has(canonLower)) return '12th';
  }

  for (const k of KNOWN_11TH_CHAPTERS) {
    if (c.includes(k) || k.includes(c)) return '11th';
  }
  for (const k of KNOWN_12TH_CHAPTERS) {
    if (c.includes(k) || k.includes(c)) return '12th';
  }

  return '';
};

export { format, parseISO };