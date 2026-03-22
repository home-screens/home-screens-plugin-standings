/**
 * Type declarations for Home Screens plugin component props.
 * These are the props injected by the host into your display component.
 */

/** Style properties applied to every module */
export interface ModuleStyle {
  fontSize: number;
  fontFamily: string;
  textColor: string;
  backgroundColor: string;
  borderRadius: number;
  padding: number;
  opacity: number;
  backdropBlur: number;
}

/** Base props every plugin display component receives */
export interface PluginComponentProps {
  config: Record<string, unknown>;
  style: ModuleStyle;
  timezone?: string;
  latitude?: number;
  longitude?: number;
}

/** Props for custom config section components (optional named export) */
export interface PluginConfigSectionProps {
  config: Record<string, unknown>;
  onChange: (updates: Record<string, unknown>) => void;
  moduleId: string;
  screenId: string;
}

/** Declared plugin capabilities — transparency for users, not runtime-enforced */
export type PluginPermission = 'network' | 'secrets' | 'events' | 'storage';
