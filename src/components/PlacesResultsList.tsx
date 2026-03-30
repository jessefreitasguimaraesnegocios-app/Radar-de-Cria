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

const CHANNEL_LABEL: Record<ChannelKey, string> = {
  site: 'Site: desligado = oculta quem tem site',
  whatsapp: 'WhatsApp: desligado = oculta quem tem WhatsApp',
  instagram: 'Instagram: desligado = oculta quem tem Instagram',
  app: 'App: desligado = oculta quem tem app próprio',
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
  const [channelOn, setChannelOn] = React.useState<Record<ChannelKey, boolean>>({
    site: true,
    whatsapp: true,
    instagram: true,
    app: true,
  });

  const visiblePlaces = React.useMemo(() => {
    const keys: ChannelKey[] = ['site', 'whatsapp', 'instagram', 'app'];
    return places.filter((p) =>
      keys.every((k) => channelOn[k] || !placeHasChannel(p, k))
    );
  }, [places, channelOn]);

  const sortedPlaces = React.useMemo(() => {
    const list = [...visiblePlaces];
    const dist = (p: Place) => {
      const loc = p.geometry?.location;
      if (!userLocation || !loc) return Number.POSITIVE_INFINITY;
      return distanceMeters(userLocation, loc);
    };
    const channelCmp = (a: Place, b: Place) => {
      const bits = (p: Place) =>
        [
          Boolean(p.website),
          Boolean(p.whatsapp_url),
          Boolean(p.instagram_url),
          p.hasApp === true,
        ] as const;
      const ba = bits(a);
      const bb = bits(b);
      for (let i = 0; i < ba.length; i++) {
        const va = ba[i] ? 1 : 0;
        const vb = bb[i] ? 1 : 0;
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
  }, [visiblePlaces, sortByDistance, userLocation]);

  const rowMarkKeys = React.useMemo(() => computeRowMarkKeys(sortedPlaces), [sortedPlaces]);
  const markPinTotals = React.useMemo(
    () => computeMarkPinTotals(sortedPlaces, rowMarkKeys, marks),
    [sortedPlaces, rowMarkKeys, marks]
  );

  const toggleChannel = (k: ChannelKey) => {
    setChannelOn((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  if (places.length === 0) return null;

  return (
    <section
      id="places-results-list"
      className="mt-14 mb-8 scroll-mt-28"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
        <div className="flex items-center gap-2">
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

        <div
          className="flex flex-wrap items-center gap-2 sm:justify-end"
          role="toolbar"
          aria-label="Ordenar e filtrar a tabela"
        >
          <button
            type="button"
            title={
              userLocation
                ? sortByDistance
                  ? 'Ordenação: distância (ligado)'
                  : 'Ordenação: site → WhatsApp → Instagram → app; depois distância'
                : 'Ative localização no mapa para ordenar por distância'
            }
            aria-pressed={sortByDistance}
            disabled={!userLocation}
            onClick={() => setSortByDistance((v) => !v)}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 transition-all ${
              sortByDistance && userLocation
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300 hover:text-gray-600'
            } disabled:cursor-not-allowed disabled:opacity-40`}
          >
            <Navigation className="w-5 h-5" aria-hidden />
          </button>
          <span className="hidden sm:inline w-px h-6 bg-gray-200 mx-0.5" aria-hidden />
          {(
            [
              ['site', Globe, 'text-indigo-600'] as const,
              ['whatsapp', MessageCircle, 'text-emerald-600'] as const,
              ['instagram', Instagram, 'text-pink-600'] as const,
              ['app', Smartphone, 'text-blue-600'] as const,
            ] as const
          ).map(([key, Icon, colorClass]) => {
            const on = channelOn[key];
            return (
              <button
                key={key}
                type="button"
                title={CHANNEL_LABEL[key]}
                aria-pressed={on}
                onClick={() => toggleChannel(key)}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border-2 transition-all ${
                  on
                    ? `border-gray-300 bg-white ${colorClass}`
                    : 'border-gray-200 bg-gray-100 text-gray-400 opacity-50'
                }`}
              >
                <Icon className="w-5 h-5" aria-hidden />
              </button>
            );
          })}
        </div>
      </div>

      {visiblePlaces.length < places.length && (
        <p className="text-[11px] font-bold text-gray-500 mb-2">
          Mostrando {visiblePlaces.length} de {places.length} na tabela (ícones desligados ocultam quem tem aquele canal).
        </p>
      )}

      <MarkTotalsBar totals={markPinTotals} className="mb-4" />

      {sortedPlaces.length === 0 && (
        <p className="text-sm font-bold text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-4">
          Nenhuma linha com os ícones atuais: ligue de novo os canais que quiser incluir na tabela.
        </p>
      )}

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
