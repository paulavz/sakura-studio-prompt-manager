"use client";

import { useState, useEffect, useCallback } from "react";

const DEFAULT_MIN = 1;
const DEFAULT_MAX = 4000;
const MIN_SLIDER_MIN = 0;
const MIN_SLIDER_MAX = 20;
const MAX_SLIDER_MIN = 20;
const MAX_SLIDER_MAX = 500;

function useVarLengthSettings() {
  const [min, setMinState] = useState<number>(DEFAULT_MIN);
  const [max, setMaxState] = useState<number>(DEFAULT_MAX);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const storedMin = localStorage.getItem("sakura.minVarLength");
      const storedMax = localStorage.getItem("sakura.maxVarLength");
      setMinState(storedMin !== null ? parseInt(storedMin, 10) : DEFAULT_MIN);
      setMaxState(storedMax !== null ? parseInt(storedMax, 10) : DEFAULT_MAX);
    } catch {
      // localStorage unavailable
    }
    setLoaded(true);
  }, []);

  const setMin = useCallback((value: number) => {
    setMinState(value);
    try {
      localStorage.setItem("sakura.minVarLength", String(value));
    } catch {
      // localStorage unavailable
    }
  }, []);

  const setMax = useCallback((value: number) => {
    setMaxState(value);
    try {
      localStorage.setItem("sakura.maxVarLength", String(value));
    } catch {
      // localStorage unavailable
    }
  }, []);

  const reset = useCallback(() => {
    setMinState(DEFAULT_MIN);
    setMaxState(DEFAULT_MAX);
    try {
      localStorage.removeItem("sakura.minVarLength");
      localStorage.removeItem("sakura.maxVarLength");
    } catch {
      // localStorage unavailable
    }
  }, []);

  return { min, max, setMin, setMax, reset, loaded };
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10);
    if (!Number.isNaN(v)) {
      onChange(v);
    }
  };

  return (
    <div className="mb-5">
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-[12.5px] text-gray-800 font-medium">{label}</span>
        <span className="font-mono text-xs text-variable-text">
          {value}
        </span>
      </div>
      <div className="relative h-[6px]">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          aria-label={label}
        />
        <div className="absolute inset-0 bg-gray-100 rounded-[3px]" />
        <div
          className="absolute left-0 top-0 bottom-0 rounded-[3px]"
          style={{
            width: `${pct}%`,
            backgroundColor: "var(--color-sakura)",
            boxShadow: "0 0 6px var(--color-sakura-50)",
          }}
        />
        <div
          className="absolute rounded-full bg-white"
          style={{
            left: `calc(${pct}% - 8px)`,
            top: -5,
            width: 16,
            height: 16,
            border: "2px solid var(--color-sakura)",
            boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
          }}
        />
      </div>
      <div className="flex justify-between mt-[5px]">
        <span className="text-[10px] text-gray-400 font-mono">{min}</span>
        <span className="text-[10px] text-gray-400 font-mono">{max}</span>
      </div>
    </div>
  );
}

export default function SettingsVariablesPage() {
  const { min, max, setMin, setMax, reset, loaded } = useVarLengthSettings();

  if (!loaded) {
    return (
      <div data-testid="settings-variables-page" className="animate-pulse">
        <div className="h-[24px] bg-gray-200 rounded w-[200px] mb-2" />
        <div className="h-[16px] bg-gray-200 rounded w-[300px] mb-5" />
        <div className="border border-gray-200 rounded-[var(--radius)] p-5 bg-gray-50">
          <div className="h-[60px] bg-gray-200 rounded mb-4" />
          <div className="h-[60px] bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div data-testid="settings-variables-page">
      <div data-testid="variables-title" className="text-[18px] font-bold tracking-[-0.01em] text-black">
        Variables Drawer
      </div>
      <div className="text-xs text-gray-400 mt-[3px] mb-5">
        Defaults applied to every prompt unless overridden by environment variables.
      </div>

      <div className="border border-gray-200 rounded-[var(--radius)] p-5 bg-gray-50">
        <Slider label="MIN_VAR_LENGTH" value={min} min={MIN_SLIDER_MIN} max={MIN_SLIDER_MAX} onChange={setMin} />
        <Slider label="MAX_VAR_LENGTH" value={max} min={MAX_SLIDER_MIN} max={MAX_SLIDER_MAX} onChange={setMax} />
        <div className="flex justify-between items-center mt-2">
          <span className="text-[11px] text-gray-400 font-mono leading-relaxed">
            env override: SAKURA_MIN_VAR / SAKURA_MAX_VAR
          </span>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-[5px] px-3 py-[6px] rounded-[var(--radius-sm)] border border-gray-200 text-[12px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Reset to defaults
          </button>
        </div>
      </div>

      <div
        className="mt-5 p-4 rounded-[var(--radius)]"
        style={{
          backgroundColor: "var(--color-sakura-soft)",
          border: "1px solid var(--color-sakura-50)",
        }}
      >
        <div className="text-[11.5px] font-semibold mb-1 text-variable-text">
          How this is applied
        </div>
        <div className="text-[11.5px] text-gray-700 leading-relaxed">
          Each variable input shows{" "}
          <code className="font-mono text-[11px]">{"{N} / {MAX}"}</code>{" "}
          below it and blocks the Copy button when out of range. No red borders or inline error styling.
        </div>
      </div>
    </div>
  );
}
