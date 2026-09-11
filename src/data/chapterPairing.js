// ---------------------------------------------------------------------------
// 11th → 12th pairing — 12th chapter ke saath kaunsa 11th base + kitne sessions
// plus "11th Foundation Plan" (priority lists per subject)
// ---------------------------------------------------------------------------

export const CHAPTER_PAIRING = {
  // ---- Physics (12th chapter → 11th base + treatment) ----
  Electrostatics: { base: 'Units and Measurements + basic vectors', treatment: '2–3 sessions' },
  'Electric potential and dipole': { base: 'Work, Energy, and Power', treatment: '2 sessions' },
  'Current Electricity': { base: "Newton's Laws of Motion", treatment: '2–3 sessions' },
  Capacitance: { base: 'Work, Energy, and Power revision', treatment: '1–2 sessions' },
  'Moving Charges and Magnetism': { base: 'Motion in a Plane', treatment: '2 sessions' },
  'Magnetism and Matter': { base: 'Gravitation', treatment: '1.5–2 sessions' },
  'Electromagnetic Induction': { base: "Newton's Laws of Motion + WEP revision", treatment: '1–2 sessions' },
  'Alternating Current': { base: 'Oscillations', treatment: '2 sessions' },
  'Electromagnetic Waves': { base: 'Waves', treatment: '1 session' },
  'Ray Optics and Optical Instruments': { base: 'Motion in a Plane + basic geometry/vectors', treatment: '1–2 sessions' },
  'Wave Optics': { base: 'Waves', treatment: '1–2 sessions' },
  'Dual Nature of Radiation and Matter': { base: 'Kinetic Theory of Gases', treatment: '1 session' },
  Atoms: { base: 'Units and Measurements revision', treatment: '0.5–1 session' },
  Nuclei: { base: 'Work, Energy, and Power revision', treatment: '0.5–1 session' },
  'Semiconductor Electronics: Materials, Devices and Simple Circuits': { base: 'No major 11th prerequisite', treatment: '0.5–1 session' },

  // ---- Mathematics ----
  Determinants: { base: 'Quadratic Equations', treatment: '1–2 sessions' },
  Matrices: { base: 'Complex Numbers', treatment: '2 sessions' },
  'Relations and Functions': { base: 'Sets', treatment: '1 session' },
  'Inverse Trigonometric Functions': { base: 'Trigonometric Ratios & Identities + Trigonometric Equations', treatment: '2–3 sessions' },
  'Limit, Continuity and Differentiability': { base: 'Basic Maths & Logarithm', treatment: '1–2 sessions' },
  'Method of Differentiation': { base: 'Trigonometric Equations', treatment: '1 session' },
  'Application of Derivatives': { base: 'Quadratic Equations revision', treatment: '1 session' },
  'Indefinite Integration': { base: 'Sequences and Series', treatment: '1–2 sessions' },
  'Definite Integration': { base: 'Binomial Theorem', treatment: '1 session' },
  'Application of integrals': { base: 'Straight Lines', treatment: '1–2 sessions' },
  'Differential Equation': { base: 'Functions + basic algebra', treatment: '1 session' },
  'Vector Algebra': { base: '3D Coordinate basics', treatment: '1–2 sessions' },
  'Three Dimensional Geometry': { base: 'Straight Lines + Circles', treatment: '2 sessions' },
  Probability: { base: 'Permutations and Combinations', treatment: '2–3 sessions' },
  'Linear Programming': { base: 'No major 11th prerequisite', treatment: '0.5 session' },

  // ---- Chemistry (sirf 11th base, treatment column nahi) ----
  Solutions: { base: 'Some Basic Concepts of Chemistry + concentration/mole concept revision', treatment: '' },
  'Chemical Kinetics': { base: 'Chemical Thermodynamics and Energetics', treatment: '' },
  Electrochemistry: { base: 'Redox Reaction', treatment: '' },
  'Optical Isomerism': { base: 'SBP&T: Isomerism + SBP&T: General Organic Chemistry', treatment: '' },
  Hydrocarbon: { base: 'Some Basic Principles and Techniques: General Organic Chemistry', treatment: '' },
  'Haloalkanes and Haloarenes': { base: 'General Organic Chemistry', treatment: '' },
  'Alcohols, Phenols and Ethers': { base: 'General Organic Chemistry', treatment: '' },
  'Aldehydes, Ketones and Carboxylic Acids': { base: 'General Organic Chemistry', treatment: '' },
  Amines: { base: 'General Organic Chemistry', treatment: '' },
  Biomolecules: { base: '11th ka specific prerequisite nahi', treatment: '' },
  'Coordination Compounds': { base: 'Chemical Bonding and Molecular Structure', treatment: '' },
  'Principles of Qualitative Analysis:Salt analysis': { base: 'Redox Reaction', treatment: '' },
  'The p-Block Elements (XII)': { base: 'Classification of Elements & Periodicity in Properties', treatment: '' },
  'The d and f-Block Elements': { base: 'Classification of Elements & Periodicity in Properties', treatment: '' },
  'The Solid State': { base: 'Some Basic Concepts of Chemistry', treatment: '' },
  'SURFACE CHEMISTRY': { base: 'No major prerequisite', treatment: '' },
};

// ---- 11th Foundation Plan (priority lists) ----
export const SUBJECT_FOUNDATIONS = {
  Physics: {
    title: '11th Physics Priority',
    note: '18–22 study sessions me strong coverage better hai; FULL lecture-by-lecture mat karo. Rotational Motion + Thermodynamics ko one-shot se mat niptaana unless already strong.',
    lists: [
      { label: 'Must', tone: 'red', items: ['Units and Measurements', 'Motion in a Straight Line', 'Motion in a Plane', "Newton's Laws of Motion", 'Work, Energy, and Power', 'Centre of Mass and System of Particles', 'Rotational Motion', 'Gravitation', 'Thermodynamics', 'Kinetic Theory of Gases', 'Oscillations', 'Waves'] },
    ],
  },
  Mathematics: {
    title: '11th Maths Priority',
    note: '3D se pehle Straight Lines ka base zaroor; Probability se pehle P&C.',
    lists: [
      { label: 'Properly karo', tone: 'red', items: ['Quadratic Equations', 'Complex Numbers', 'Sequences and Series', 'Binomial Theorem', 'Permutations and Combinations', 'Straight Lines', 'Circles', 'Trigonometric Ratios & Identities', 'Trigonometric Equations'] },
      { label: 'Selective', tone: 'amber', items: ['Conic Sections: Parabola / Ellipse / Hyperbola'] },
      { label: 'Low-time', tone: 'green', items: ['Sets', 'Basic Maths & Logarithm', 'Properties of Triangle', 'Statistics'] },
    ],
  },
  Chemistry: {
    title: '11th Chemistry Priority',
    note: '12th ke chapter ke saath dependency ke hisaab se 11th base rakho — GOC, Redox, Mole Concept, Bonding sabse zyada baar chahiye.',
    lists: [
      { label: 'Base concepts', tone: 'red', items: ['Some Basic Concepts of Chemistry (mole concept)', 'Redox Reaction', 'Chemical Bonding and Molecular Structure', 'GOC (General Organic Chemistry)', 'Chemical Thermodynamics and Energetics'] },
    ],
  },
};

export function getChapterPairing(chapterName) {
  return CHAPTER_PAIRING[chapterName] || null;
}