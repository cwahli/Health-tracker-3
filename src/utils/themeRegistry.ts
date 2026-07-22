// Dynamic Design System and Theme Registry for Biomarker Portal
// Establishes a single source of truth for the theme editor dynamic controls.

export interface ThemeColor {
  key: string;
  label: string;
  description: string;
  defaultHex: string;
  tailwindVar: string;
}

export interface ThemeFont {
  key: string;
  label: string;
  description: string;
  fontSizeKey: string;
  options: { value: string; label: string }[];
}

export interface ThemeDesignToken {
  key: string;
  label: string;
  description: string;
  type: 'select' | 'slider';
  options?: { value: string; label: string }[];
  defaultValue: string;
  tokenKey: 'marginScale' | 'paddingScale' | 'cornerRadius' | 'shadowScale';
}

export interface ThemeComponent {
  name: string;
  description: string;
  file: string;
  stylesUsed: string[];
}

export interface ThemeElement {
  name: string;
  description: string;
  selector: string;
  stylesUsed: string[];
}

// 1. Audit Colors
export const auditColors: ThemeColor[] = [
  {
    key: 'button',
    label: 'Buttons & Highlights',
    description: 'Accent highlight coloring for primary buttons, interactions, and indicators',
    defaultHex: '#4f46e5',
    tailwindVar: '--color-indigo-600'
  },
  {
    key: 'background',
    label: 'App Background',
    description: 'Background tone applied to main container scrollpads and backdrops',
    defaultHex: '#f8fafc',
    tailwindVar: '--color-slate-50'
  },
  {
    key: 'bgCard',
    label: 'Card & Containers',
    description: 'Inner backing applied to detail cards, panels, list cells, and dropdown elements',
    defaultHex: '#ffffff',
    tailwindVar: '--color-white'
  },
  {
    key: 'border',
    label: 'Borders & Dividers',
    description: 'Divider lines, card hairlines, and structural outline strokes',
    defaultHex: '#e2e8f0',
    tailwindVar: '--color-slate-200'
  },
  {
    key: 'text',
    label: 'Primary Text',
    description: 'Main readable text used in headers, labels, and primary sentences',
    defaultHex: '#1e293b',
    tailwindVar: '--color-slate-900'
  },
  {
    key: 'textSecondary',
    label: 'Secondary Text',
    description: 'Supporting notes, timestamps, descriptions, and descriptive prompts',
    defaultHex: '#64748b',
    tailwindVar: '--color-slate-500'
  },
  {
    key: 'warning',
    label: 'Severe Warnings (Rose)',
    description: 'Accents for critical clinical ranges, warnings, errors, and deleted labels',
    defaultHex: '#f43f5e',
    tailwindVar: '--color-rose-600'
  },
  {
    key: 'caution',
    label: 'Caution / Moderate (Amber)',
    description: 'Accents for mildly out-of-range clinical measurements, attention state indicators, and offline warnings',
    defaultHex: '#d97706',
    tailwindVar: '--color-amber-600'
  },
  {
    key: 'success',
    label: 'Success Highlights (Green)',
    description: 'Accents for healthy biomarkers, approved recommendations, completed logs, and synched states',
    defaultHex: '#059669',
    tailwindVar: '--color-emerald-600'
  },
  {
    key: 'neutralSetting',
    label: 'Neutral Settings',
    description: 'Controls, non-primary badges, toggles, and metadata parameters',
    defaultHex: '#334155',
    tailwindVar: '--color-slate-700'
  }
];

// 2. Audit Fonts
export const auditFonts: ThemeFont[] = [
  {
    key: 'fontSize',
    label: 'Base Root Font Size',
    description: 'Global standard typography scaling of text root',
    fontSizeKey: 'fontSize',
    options: [
      { value: 'tiny', label: 'Tiny (12px)' },
      { value: 'small', label: 'Small (14px)' },
      { value: 'normal', label: 'Normal (16px)' },
      { value: 'large', label: 'Large (18px)' },
      { value: 'xl', label: 'XL (20px)' },
      { value: 'xxl', label: '2XL (24px)' }
    ]
  },
  {
    key: 'fontSizeTitle',
    label: 'Heading / Title Font Size',
    description: 'Size applied to primary screen header text and card headings (H1-H3)',
    fontSizeKey: 'fontSizeTitle',
    options: [
      { value: 'small', label: 'Small (14px)' },
      { value: 'normal', label: 'Normal (16px)' },
      { value: 'large', label: 'Large (18px)' },
      { value: 'xl', label: 'XL (20px)' },
      { value: 'xxl', label: '2XL (24px)' },
      { value: '3xl', label: '3XL (30px)' },
      { value: '4xl', label: '4XL (36px)' }
    ]
  },
  {
    key: 'fontSizeSubtitle',
    label: 'Subtitle Font Size',
    description: 'Size applied to section category headers (H4-H5)',
    fontSizeKey: 'fontSizeSubtitle',
    options: [
      { value: 'tiny', label: 'Tiny (12px)' },
      { value: 'small', label: 'Small (14px)' },
      { value: 'normal', label: 'Normal (16px)' },
      { value: 'large', label: 'Large (18px)' },
      { value: 'xl', label: 'XL (20px)' },
      { value: 'xxl', label: '2XL (24px)' },
      { value: '3xl', label: '3XL (30px)' }
    ]
  },
  {
    key: 'fontSizeBody',
    label: 'Standard Body Font Size',
    description: 'Readable font size for paragraphs, form fields, and regular reports',
    fontSizeKey: 'fontSizeBody',
    options: [
      { value: 'tiny', label: 'Tiny (12px)' },
      { value: 'small', label: 'Small (14px)' },
      { value: 'normal', label: 'Normal (16px)' },
      { value: 'large', label: 'Large (18px)' },
      { value: 'xl', label: 'XL (20px)' }
    ]
  },
  {
    key: 'fontSizeBodySmall',
    label: 'Supporting / Caption Font Size',
    description: 'Subtle captions, secondary lists, diagnostic advice text, and footnotes',
    fontSizeKey: 'fontSizeBodySmall',
    options: [
      { value: 'tiny', label: 'Tiny (12px)' },
      { value: 'small', label: 'Small (14px)' },
      { value: 'normal', label: 'Normal (16px)' },
      { value: 'large', label: 'Large (18px)' }
    ]
  },
  {
    key: 'fontSizeSubtitleSmall',
    label: 'Small Section Tag Font Size',
    description: 'Text size for pill badges, button labels, and small subtitles',
    fontSizeKey: 'fontSizeSubtitleSmall',
    options: [
      { value: 'tiny', label: 'Tiny (12px)' },
      { value: 'small', label: 'Small (14px)' },
      { value: 'normal', label: 'Normal (16px)' },
      { value: 'large', label: 'Large (18px)' },
      { value: 'xl', label: 'XL (20px)' }
    ]
  },
  {
    key: 'fontSizeKeyMetric',
    label: 'Key Metric Font Size',
    description: 'Prominent highlight numbers (e.g. daily scores, biomarker numeric readouts)',
    fontSizeKey: 'fontSizeKeyMetric',
    options: [
      { value: 'large', label: 'Large (18px)' },
      { value: 'xl', label: 'XL (20px)' },
      { value: 'xxl', label: '2XL (24px)' },
      { value: '3xl', label: '3XL (30px)' },
      { value: '4xl', label: '4XL (36px)' },
      { value: '5xl', label: '5XL (48px)' },
      { value: '6xl', label: '6XL (60px)' }
    ]
  },
  {
    key: 'fontSizeXS',
    label: 'Micro / Label Font Size',
    description: 'Very small uppercase labels, charts legend descriptors, and status tags',
    fontSizeKey: 'fontSizeXS',
    options: [
      { value: 'tiny', label: 'Tiny (12px)' },
      { value: 'small', label: 'Small (14px)' },
      { value: 'normal', label: 'Normal (16px)' }
    ]
  }
];

// 3. Audit Design Tokens (Spacing, Corner Radius, Shadows)
export const auditDesignTokens: ThemeDesignToken[] = [
  {
    key: 'marginScale',
    label: 'Margin Gap Factor',
    description: 'Proportion of spacing margin used between layout blocks and grid containers',
    type: 'select',
    options: [
      { value: 'compact', label: 'Compact Spacing (0.8x)' },
      { value: 'normal', label: 'Normal Spacing (1.0x)' },
      { value: 'relaxed', label: 'Relaxed Spacing (1.25x)' }
    ],
    defaultValue: 'normal',
    tokenKey: 'marginScale'
  },
  {
    key: 'paddingScale',
    label: 'Inner Padding Factor',
    description: 'Proportion of breathing space inside cards, buttons, and input fields',
    type: 'select',
    options: [
      { value: 'compact', label: 'Compact Padding (0.8x)' },
      { value: 'normal', label: 'Normal Padding (1.0x)' },
      { value: 'relaxed', label: 'Relaxed Padding (1.25x)' }
    ],
    defaultValue: 'normal',
    tokenKey: 'paddingScale'
  },
  {
    key: 'cornerRadius',
    label: 'Corner Rounding Scale',
    description: 'Overall border radius rounding factor of card outlines and action buttons',
    type: 'select',
    options: [
      { value: 'none', label: 'None (Brutalist Sharp)' },
      { value: 'small', label: 'Subtle Round (0.5x)' },
      { value: 'normal', label: 'Standard (1.0x - Rounded 2xl)' },
      { value: 'large', label: 'Pillowy Rounded (1.5x - Rounded 3xl)' },
      { value: 'pill', label: 'Maximum Rounded (2.5x)' }
    ],
    defaultValue: 'normal',
    tokenKey: 'cornerRadius'
  },
  {
    key: 'shadowScale',
    label: 'Shadow Intensity & Depth',
    description: 'Contrast intensity of the drop shadows framing the modular containers',
    type: 'select',
    options: [
      { value: 'none', label: 'None (Flat 2D Aesthetic)' },
      { value: 'light', label: 'Light (Minimal Contrast)' },
      { value: 'normal', label: 'Normal (Refined Elevation)' },
      { value: 'heavy', label: 'High Depth (Tactile Elevation)' }
    ],
    defaultValue: 'normal',
    tokenKey: 'shadowScale'
  }
];

// 4. Audit Components (ReadOnly Static List for design alignment)
export const auditComponents: ThemeComponent[] = [
  {
    name: 'LogChat',
    description: 'Main conversational engine powered by LLM processing to parse, extract, and record nutritional and biomarker values.',
    file: '/src/components/LogChat.tsx',
    stylesUsed: ['bg-slate-900', 'border-slate-800', 'p-4', 'rounded-3xl', 'shadow-xl']
  },
  {
    name: 'FoodHistoryTab',
    description: 'Grid layout of historic meal blocks categorized by timezone date anchors, integrating nutritional metrics.',
    file: '/src/components/FoodHistoryTab.tsx',
    stylesUsed: ['p-6', 'grid-cols-1', 'md:grid-cols-2', 'gap-4']
  },
  {
    name: 'FoodCard',
    description: 'Multi-state meal analysis capsule demonstrating active macro gauges, cropped meal captures, dietitian summaries, and zoom features.',
    file: '/src/components/FoodCard.tsx',
    stylesUsed: ['rounded-3xl', 'shadow-sm', 'border-slate-200', 'p-4', 'mb-4']
  },
  {
    name: 'HomeTab',
    description: 'Personalized dashboard displaying the clinical baseline, actionable health triggers, and daily biomarker highlights.',
    file: '/src/components/HomeTab.tsx',
    stylesUsed: ['p-6', 'space-y-6', 'max-w-7xl']
  },
  {
    name: 'BiomarkerExpandedSection',
    description: 'Detailed panel for clinical analysis containing reference sliders, demographic bounds, and temporal graphs.',
    file: '/src/components/BiomarkerExpandedSection.tsx',
    stylesUsed: ['border-t', 'p-4', 'bg-slate-50', 'space-y-4']
  },
  {
    name: 'InteractivePlacesMap',
    description: 'Responsive map utilizing Google Maps Platform or HTML5 canvas search vectors for identifying wellness locations.',
    file: '/src/components/InteractivePlacesMap.tsx',
    stylesUsed: ['h-[350px]', 'w-full', 'rounded-2xl', 'shadow-inner']
  },
  {
    name: 'FullScreenLogViewer',
    description: 'Interactive overlay compiling detailed operation logs, database sync queries, and diagnostic tracking telemetry.',
    file: '/src/components/FullScreenLogViewer.tsx',
    stylesUsed: ['bg-white', 'dark:bg-slate-900', 'p-6', 'z-[9999]']
  }
];

// 5. Audit Elements (ReadOnly Static List for design alignment)
export const auditElements: ThemeElement[] = [
  {
    name: 'Primary Button',
    description: 'High-contrast main action buttons with dynamic active hover scale transitions',
    selector: 'button.bg-indigo-600',
    stylesUsed: ['bg-indigo-600', 'hover:bg-indigo-700', 'text-white', 'px-4', 'py-2', 'rounded-xl', 'text-xs', 'font-semibold', 'transition-all']
  },
  {
    name: 'Secondary Button',
    description: 'Subtle support button used in secondary interactions or toggles',
    selector: 'button.bg-slate-100',
    stylesUsed: ['bg-slate-100', 'hover:bg-slate-200', 'text-slate-700', 'px-4', 'py-2', 'rounded-xl', 'text-xs', 'font-semibold']
  },
  {
    name: 'Form Control Selects',
    description: 'Consistent dropdown field used throughout profile, theme, and biomarker range builders',
    selector: 'select',
    stylesUsed: ['bg-slate-50', 'border-slate-200', 'rounded-2xl', 'px-3', 'py-2', 'text-sm']
  },
  {
    name: 'Paragraph Copy',
    description: 'Informational descriptive body text blocks and guidelines',
    selector: 'p',
    stylesUsed: ['text-slate-500', 'dark:text-slate-400', 'leading-relaxed', 'text-xs', 'md:text-sm']
  },
  {
    name: 'Status Badge',
    description: 'Dynamic color-coded status chips indicating severity levels',
    selector: '.badge-status',
    stylesUsed: ['px-2.5', 'py-1', 'rounded-full', 'text-xs', 'font-semibold', 'border']
  }
];
