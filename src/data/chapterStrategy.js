// ---------------------------------------------------------------------------
// Chapter learning strategy — "kis chapter ko kaise padhna hai"
//
//   FULL                 → lectures poore karo (red)
//   ONE SHOT             → full lectures chhodo, one-shot revision dekho (green)
//   ONE SHOT + PYQ       → one-shot + previous-year questions (amber)
//   ONE SHOT + NCERT+PYQ → one-shot + NCERT reading + PYQs (amber)
// ---------------------------------------------------------------------------

export const CHAPTER_STRATEGY = {
  // ---- Physics (139) ----
  Electrostatics: 'full',
  'Electric potential and dipole': 'full',
  'Current Electricity': 'full',
  Capacitance: 'full',
  'Moving Charges and Magnetism': 'full',
  'Magnetism and Matter': 'oneShot',
  'Electromagnetic Induction': 'full',
  'Alternating Current': 'full',
  'Electromagnetic Waves': 'oneShot',
  'Ray Optics and Optical Instruments': 'full',
  'Wave Optics': 'full',
  'Dual Nature of Radiation and Matter': 'oneShot',
  Atoms: 'oneShot',
  Nuclei: 'oneShot',
  'Semiconductor Electronics: Materials, Devices and Simple Circuits': 'oneShot',

  // ---- Mathematics (135) ----
  Determinants: 'full',
  Matrices: 'full',
  'Relations and Functions': 'full',
  'Inverse Trigonometric Functions': 'full',
  'Limit, Continuity and Differentiability': 'full',
  'Method of Differentiation': 'oneShot',
  'Application of Derivatives': 'full',
  'Indefinite Integration': 'full',
  'Definite Integration': 'full',
  'Application of integrals': 'oneShot',
  'Differential Equation': 'oneShot',
  'Vector Algebra': 'full',
  'Three Dimensional Geometry': 'full',
  Probability: 'full',
  'Linear Programming': 'oneShot',

  // ---- Physical Chemistry (29) ----
  Solutions: 'full',
  'Chemical Kinetics': 'full',
  Electrochemistry: 'full',
  'The Solid State': 'oneShot',
  'SURFACE CHEMISTRY': 'oneShot',

  // ---- Organic Chemistry (57) ----
  'Optical Isomerism': 'full',
  Hydrocarbon: 'full',
  'Haloalkanes and Haloarenes': 'full',
  'Alcohols, Phenols and Ethers': 'full',
  'Aldehydes, Ketones and Carboxylic Acids': 'full',
  Amines: 'oneShot',
  Biomolecules: 'oneShot',

  // ---- Inorganic Chemistry (32) ----
  'Coordination Compounds': 'full',
  'Principles of Qualitative Analysis:Salt analysis': 'oneShotPyq',
  'The p-Block Elements (XII)': 'oneShotNcertPyq',
  'The d and f-Block Elements': 'oneShot',
};

export const STRATEGY_STYLES = {
  full: {
    label: 'FULL',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    dot: '#ef4444',
    hint: 'Saare lectures karo — ye core chapter hai',
  },
  oneShot: {
    label: 'ONE SHOT',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    dot: '#22c55e',
    hint: 'Lectures chhodo — one-shot se concept pakka karo',
  },
  oneShotPyq: {
    label: 'ONE SHOT + PYQ',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    dot: '#f59e0b',
    hint: 'One-shot + previous-year questions zaroor karo',
  },
  oneShotNcertPyq: {
    label: 'ONE SHOT + NCERT + PYQ',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    dot: '#f59e0b',
    hint: 'One-shot + NCERT padho + PYQs karo',
  },
};

export function getChapterStrategy(chapterName) {
  const key = CHAPTER_STRATEGY[chapterName];
  return key ? STRATEGY_STYLES[key] : null;
}

// Effort weight of a lecture in "full-lecture units".
//  FULL = 1.0  (pura lecture padhna hai)
//  ONE SHOT / ONE SHOT + PYQ / ONE SHOT + NCERT + PYQ = 0.5
//  (one-shot material half effort lagta hai — 2 one-shots = 1 full lecture)
export function getLectureLoad(lecture) {
  if (!lecture) return 1;
  const key = CHAPTER_STRATEGY[lecture.chapterName];
  return key && key !== 'full' ? 0.5 : 1;
}