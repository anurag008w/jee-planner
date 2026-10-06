// ---------------------------------------------------------------------------
// Comprehensive Chapter Aliases & Canonical Resolver
// Resolves coaching names (PW, Allen, Resonance, etc.) to canonical syllabus chapters
// ---------------------------------------------------------------------------

export const CHAPTER_ALIASES = {
  // ---- Physics (12th) ----
  Electrostatics: [
    'electrostatics', 'electro', 'electro 1', 'electrostatics 1', 'electrostatics part 1',
    'electric charges and fields', 'electric charges & fields', 'electric charge and field',
    'electric charge and fields', 'electric charges', 'coulomb law and electric field',
    'electrostatics and gauss law', 'gauss law', 'electrostatics i'
  ],
  'Electric potential and dipole': [
    'electric potential and capacitance', 'potential and capacitance', 'electric potential',
    'electrostatics 2', 'electrostatics part 2', 'electric potential and dipole',
    'electrostatic potential', 'potential and dipole', 'electrostatics ii'
  ],
  Capacitance: [
    'capacitance', 'capacitors', 'capacitor', 'capacitance and dielectric',
    'capacitors & dielectrics', 'capacitance 1'
  ],
  'Current Electricity': [
    'current electricity', 'current', 'electric current', 'current & electricity',
    'current electricity and circuits', 'current and resistance', 'circuits'
  ],
  'Moving Charges and Magnetism': [
    'moving charges and magnetism', 'moving charges & magnetism', 'magnetic effects of current',
    'magnetic effect of current', 'mec', 'magnetism 1', 'biot savart and ampere law',
    'magnetic field and forces'
  ],
  'Magnetism and Matter': [
    'magnetism and matter', 'magnetism & matter', 'matter and magnetism',
    'magnetic properties of matter', 'terrestrial magnetism', 'earth magnetism'
  ],
  'Electromagnetic Induction': [
    'electromagnetic induction', 'emi', 'electromagnetic induction & ac',
    'faraday law and induction', 'inductance'
  ],
  'Alternating Current': [
    'alternating current', 'alternating currents', 'ac', 'ac circuits', 'lcr circuits'
  ],
  'Electromagnetic Waves': [
    'electromagnetic waves', 'em waves', 'emw', 'electromagnetic wave', 'displacement current'
  ],
  'Ray Optics and Optical Instruments': [
    'ray optics and optical instruments', 'ray optics', 'geometrical optics', 'optics - ray',
    'ray optics & optical instruments', 'reflection and refraction', 'optical instruments',
    'microscope and telescope'
  ],
  'Wave Optics': [
    'wave optics', 'physical optics', 'optics - wave', 'wave optics & interference',
    'interference and diffraction', 'ydse', 'polarisation'
  ],
  'Dual Nature of Radiation and Matter': [
    'dual nature of radiation and matter', 'dual nature', 'photoelectric effect',
    'matter waves', 'dual nature of matter', 'photoelectric effect & de broglie'
  ],
  Atoms: [
    'atoms', 'bohr model', 'atomic structure physics', 'modern physics - atoms',
    'rutherford and bohr atom', 'hydrogen spectrum'
  ],
  Nuclei: [
    'nuclei', 'nuclear physics', 'radioactivity', 'nuclear energy', 'nucleus', 'mass defect'
  ],
  'Semiconductor Electronics: Materials, Devices and Simple Circuits': [
    'semiconductor electronics', 'semiconductors', 'semiconductor', 'semiconductor devices',
    'electronics', 'logic gates', 'p-n junction and diodes', 'transistors'
  ],

  // ---- Physics (11th) ----
  'Units and Measurements': [
    'units and measurements', 'units & measurements', 'units and dimensions', 'units & dimensions',
    'u&d', 'dimensional analysis', 'error analysis', 'physical world', 'significant figures'
  ],
  'Motion in a Straight Line': [
    'motion in a straight line', '1d motion', 'motion in 1d', 'rectilinear motion',
    'kinematics 1d', 'kinematics 1'
  ],
  'Motion in a Plane': [
    'motion in a plane', '2d motion', 'motion in 2d', 'projectile motion', 'circular motion',
    'kinematics 2d', 'relative motion', 'kinematics 2', 'vectors and projectile'
  ],
  "Newton's Laws of Motion": [
    "newton's laws of motion", 'newtons laws of motion', 'nlm', 'laws of motion',
    'friction', 'nlm & friction', 'forces and nlm', 'dynamics', 'newton laws'
  ],
  'Work, Energy, and Power': [
    'work, energy, and power', 'work, energy and power', 'work energy power', 'work power energy',
    'wep', 'work power & energy', 'work & energy', 'conservation of energy'
  ],
  'Rotational Motion': [
    'rotational motion', 'system of particles and rotational motion', 'rotational dynamics',
    'rotation', 'rigid body dynamics', 'rbd', 'center of mass and rotation', 'moment of inertia'
  ],
  Gravitation: [
    'gravitation', 'gravitational force', 'gravity', 'orbital motion', 'kepler laws'
  ],
  'Mechanical Properties of Solids': [
    'mechanical properties of solids', 'elasticity', 'solids and elasticity', 'hooke law'
  ],
  'Mechanical Properties of Fluids': [
    'mechanical properties of fluids', 'fluid mechanics', 'fluids', 'hydrostatics',
    'hydrodynamics', 'surface tension', 'viscosity', 'bernoulli theorem'
  ],
  'Thermal Properties of Matter': [
    'thermal properties of matter', 'calorimetry', 'thermal expansion', 'heat transfer',
    'thermal physics', 'transmission of heat'
  ],
  Thermodynamics: [
    'thermodynamics', 'thermo physics', 'heat and thermodynamics', 'laws of thermodynamics',
    'carnot engine'
  ],
  'Kinetic Theory of Gases': [
    'kinetic theory of gases', 'kinetic theory', 'ktg', 'ideal gas equation'
  ],
  Oscillations: [
    'oscillations', 'simple harmonic motion', 'shm', 'simple pendulum'
  ],
  Waves: [
    'waves', 'sound waves', 'string waves', 'wave motion', 'doppler effect'
  ],

  // ---- Mathematics (12th) ----
  Determinants: [
    'determinants', 'determinant', 'matrices and determinants', 'properties of determinants',
    'cramer rule'
  ],
  Matrices: [
    'matrices', 'matrix', 'algebra of matrices', 'types of matrices', 'inverse of matrix'
  ],
  'Relations and Functions': [
    'relations and functions', 'relations & functions', 'functions', 'relations',
    'types of relations', 'types of functions', 'composite and inverse functions'
  ],
  'Inverse Trigonometric Functions': [
    'inverse trigonometric functions', 'itf', 'inverse trig', 'inverse trigonometry',
    'inverse trigonometric function'
  ],
  'Limit, Continuity and Differentiability': [
    'limit, continuity and differentiability', 'limits, continuity and differentiability',
    'limits', 'lcd', 'continuity and differentiability', 'limits and continuity',
    'continuity & differentiability'
  ],
  'Method of Differentiation': [
    'method of differentiation', 'mod', 'differentiation', 'derivatives', 'chain rule'
  ],
  'Application of Derivatives': [
    'application of derivatives', 'aod', 'applications of derivatives', 'tangents and normals',
    'maxima and minima', 'monotonocity', 'rate measure'
  ],
  'Indefinite Integration': [
    'indefinite integration', 'indefinite integrals', 'indefinite integral', 'indefinite',
    'integration 1', 'methods of integration'
  ],
  'Definite Integration': [
    'definite integration', 'definite integrals', 'definite integral', 'definite',
    'integration 2', 'properties of definite integrals'
  ],
  'Application of integrals': [
    'application of integrals', 'area under curves', 'area under curve', 'auc',
    'applications of integrals', 'area bounded'
  ],
  'Differential Equation': [
    'differential equation', 'differential equations', 'de', 'diff equations',
    'variable separable', 'linear differential equation'
  ],
  'Vector Algebra': [
    'vector algebra', 'vectors', 'vector', 'vector products', 'dot and cross product'
  ],
  'Three Dimensional Geometry': [
    'three dimensional geometry', '3d geometry', '3d', '3-d geometry', 'three dimensional',
    'lines and planes in 3d', 'straight line in 3d'
  ],
  Probability: [
    'probability', 'bayes theorem', 'conditional probability', 'probability distributions'
  ],
  'Linear Programming': [
    'linear programming', 'lpp', 'linear programming problems'
  ],

  // ---- Mathematics (11th) ----
  Sets: [
    'sets', 'set theory', 'venn diagrams'
  ],
  'Quadratic Equations': [
    'quadratic equations', 'quadratic equation', 'quadratic', 'quadratics', 'theory of equations'
  ],
  'Complex Numbers': [
    'complex numbers', 'complex number', 'argand plane', 'euler and demoivre'
  ],
  'Permutations and Combinations': [
    'permutations and combinations', 'permutations & combinations', 'pnc', 'p&c',
    'permutation and combination', 'combinatorics'
  ],
  'Binomial Theorem': [
    'binomial theorem', 'binomial', 'bt', 'binomial coefficients'
  ],
  'Sequences and Series': [
    'sequences and series', 'sequence and series', 'sequences & series', 'ap gp hp',
    'progression', 'special series'
  ],
  'Straight Lines': [
    'straight lines', 'straight line', 'lines', 'coordinate geometry - straight lines'
  ],
  Circles: [
    'circles', 'circle', 'family of circles'
  ],
  'Conic Sections': [
    'conic sections', 'conics', 'parabola', 'ellipse', 'hyperbola'
  ],

  // ---- Chemistry (12th) ----
  Solutions: [
    'solutions', 'liquid solutions', 'solution', 'colligative properties',
    'solutions & colligative properties'
  ],
  'Chemical Kinetics': [
    'chemical kinetics', 'kinetics', 'rate of reaction', 'integrated rate laws'
  ],
  Electrochemistry: [
    'electrochemistry', 'electrochem', 'galvanic cells', 'nernst equation', 'conductance'
  ],
  'The Solid State': [
    'the solid state', 'solid state', 'crystal lattices', 'unit cells'
  ],
  'SURFACE CHEMISTRY': [
    'surface chemistry', 'adsorption', 'colloids and catalysis'
  ],
  'Coordination Compounds': [
    'coordination compounds', 'coordination chemistry', 'complex compounds',
    'werner theory and cft', 'isomers in coordination'
  ],
  'Principles of Qualitative Analysis:Salt analysis': [
    'principles of qualitative analysis:salt analysis', 'salt analysis', 'qualitative analysis',
    'cation and anion analysis', 'practical chemistry'
  ],
  'The p-Block Elements (XII)': [
    'the p-block elements (xii)', 'p-block (xii)', 'p block (12th)', 'p block class 12',
    'group 15 16 17 18', 'p-block elements 2'
  ],
  'The d and f-Block Elements': [
    'the d and f-block elements', 'd and f-block', 'd & f block', 'transition elements',
    'lanthanoids and actinoids'
  ],
  'Haloalkanes and Haloarenes': [
    'haloalkanes and haloarenes', 'haloalkanes & haloarenes', 'alkyl halides', 'aryl halides',
    'haloalkanes', 'alkyl and aryl halides', 'sn1 sn2'
  ],
  'Alcohols, Phenols and Ethers': [
    'alcohols, phenols and ethers', 'alcohol phenol ether', 'alcohols and phenols',
    'alcohols phenols & ethers', 'ethers'
  ],
  'Aldehydes, Ketones and Carboxylic Acids': [
    'aldehydes, ketones and carboxylic acids', 'carbonyl compounds', 'aldehydes and ketones',
    'aldehydes, ketones & carboxylic acids', 'carboxylic acids', 'carbonyls'
  ],
  Amines: [
    'amines', 'organic compounds containing nitrogen', 'nitrogen containing compounds',
    'diazonium salts', 'amine'
  ],
  Biomolecules: [
    'biomolecules', 'carbohydrates and proteins', 'nucleic acids', 'vitamins'
  ],
  'Optical Isomerism': [
    'optical isomerism', 'stereoisomerism', 'chirality and enantiomers', 'isomerism'
  ],
  Hydrocarbon: [
    'hydrocarbon', 'hydrocarbons', 'alkanes', 'alkenes', 'alkynes', 'aromatic hydrocarbons'
  ],

  // ---- Chemistry (11th) ----
  'Some Basic Concepts of Chemistry': [
    'some basic concepts of chemistry', 'mole concept', 'stoichiometry',
    'basic concepts of chemistry', 'concentration terms', 'mole concept & stoichiometry'
  ],
  'Structure of Atom': [
    'structure of atom', 'atomic structure', 'quantum numbers', 'electronic configuration'
  ],
  'Classification of Elements & Periodicity in Properties': [
    'classification of elements & periodicity in properties', 'periodic table',
    'periodicity', 'periodic properties', 'classification of elements'
  ],
  'Chemical Bonding and Molecular Structure': [
    'chemical bonding and molecular structure', 'chemical bonding', 'bonding',
    'vsepr and mot', 'hybridisation', 'chemical bonding & molecular structure'
  ],
  'Chemical Thermodynamics': [
    'chemical thermodynamics', 'thermodynamics (chem)', 'thermodynamics & energetics',
    'thermochemistry', 'entropy and gibbs free energy'
  ],
  Equilibrium: [
    'equilibrium', 'chemical equilibrium', 'ionic equilibrium', 'chemical and ionic equilibrium',
    'ph and buffer'
  ],
  'Redox Reaction': [
    'redox reaction', 'redox reactions', 'redox', 'oxidation number and balancing'
  ],
  'General Organic Chemistry': [
    'some basic principles and techniques: general organic chemistry',
    'general organic chemistry', 'goc', 'goc 1', 'goc 2', 'basic organic chemistry',
    'organic chemistry - some basic principles', 'inductive and resonance effect'
  ]
};

// Invert mapping for O(1) canonical resolution
const ALIAS_LOOKUP = new Map();

for (const [canonical, aliases] of Object.entries(CHAPTER_ALIASES)) {
  ALIAS_LOOKUP.set(canonical.toLowerCase().trim(), canonical);
  for (const alias of aliases) {
    ALIAS_LOOKUP.set(alias.toLowerCase().trim(), canonical);
  }
}

export function cleanChapterString(raw) {
  if (!raw) return "";
  return String(raw)
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolves any coaching, custom, or abbreviated chapter name to its canonical syllabus chapter.
 * Returns { canonical: string, isMatched: boolean }
 */
export function resolveCanonicalChapter(rawName) {
  if (!rawName) return { canonical: '', isMatched: false };

  const rawLower = String(rawName).toLowerCase().trim();

  // 1. Direct match in lookup
  if (ALIAS_LOOKUP.has(rawLower)) {
    return { canonical: ALIAS_LOOKUP.get(rawLower), isMatched: true };
  }

  // 2. Cleaned string match
  const cleaned = cleanChapterString(rawName);
  if (ALIAS_LOOKUP.has(cleaned)) {
    return { canonical: ALIAS_LOOKUP.get(cleaned), isMatched: true };
  }

  // 3. Substring / Token Containment Match (guarded by minimum token length to prevent false positives)
  if (rawLower.length >= 4) {
    for (const [alias, canonical] of ALIAS_LOOKUP.entries()) {
      if (alias.length >= 4) {
        if (rawLower.includes(alias) || alias.includes(rawLower)) {
          return { canonical, isMatched: true };
        }
        if (cleaned.length >= 4 && (cleaned.includes(alias) || alias.includes(cleaned))) {
          return { canonical, isMatched: true };
        }
      }
    }
  }

  // 4. Return rawName untouched if completely novel/custom
  return { canonical: String(rawName).trim(), isMatched: false };
}
