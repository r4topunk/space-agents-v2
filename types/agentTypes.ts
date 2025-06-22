// Type definitions for agent communication and nounspace configuration

export interface ResearchData {
  summary: string;
  keyTopics: string[];
  socialAccounts: {
    farcaster: string[];
    twitter: string[];
  };
  relevantLinks: Array<{
    title: string;
    url: string;
    type: 'official' | 'resource' | 'community';
  }>;
  contentSuggestions: Array<{
    type: string;
    source?: string;
    filter?: string;
    value?: string;
    purpose?: string;
    content?: string;
  }>;
  colors: {
    primary: string;
    secondary: string;
  };
}

export interface FidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FidgetDesign {
  id: string;
  type: string;
  position: FidgetPosition;
  settings: Record<string, any>;
}

export interface DesignPlan {
  fidgets: FidgetDesign[];
  gridLayout: (string | null)[][];
  rationale: string;
}

export interface FidgetConfig {
  editable: boolean;
  settings: Record<string, any>;
  data: Record<string, any>;
}

export interface FidgetInstanceDatum {
  config: FidgetConfig;
  fidgetType: string;
  id: string;
}

export type NounspaceConfig = FidgetInstanceDatum[];

// Valid fidget types for validation
export const VALID_FIDGET_TYPES = [
  'text', 'gallery', 'Video', 'feed', 'cast', 'Chat', 
  'iframe', 'links', 'Rss', 'Swap', 'Portfolio', 
  'Market', 'governance', 'SnapShot', 'frame', 'FramesV2'
] as const;

export type FidgetType = typeof VALID_FIDGET_TYPES[number];

// Minimum size requirements for each fidget type
export const FIDGET_MIN_SIZES: Record<FidgetType, { width: number; height: number }> = {
  'text': { width: 3, height: 2 },
  'gallery': { width: 2, height: 2 },
  'Video': { width: 2, height: 2 },
  'feed': { width: 4, height: 2 },
  'cast': { width: 3, height: 1 },
  'Chat': { width: 3, height: 2 },
  'iframe': { width: 2, height: 2 },
  'links': { width: 2, height: 2 },
  'Rss': { width: 3, height: 2 },
  'Swap': { width: 3, height: 3 },
  'Portfolio': { width: 3, height: 3 },
  'Market': { width: 3, height: 2 },
  'governance': { width: 4, height: 3 },
  'SnapShot': { width: 4, height: 3 },
  'frame': { width: 2, height: 2 },
  'FramesV2': { width: 2, height: 2 }
};
