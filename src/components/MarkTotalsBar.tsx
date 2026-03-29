import React from 'react';
import { twMerge } from 'tailwind-merge';
import type { MarkPinTotals } from '../lib/placeMarks';

type MarkTotalsBarProps = {
  totals: MarkPinTotals;
  className?: string;
  /** Texto menor no mobile. */
  compact?: boolean;
};

/**
 * Resumo verde / amarelo / vermelho (mapa) para lista e rodapé do mapa.
 */
export const MarkTotalsBar: React.FC<MarkTotalsBarProps> = ({ totals, className, compact }) => {
  if (totals.total === 0) return null;

  const pill = compact ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs';

  return (
    <div
      className={twMerge(
        'flex flex-wrap items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white/95 px-2 py-2 shadow-sm',
        className
      )}
      role="status"
      aria-label="Totais por cor no funil"
    >
      <span
        className={twMerge(
          'inline-flex items-center gap-1 rounded-full bg-emerald-100 font-black text-emerald-900 tabular-nums',
          pill
        )}
        title="Vendeu o sistema"
      >
        <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
        Verde {totals.green}
      </span>
      <span
        className={twMerge(
          'inline-flex items-center gap-1 rounded-full bg-amber-100 font-black text-amber-950 tabular-nums',
          pill
        )}
        title="Tem potencial"
      >
        <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden />
        Amarelo {totals.yellow}
      </span>
      <span
        className={twMerge(
          'inline-flex items-center gap-1 rounded-full bg-red-100 font-black text-red-900 tabular-nums',
          pill
        )}
        title="Vermelho no mapa: sem classificar ou marcado sem potencial"
      >
        <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden />
        Vermelho {totals.redOnMap}
      </span>
      <span
        className={twMerge('text-[10px] font-bold text-gray-400 tabular-nums', compact && 'text-[9px]')}
      >
        Total {totals.total}
      </span>
    </div>
  );
};
