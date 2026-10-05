export interface UploadedImage {
  file: File | null;
  rawUrl: string;
  name: string;
  size: number;
  width: number;
  height: number;
}

export type PhotoPresetType = '35x45' | '2x2' | 'custom';
export type DimensionUnit = 'mm' | 'inch' | 'px';

export interface PhotoSizeConfig {
  preset: PhotoPresetType;
  width: number;
  height: number;
  unit: DimensionUnit;
  // Computed exact physical size in millimeters
  widthMm: number;
  heightMm: number;
}

export const DEFAULT_PHOTO_SIZE: PhotoSizeConfig = {
  preset: '35x45',
  width: 35,
  height: 45,
  unit: 'mm',
  widthMm: 35,
  heightMm: 45,
};

export interface AspectRatioPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  ratio: number; // width / height
  description: string;
}

export const ASPECT_RATIO_PRESETS: AspectRatioPreset[] = [
  {
    id: '35x45',
    name: '35 × 45 mm',
    widthMm: 35,
    heightMm: 45,
    ratio: 35 / 45, // 0.7778
    description: 'Standard passport (EU, UK, Schengen, Australia, Canada, International)',
  },
  {
    id: '51x51',
    name: '2 × 2 in (51 × 51 mm)',
    widthMm: 50.8,
    heightMm: 50.8,
    ratio: 1,
    description: 'US Passport & Visa, India Visa',
  },
  {
    id: '33x48',
    name: '33 × 48 mm',
    widthMm: 33,
    heightMm: 48,
    ratio: 33 / 48,
    description: 'China Passport & Visa',
  },
  {
    id: '35x35',
    name: '35 × 35 mm',
    widthMm: 35,
    heightMm: 35,
    ratio: 1,
    description: 'Global square visa format',
  },
];

export interface EditorAdjustments {
  brightness: number; // -100 to 100, default 0
  contrast: number; // -100 to 100, default 0
  saturation: number; // -100 to 100, default 0
  grayscale: boolean; // default false
}

export interface EditorState {
  pan: { x: number; y: number };
  zoom: number; // 0.5 to 4.0, default 1.0
  rotation: number; // in degrees (0, 90, 180, 270)
  adjustments: EditorAdjustments;
  aspectPreset: AspectRatioPreset;
  photoSize: PhotoSizeConfig;
  showBiometricGuide: boolean;
}

export const DEFAULT_ADJUSTMENTS: EditorAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  grayscale: false,
};

export const DEFAULT_EDITOR_STATE: EditorState = {
  pan: { x: 0, y: 0 },
  zoom: 1,
  rotation: 0,
  adjustments: { ...DEFAULT_ADJUSTMENTS },
  aspectPreset: ASPECT_RATIO_PRESETS[0], // 35 × 45 mm
  photoSize: { ...DEFAULT_PHOTO_SIZE },
  showBiometricGuide: true,
};

export interface DetectedFace {
  x: number; // in image pixels
  y: number;
  width: number;
  height: number;
  eyeY?: number;
  confidence: number;
  source: 'native-shape-detector' | 'algorithmic-feature-locator';
}

export type PageOrientation = 'portrait' | 'landscape';

export interface MarginsConfig {
  top: number;
  bottom: number;
  left: number;
  right: number;
  isAuto: boolean;
}

export interface SpacingConfig {
  horizontal: number;
  vertical: number;
  isAuto: boolean;
}

export interface BorderConfig {
  enabled: boolean;
  color: string;
  widthPx: number; // 1px default
}

export interface A4LayoutSettings {
  orientation: PageOrientation;
  copies: number;
  photoSize: PhotoSizeConfig;
  margins: MarginsConfig;
  spacing: SpacingConfig;
  border: BorderConfig;
}

export const DEFAULT_A4_SETTINGS: A4LayoutSettings = {
  orientation: 'portrait',
  copies: 6,
  photoSize: { ...DEFAULT_PHOTO_SIZE },
  margins: {
    top: 15,
    bottom: 15,
    left: 15,
    right: 15,
    isAuto: true,
  },
  spacing: {
    horizontal: 5,
    vertical: 5,
    isAuto: true,
  },
  border: {
    enabled: true,
    color: '#000000',
    widthPx: 1,
  },
};

export interface A4PhotoSlot {
  index: number;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

export interface A4SmartGridResult {
  fits: boolean;
  errorMessage?: string;
  paperWidthMm: number;
  paperHeightMm: number;
  cols: number;
  rows: number;
  slots: A4PhotoSlot[];
  totalGridWidthMm: number;
  totalGridHeightMm: number;
  actualMargins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  actualSpacing: {
    horizontal: number;
    vertical: number;
  };
}

export const COPY_PRESETS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20] as const;

export interface PaperSize {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  category: 'standard' | 'photo';
  description: string;
}

export const PAPER_SIZES: PaperSize[] = [
  {
    id: 'a4',
    name: 'A4',
    widthMm: 210,
    heightMm: 297,
    category: 'standard',
    description: '210 × 297 mm · International standard document paper',
  },
  {
    id: 'us-letter',
    name: 'US Letter',
    widthMm: 215.9,
    heightMm: 279.4,
    category: 'standard',
    description: '8.5 × 11 in (216 × 279 mm) · North America standard',
  },
  {
    id: '4x6',
    name: '4 × 6 in (10 × 15 cm)',
    widthMm: 101.6,
    heightMm: 152.4,
    category: 'photo',
    description: '102 × 152 mm · Standard postcard / photo kiosk paper',
  },
  {
    id: '5x7',
    name: '5 × 7 in (13 × 18 cm)',
    widthMm: 127,
    heightMm: 177.8,
    category: 'photo',
    description: '127 × 178 mm · Medium photo paper',
  },
];

export interface PrintLayoutConfig {
  paperSize: PaperSize;
  orientation: 'portrait' | 'landscape';
  photoCount: number;
  spacingMm: number;
  marginMm: number;
  showCutLines: boolean;
}

export const DEFAULT_PRINT_CONFIG: PrintLayoutConfig = {
  paperSize: PAPER_SIZES[0],
  orientation: 'portrait',
  photoCount: 8,
  spacingMm: 4,
  marginMm: 10,
  showCutLines: true,
};

