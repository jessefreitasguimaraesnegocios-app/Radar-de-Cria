import React from 'react';
import { Search, MapPin, Navigation as NavigationIcon, List } from 'lucide-react';

interface FiltersProps {
  radius: number;
  onRadiusChange: (radius: number) => void;
  /** Geocodifica o texto do campo “Cidade” e centraliza o mapa (Enter ou botão). */
  onCitySearch: (query: string) => void;
  onKeywordSearch: (keyword: string) => void;
  onFilterChange: (filter: string) => void;
  activeFilter: string;
  /** Total após filtros (mapa + lista). */
  resultCount: number;
  loading: boolean;
  onScrollToList: () => void;
}

const Filters: React.FC<FiltersProps> = ({
  radius,
  onRadiusChange,
  onCitySearch,
  onFilterChange,
  activeFilter,
  onKeywordSearch,
  resultCount,
  loading,
  onScrollToList,
}) => {
  const [query, setQuery] = React.useState('');
  const [keyword, setKeyword] = React.useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onCitySearch(query);
    }
  };

  const handleKeywordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onKeywordSearch(keyword);
    }
  };

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* O que buscar */}
        <div className="lg:col-span-5 relative flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Segmento: barbearia, bar, restaurante, padaria…"
              className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all outline-none text-gray-700"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeywordKeyDown}
            />
          </div>
          <button
            onClick={() => onKeywordSearch(keyword)}
            className="bg-blue-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all active:scale-95"
          >
            Buscar
          </button>
        </div>

        {/* Onde buscar */}
        <div className="lg:col-span-4 relative flex gap-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cidade (ex: Belo Horizonte)"
              className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border-none focus:ring-2 focus:ring-blue-500 transition-all outline-none text-gray-700"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>
          <button
            type="button"
            onClick={() => onCitySearch(query)}
            className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-all active:scale-95 shadow-md shadow-blue-200"
            title="Buscar este local no mapa (geocodificar)"
          >
            <NavigationIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-sm font-medium text-gray-500 whitespace-nowrap">Raio:</span>
          <select
            value={radius}
            onChange={(e) => onRadiusChange(Number(e.target.value))}
            className="bg-gray-50 px-3 py-3 rounded-xl border-none focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-gray-700 w-full md:w-32"
          >
            <option value={1000}>1 km</option>
            <option value={5000}>5 km</option>
            <option value={10000}>10 km</option>
            <option value={20000}>20 km</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {['all', 'no_app', 'no_site', 'open', 'rating', 'app'].map((filter) => (
          <button
            key={filter}
            onClick={() => onFilterChange(filter)}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
              activeFilter === filter
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {filter === 'all' && 'Todos'}
            {filter === 'no_app' && 'Sem app (prospecção)'}
            {filter === 'no_site' && 'Sem site'}
            {filter === 'open' && 'Aberto agora'}
            {filter === 'rating' && 'Melhor avaliação'}
            {filter === 'app' && 'Já tem app'}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
        <div className="text-sm">
          {loading ? (
            <span className="font-bold text-gray-500">Buscando resultados…</span>
          ) : (
            <p className="text-gray-900">
              <span className="text-2xl font-black tabular-nums">{resultCount}</span>
              <span className="ml-2 font-bold text-gray-600">
                {resultCount === 1 ? 'resultado' : 'resultados'}
              </span>
              <span className="block text-xs font-medium text-gray-400 mt-0.5">
                Total com os filtros atuais (mapa e tabela abaixo)
              </span>
            </p>
          )}
        </div>
        {!loading && resultCount > 0 && (
          <button
            type="button"
            onClick={onScrollToList}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-black text-sm hover:bg-emerald-700 transition-all active:scale-95 shadow-md shadow-emerald-200 shrink-0"
          >
            <List className="w-4 h-4" />
            Ir para a lista
          </button>
        )}
      </div>
    </div>
  );
};

export default Filters;
