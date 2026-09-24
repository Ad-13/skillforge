export type RuneStroke = ReadonlyArray<readonly [number, number]>

export interface RuneGlyph {
  readonly name: string
  readonly meaning: string
  readonly strokes: ReadonlyArray<RuneStroke>
}

export const RUNES = {
  FEHU: {
    name: 'Fehu',
    meaning: 'wealth',
    strokes: [
      [
        [3, 1],
        [3, 15],
      ],
      [
        [3, 4],
        [8, 2],
      ],
      [
        [3, 8],
        [8, 6],
      ],
    ],
  },
  URUZ: {
    name: 'Uruz',
    meaning: 'strength',
    strokes: [
      [
        [2, 15],
        [2, 2],
        [8, 5],
        [8, 15],
      ],
    ],
  },
  THURISAZ: {
    name: 'Thurisaz',
    meaning: 'thorn',
    strokes: [
      [
        [3, 1],
        [3, 15],
      ],
      [
        [3, 4],
        [8, 8],
        [3, 12],
      ],
    ],
  },
  ANSUZ: {
    name: 'Ansuz',
    meaning: 'the spoken word',
    strokes: [
      [
        [3, 1],
        [3, 15],
      ],
      [
        [3, 3],
        [8, 6],
      ],
      [
        [3, 7],
        [8, 10],
      ],
    ],
  },
  RAIDO: {
    name: 'Raido',
    meaning: 'the journey',
    strokes: [
      [
        [3, 1],
        [3, 15],
      ],
      [
        [3, 1],
        [8, 4],
        [3, 7],
      ],
      [
        [3, 7],
        [8, 15],
      ],
    ],
  },
  KAUNAN: {
    name: 'Kaunan',
    meaning: 'the torch',
    strokes: [
      [
        [8, 2],
        [3, 8],
        [8, 14],
      ],
    ],
  },
  GEBO: {
    name: 'Gebo',
    meaning: 'the gift, an exchange',
    strokes: [
      [
        [2, 3],
        [8, 13],
      ],
      [
        [8, 3],
        [2, 13],
      ],
    ],
  },
  WUNJO: {
    name: 'Wunjo',
    meaning: 'joy',
    strokes: [
      [
        [3, 1],
        [3, 15],
      ],
      [
        [3, 3],
        [8, 6],
        [3, 9],
      ],
    ],
  },
  HAGALAZ: {
    name: 'Hagalaz',
    meaning: 'hail',
    strokes: [
      [
        [2, 2],
        [2, 14],
      ],
      [
        [8, 2],
        [8, 14],
      ],
      [
        [2, 6],
        [8, 10],
      ],
    ],
  },
  ISA: {
    name: 'Isa',
    meaning: 'ice, what is already solid',
    strokes: [
      [
        [5, 2],
        [5, 14],
      ],
    ],
  },
  JERA: {
    name: 'Jera',
    meaning: 'the harvest, a year of work',
    strokes: [
      [
        [2, 2],
        [5, 5],
        [2, 8],
      ],
      [
        [8, 14],
        [5, 11],
        [8, 8],
      ],
    ],
  },
  TIWAZ: {
    name: 'Tiwaz',
    meaning: 'the guiding star',
    strokes: [
      [
        [5, 3],
        [5, 15],
      ],
      [
        [1, 7],
        [5, 2],
        [9, 7],
      ],
    ],
  },
  SOWILO: {
    name: 'Sowilo',
    meaning: 'the sun',
    strokes: [
      [
        [8, 2],
        [3, 6],
        [8, 10],
        [3, 14],
      ],
    ],
  },
  BERKANAN: {
    name: 'Berkanan',
    meaning: 'growth',
    strokes: [
      [
        [3, 1],
        [3, 15],
      ],
      [
        [3, 2],
        [8, 5],
        [3, 8],
      ],
      [
        [3, 8],
        [8, 12],
        [3, 15],
      ],
    ],
  },
  ALGIZ: {
    name: 'Algiz',
    meaning: 'protection',
    strokes: [
      [
        [5, 15],
        [5, 4],
      ],
      [
        [1, 1],
        [5, 6],
      ],
      [
        [9, 1],
        [5, 6],
      ],
    ],
  },
  LAGUZ: {
    name: 'Laguz',
    meaning: 'water, flow',
    strokes: [
      [
        [3, 1],
        [3, 15],
      ],
      [
        [3, 1],
        [8, 6],
      ],
    ],
  },
  DAGAZ: {
    name: 'Dagaz',
    meaning: 'daybreak, a breakthrough',
    strokes: [
      [
        [2, 2],
        [2, 14],
      ],
      [
        [8, 2],
        [8, 14],
      ],
      [
        [2, 2],
        [8, 14],
      ],
      [
        [2, 14],
        [8, 2],
      ],
    ],
  },
  OTHALA: {
    name: 'Othala',
    meaning: 'inheritance, what you keep',
    strokes: [
      [
        [5, 2],
        [9, 6],
        [5, 10],
        [1, 6],
        [5, 2],
      ],
      [
        [3, 8],
        [1, 14],
      ],
      [
        [7, 8],
        [9, 14],
      ],
    ],
  },
} as const satisfies Record<string, RuneGlyph>

export type RuneName = keyof typeof RUNES

const RUNE_NAMES = Object.keys(RUNES) as RuneName[]

export const RELATION_RUNE = {
  PREREQUISITE: 'ISA',
  CORE: 'TIWAZ',
  ECOSYSTEM: 'GEBO',
  RELATED: 'RAIDO',
} as const satisfies Record<string, RuneName>

export const LOADER_RUNES: readonly RuneName[] = [
  'ALGIZ',
  'SOWILO',
  'TIWAZ',
  'KAUNAN',
  'DAGAZ',
]

export const runeForSlug = (slug: string): RuneName => {
  let hash = 0x811c9dc5
  for (let i = 0; i < slug.length; i += 1) {
    hash ^= slug.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return RUNE_NAMES[Math.abs(hash) % RUNE_NAMES.length] as RuneName
}

export const strokeToPoints = (stroke: RuneStroke): string =>
  stroke.map(([x, y]) => `${x},${y}`).join(' ')
