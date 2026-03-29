import React from 'react';
import type { PlaceMarkColor } from '../lib/placeMarks';

const COLORS = [
  {
    key: 'red' as const,
    className: 'bg-red-500 hover:bg-red-600',
    title: 'Sem potencial / não vendeu',
  },
  {
    key: 'yellow' as const,
    className: 'bg-amber-400 hover:bg-amber-500',
    title: 'Tem potencial',
  },
  {
    key: 'green' as const,
    className: 'bg-emerald-500 hover:bg-emerald-600',
    title: 'Vendeu o sistema',
  },
] as const;

type MarkColorButtonsProps = {
  mark?: PlaceMarkColor;
  onMarkChange: (next: PlaceMarkColor | null) => void;
  /** Botões menores (ex.: cards no carrossel). */
  compact?: boolean;
};

/**
 * Três cores do funil + limpar; cliques não propagam (uso dentro de cards clicáveis).
 */
export const MarkColorButtons: React.FC<MarkColorButtonsProps> = ({
  mark,
  onMarkChange,
  compact,
}) => {
  const btn = compact ? 'h-8 w-8 rounded-md' : 'h-9 w-9 rounded-lg';

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-2"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onKeyDown={(e) => e.stopPropagation()}
      role="group"
      aria-label="Marcar negócio"
    >
      <div className="flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm gap-0.5">
        {COLORS.map(({ key, className, title }) => (
          <button
            key={key}
            type="button"
            title={title}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMarkChange(mark === key ? null : key);
            }}
            className={`${btn} transition-all ${
              mark === key
                ? `${className} ring-2 ring-offset-1 ring-gray-900 scale-105`
                : `${className} opacity-40 hover:opacity-100`
            }`}
            aria-pressed={mark === key}
          />
        ))}
      </div>
      {mark && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onMarkChange(null);
          }}
          className="text-[10px] font-black uppercase text-gray-500 hover:text-gray-800 underline"
        >
          Limpar
        </button>
      )}
    </div>
  );
};
