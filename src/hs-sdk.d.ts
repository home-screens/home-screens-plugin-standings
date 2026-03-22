/**
 * Type declarations for the Home Screens plugin SDK.
 * These globals are provided by the host app at runtime.
 *
 * This is an extended version covering ALL SDK features used by the
 * standings plugin — useFetchData, pluginFetch, emit, displayCache,
 * getHostSettings, UI components, and editor-only hooks.
 */

import type { FC, ReactNode } from 'react';

/** Host settings snapshot — read-only */
interface HostSettings {
  timezone: string;
  units: 'metric' | 'imperial';
  latitude: number | null;
  longitude: number | null;
  displayWidth: number;
  displayHeight: number;
  appVersion: string;
}

/** Plugin events emitted to the host */
type PluginEvent =
  | { type: 'navigate'; direction: 'next' | 'prev' | 'screen'; screenIndex?: number }
  | { type: 'refresh' }
  | { type: 'log'; level: 'info' | 'warn' | 'error'; message: string };

/** Server-side proxy options */
interface PluginFetchOptions {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  payload?: string;
  secretInjections?: {
    header?: Record<string, string>;
    query?: Record<string, string>;
  };
  cacheTtlMs?: number;
}

/** Slider component props */
interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}

/** Toggle component props */
interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** ColorPicker component props */
interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

/** SectionHeading component props */
interface SectionHeadingProps {
  children: ReactNode;
}

/** ModuleLoadingState component props */
interface ModuleLoadingStateProps {
  loading?: boolean;
  error?: string;
  children: ReactNode;
}

/** AccordionSection component props (editor-only) */
interface AccordionSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** useModuleConfig return type (editor-only) */
interface ModuleConfigResult<T> {
  config: T;
  set: (updates: Partial<T>) => void;
}

declare global {
  interface Window {
    /** Provided by the host — do not bundle React */
    React: typeof import('react');
    /** Provided by the host — do not bundle ReactDOM */
    ReactDOM: typeof import('react-dom');

    /** Shared SDK from the host app */
    __HS_SDK__: {
      // ── CSS Classes ──
      INPUT_CLASS: string;
      NESTED_INPUT_CLASS: string;

      // ── UI Components ──
      Slider: FC<SliderProps>;
      ColorPicker: FC<ColorPickerProps>;
      Toggle: FC<ToggleProps>;
      SectionHeading: FC<SectionHeadingProps>;
      ModuleLoadingState: FC<ModuleLoadingStateProps>;

      // ── Data Fetching ──
      /** React hook: polls a URL and returns [data | null, error | null] */
      useFetchData: <T>(url: string | null, refreshMs: number) => [T | null, string | null];

      // ── Display Cache ──
      displayCache: {
        get: (key: string) => unknown;
        set: (key: string, value: unknown) => void;
        prefetch: (keys: string[]) => Promise<void>;
      };

      // ── Host Settings ──
      getHostSettings: () => HostSettings;

      // ── Event Emitter ──
      emit: (event: PluginEvent) => void;

      // ── Server-Side Proxy ──
      pluginFetch: (pluginId: string, options: PluginFetchOptions) => Promise<Response>;

      // ── Editor-Only (may be undefined on display) ──
      AccordionSection?: FC<AccordionSectionProps>;
      useModuleConfig?: <T = Record<string, unknown>>(
        moduleId: string,
        screenId: string,
      ) => ModuleConfigResult<T>;
    };

    /** Plugin export target — set by the IIFE wrapper, read by the host loader */
    __HS_PLUGIN__: Record<string, unknown>;
  }
}

export {};
