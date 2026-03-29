import React from 'react';
import PlaceCard from './PlaceCard';
import { Place } from '../types';
import { computeRowMarkKeys, type PlaceMarkColor } from '../lib/placeMarks';

interface MobilePlacesCarouselProps {
  places: Place[];
  marks: Record<string, PlaceMarkColor>;
  setMark: (markKey: string, color: PlaceMarkColor | null) => void;
  onOpenPlace: (placeId: string) => void;
}

/**
 * Lista em carrossel horizontal (scroll-snap) só em telas &lt; md — uso no lugar do grid + tabela no fim da página.
 */
const MobilePlacesCarousel: React.FC<MobilePlacesCarouselProps> = ({
  places,
  marks,
  setMark,
  onOpenPlace,
}) => {
  const rowMarkKeys = React.useMemo(() => computeRowMarkKeys(places), [places]);

  if (places.length === 0) return null;

  return (
    <section className="mb-6 md:hidden" aria-label="Estabelecimentos — deslize horizontalmente">
      <div className="flex items-end justify-between gap-2 mb-3 px-0">
        <div>
          <h2 className="text-lg font-black tracking-tight text-gray-900">Estabelecimentos</h2>
          <p className="text-[11px] font-medium text-gray-500">
            Deslize para o lado <span aria-hidden>→</span> — um por vez
          </p>
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 shrink-0">
          {places.length} locais
        </span>
      </div>

      <div className="flex gap-4 overflow-x-auto overflow-y-visible overscroll-x-contain snap-x snap-mandatory pb-3 pt-1 -mx-4 px-4 [scrollbar-width:thin] touch-pan-x">
        {places.map((place, index) => {
          const markKey = rowMarkKeys[index] ?? `row:${index}`;
          const mark = marks[markKey];
          const ring =
            mark === 'red'
              ? 'ring-2 ring-red-400'
              : mark === 'yellow'
                ? 'ring-2 ring-amber-400'
                : mark === 'green'
                  ? 'ring-2 ring-emerald-500'
                  : '';

          return (
            <article
              key={place.place_id}
              className={`snap-center shrink-0 w-[min(88vw,20rem)] flex flex-col gap-3 ${ring} rounded-2xl`}
            >
              <PlaceCard place={place} onClick={() => onOpenPlace(place.place_id)} />
              <div className="flex flex-col items-center gap-2 px-1 pb-1">
                <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">Marcar no mapa</p>
                <div className="flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
                  {(
                    [
                      { key: 'red' as const, className: 'bg-red-500 hover:bg-red-600' },
                      { key: 'yellow' as const, className: 'bg-amber-400 hover:bg-amber-500' },
                      { key: 'green' as const, className: 'bg-emerald-500 hover:bg-emerald-600' },
                    ] as const
                  ).map(({ key, className }) => (
                    <button
                      key={key}
                      type="button"
                      title={
                        key === 'red'
                          ? 'Sem potencial / não vendeu'
                          : key === 'yellow'
                            ? 'Tem potencial'
                            : 'Vendeu o sistema'
                      }
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMark(markKey, mark === key ? null : key);
                      }}
                      className={`h-9 w-9 rounded-lg transition-all ${
                        mark === key
                          ? `${className} ring-2 ring-offset-2 ring-gray-900 scale-105`
                          : `${className} opacity-40 hover:opacity-100`
                      }`}
                      aria-pressed={mark === key}
                    />
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default MobilePlacesCarousel;
