import React from 'react';
import {
  ExternalLink,
  Smartphone,
  ListChecks,
  MessageCircle,
  Instagram,
  Globe,
  MapPin,
  Phone,
} from 'lucide-react';
import { Place } from '../types';
import {
  computeRowMarkKeys,
  type PlaceMarkColor,
} from '../lib/placeMarks';

export type { PlaceMarkColor };

interface PlacesResultsListProps {
  places: Place[];
  onOpenPlace: (placeId: string) => void;
  marks: Record<string, PlaceMarkColor>;
  setMark: (markKey: string, color: PlaceMarkColor | null) => void;
}

const PlacesResultsList: React.FC<PlacesResultsListProps> = ({
  places,
  onOpenPlace,
  marks,
  setMark,
}) => {
  const rowMarkKeys = React.useMemo(() => computeRowMarkKeys(places), [places]);

  if (places.length === 0) return null;

  return (
    <section
      id="places-results-list"
      className="mt-14 mb-8 scroll-mt-28"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-emerald-600 p-2 rounded-xl text-white">
          <ListChecks className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Lista de resultados</h2>
          <p className="text-xs text-gray-500 font-medium max-w-3xl">
            Contatos para abordagem: WhatsApp, Instagram, site, app, endereço e telefone. Use as cores como
            funil: vermelho (descartado), amarelo (follow-up), verde (combinado / quente). As mesmas cores
            aparecem no mapa. Salvo neste navegador.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-[960px] w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80 text-[10px] font-black uppercase tracking-wider text-gray-500">
              <th className="px-3 py-3 w-[14%]">Nome</th>
              <th className="px-3 py-3 w-[18%]">Endereço</th>
              <th className="px-3 py-3 w-[10%]">Telefone</th>
              <th className="px-3 py-3 w-[8%]">WhatsApp</th>
              <th className="px-3 py-3 w-[8%]">Instagram</th>
              <th className="px-3 py-3 w-[8%]">Site</th>
              <th className="px-3 py-3 w-[6%] text-center">App</th>
              <th className="px-3 py-3 w-[20%] text-center">Marcar</th>
            </tr>
          </thead>
          <tbody>
            {places.map((place, index) => {
              const markKey = rowMarkKeys[index] ?? `row:${index}`;
              const mark = marks[markKey];
              const addr = place.formatted_address || place.vicinity || '—';
              const rowTint =
                mark === 'red'
                  ? 'bg-red-50/60'
                  : mark === 'yellow'
                    ? 'bg-amber-50/60'
                    : mark === 'green'
                      ? 'bg-emerald-50/60'
                      : '';

              return (
                <tr
                  key={markKey}
                  className={`border-b border-gray-100 last:border-0 align-top ${rowTint}`}
                >
                  <td className="px-3 py-3 font-bold text-gray-900">
                    <button
                      type="button"
                      onClick={() => onOpenPlace(place.place_id)}
                      className="text-left hover:text-blue-600 hover:underline"
                    >
                      {place.name}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-gray-600">
                    <span className="inline-flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-400" />
                      <span className="line-clamp-3">{addr}</span>
                    </span>
                  </td>
                  <td className="px-3 py-3 text-gray-700">
                    {place.formatted_phone_number ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        {place.formatted_phone_number}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {place.whatsapp_url ? (
                      <a
                        href={place.whatsapp_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Abrir
                        <ExternalLink className="w-3 h-3 opacity-50" />
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {place.instagram_url ? (
                      <a
                        href={place.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-pink-700 hover:underline"
                      >
                        <Instagram className="w-4 h-4" />
                        Perfil
                        <ExternalLink className="w-3 h-3 opacity-50" />
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {place.website ? (
                      <a
                        href={place.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-bold text-indigo-700 hover:underline truncate max-w-[120px]"
                        title={place.website}
                      >
                        <Globe className="w-4 h-4 shrink-0" />
                        Site
                        <ExternalLink className="w-3 h-3 opacity-50 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={`inline-flex items-center justify-center gap-1 text-[10px] font-black uppercase ${
                        place.hasApp ? 'text-blue-600' : 'text-gray-400'
                      }`}
                    >
                      <Smartphone className="w-4 h-4" />
                      {place.hasApp ? 'Sim' : 'Não'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center justify-center gap-2">
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
                            title={key === 'red' ? 'Vermelho' : key === 'yellow' ? 'Amarelo' : 'Verde'}
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
                      {mark && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMark(markKey, null);
                          }}
                          className="text-[10px] font-black uppercase text-gray-500 hover:text-gray-800 underline"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default PlacesResultsList;
