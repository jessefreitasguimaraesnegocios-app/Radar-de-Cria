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
  Navigation,
} from 'lucide-react';
import { Place, UserLocation } from '../types';
import { distanceMeters } from '../lib/geo';
import { computeRowMarkKeys, computeMarkPinTotals, type PlaceMarkColor } from '../lib/placeMarks';
import { MarkColorButtons } from './MarkColorButtons';
import { MarkTotalsBar } from './MarkTotalsBar';

export type { PlaceMarkColor };

type ChannelKey = 'site' | 'whatsapp' | 'instagram' | 'app';

const DEFAULT_PRIORITY: ChannelKey[] = ['site', 'whatsapp', 'instagram', 'app'];

const CHANNEL_META: Record<
  ChannelKey,
  { label: string; Icon: typeof Globe; colorClass: string }
> = {
  site: { label: 'Site', Icon: Globe, colorClass: 'text-indigo-600' },
  whatsapp: { label: 'WhatsApp', Icon: MessageCircle, colorClass: 'text-emerald-600' },
  instagram: { label: 'Instagram', Icon: Instagram, colorClass: 'text-pink-600' },
  app: { label: 'App', Icon: Smartphone, colorClass: 'text-blue-600' },
};

function placeHasChannel(p: Place, key: ChannelKey): boolean {
  if (key === 'site') return Boolean(p.website);
  if (key === 'whatsapp') return Boolean(p.whatsapp_url);
  if (key === 'instagram') return Boolean(p.instagram_url);
  return p.hasApp === true;
}

interface PlacesResultsListProps {
  places: Place[];
  userLocation: UserLocation | null;
  onOpenPlace: (placeId: string) => void;
  marks: Record<string, PlaceMarkColor>;
  setMark: (markKey: string, color: PlaceMarkColor | null) => void;
}

const PlacesResultsList: React.FC<PlacesResultsListProps> = ({
  places,
  userLocation,
  onOpenPlace,
  marks,
  setMark,
}) => {
  const [sortByDistance, setSortByDistance] = React.useState(false);
  const [sortPriority, setSortPriority] = React.useState<ChannelKey[]>(() => [...DEFAULT_PRIORITY]);

  const sortedPlaces = React.useMemo(() => {
    const list = [...places];
    const dist = (p: Place) => {
      const loc = p.geometry?.location;
      if (!userLocation || !loc) return Number.POSITIVE_INFINITY;
      return distanceMeters(userLocation, loc);
    };
    const channelCmp = (a: Place, b: Place) => {
      for (const key of sortPriority) {
        const va = placeHasChannel(a, key) ? 1 : 0;
        const vb = placeHasChannel(b, key) ? 1 : 0;
        if (vb !== va) return vb - va;
      }
      return 0;
    };

    list.sort((a, b) => {
      if (sortByDistance && userLocation) {
        const d = dist(a) - dist(b);
        if (d !== 0) return d;
      }
      const r = channelCmp(a, b);
      if (r !== 0) return r;
      return dist(a) - dist(b);
    });
    return list;
  }, [places, sortPriority, sortByDistance, userLocation]);

  const rowMarkKeys = React.useMemo(() => computeRowMarkKeys(sortedPlaces), [sortedPlaces]);
  const markPinTotals = React.useMemo(
    () => computeMarkPinTotals(sortedPlaces, rowMarkKeys, marks),
    [sortedPlaces, rowMarkKeys, marks]
  );

  const bumpChannelPriority = (k: ChannelKey) => {
    setSortPriority((prev) => {
      const i = prev.indexOf(k);
      if (i < 0) return prev;
      if (i === 0) return prev;
      const next = [...prev];
      next.splice(i, 1);
      next.unshift(k);
      return next;
    });
  };

  if (places.length === 0) return null;

  return (
    <section
      id="places-results-list"
      className="mt-14 mb-8 scroll-mt-28"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-4">
        <div className="flex items-center gap-2 md:max-w-[min(100%,42rem)]">
          <div className="bg-emerald-600 p-2 rounded-xl text-white shrink-0">
            <ListChecks className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Lista de resultados</h2>
            <p className="text-xs text-gray-500 font-medium max-w-3xl">
              Contatos: WhatsApp, Instagram, site, app, endereço e telefone. No mapa, resultados vêm{' '}
              <strong className="text-red-600">vermelhos</strong> por padrão;{' '}
              <strong className="text-amber-600">amarelo</strong> = tem potencial;{' '}
              <strong className="text-emerald-600">verde</strong> = vendeu seu sistema;{' '}
              <strong className="text-red-600">vermelho</strong> explícito = sem potencial ou não vendeu. Sua
              localização é o pino <strong className="text-blue-600">azul</strong>. Salvo neste navegador.
            </p>
          </div>
        </div>

        <div className="w-full md:w-auto flex flex-col items-center md:items-end gap-2 shrink-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 text-center md:text-right w-full md:max-w-[220px] leading-snug">
            Ordem da lista: esquerda → direita. Toque no ícone para colocá-lo em 1º (quem tem, primeiro).
          </p>
          <div
            className="flex flex-wrap items-center justify-center gap-2 md:justify-end"
            role="toolbar"
            aria-label="Ordem dos critérios na lista"
          >
            <button
              type="button"
              title={
                userLocation
                  ? sortByDistance
                    ? '1º: distância (mais perto). Toque para ordenar só por canais.'
                    : 'Toque para priorizar distância em 1º lugar'
                  : 'Ative localização no mapa para ordenar por distância'
              }
              aria-pressed={sortByDistance}
              disabled={!userLocation}
              onClick={() => setSortByDistance((v) => !v)}
              className={`relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border-2 shadow-sm transition-all active:scale-95 ${
                sortByDistance && userLocation
                  ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200/80'
                  : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-600'
              } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <Navigation className="w-5 h-5" aria-hidden />
              {sortByDistance && userLocation ? (
                <span className="absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-black text-white shadow">
                  1
                </span>
              ) : null}
            </button>
            <span
              className="hidden md:inline-block w-px h-8 self-center bg-gradient-to-b from-transparent via-gray-200 to-transparent"
              aria-hidden
            />
            <span className="md:hidden w-full max-w-[200px] h-px bg-gray-200" aria-hidden />
            {sortPriority.map((key, index) => {
              const { Icon, colorClass, label } = CHANNEL_META[key];
              const rank = sortByDistance && userLocation ? index + 2 : index + 1;
              const isPrimaryChannel = !sortByDistance || !userLocation ? index === 0 : false;
              return (
                <button
                  key={key}
                  type="button"
                  title={`${label}: toque para priorizar em 1º entre os canais (critério ${rank} no total)`}
                  aria-label={`Prioridade ${rank}: ${label}`}
                  onClick={() => bumpChannelPriority(key)}
                  className={`relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border-2 bg-white shadow-sm transition-all active:scale-95 ${
                    isPrimaryChannel
                      ? 'border-gray-400 ring-2 ring-gray-200/90'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${colorClass}`}
                >
                  <Icon className="w-5 h-5" aria-hidden />
                  <span className="absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-800 px-1 text-[9px] font-black text-white shadow">
                    {rank}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <MarkTotalsBar totals={markPinTotals} className="mb-4" />

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
            {sortedPlaces.map((place, index) => {
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
                    <MarkColorButtons mark={mark} onMarkChange={(c) => setMark(markKey, c)} />
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
