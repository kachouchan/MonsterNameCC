import { useState, useEffect, useRef } from 'react';
import { SearchEngine, type MatchResult, type SearchPart } from './utils/search';
import './index.css';

type FilterType = '' | 'モンスター名' | 'スキル' | 'リーダースキル';

// 一つの検索結果カードを表すコンポーネント
const ResultCard = ({ result }: { result: MatchResult }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // マッチしていない文字（該当なし）の場合は常に開く＆上位件数の制御が不要
  const isNotFound = result.isNotFound;
  const sources = result.sources || [];

  // 上位3件とそれ以降
  const previewCount = 3;
  const hasMore = sources.length > previewCount;
  const displayedSources = showAll ? sources : sources.slice(0, previewCount);

  return (
    <div className="result-card glass-panel" style={{ padding: isOpen ? '1.5rem' : '1rem 1.5rem' }}>
      <div className="result-header" onClick={() => setIsOpen(!isOpen)}>
        <span className="target-char">{result.part} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>({sources.length}件)</span></span>
        <span className={`expand-icon ${isOpen ? 'open' : ''}`}>▼</span>
      </div>

      {isOpen && (
        <div className="parts-list" style={{ marginTop: '1rem' }}>
          {!isNotFound ? (
            <>
              {displayedSources.map((source, sIdx) => (
                <div key={sIdx} className="part-item">
                  <span className="part-name">{source.monsterName}</span>
                  <span className="part-type">{source.type}</span>
                  <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginLeft: 'auto' }}>
                    「{source.text}」より
                  </span>
                </div>
              ))}

              {!showAll && hasMore && (
                <button
                  className="show-more-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAll(true);
                  }}
                >
                  残り {sources.length - previewCount} 件をすべて表示する
                </button>
              )}
            </>
          ) : (
            <div className="not-found">該当する文字を含むパーツが見つかりません</div>
          )}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('');
  const [limit, setLimit] = useState<number | 'all'>(25); // デフォルト25件
  const [results, setResults] = useState<MatchResult[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [fuzzyResults, setFuzzyResults] = useState<SearchPart[]>([]);
  const [showFuzzy, setShowFuzzy] = useState(false);

  const engineRef = useRef<SearchEngine>(new SearchEngine());

  useEffect(() => {
    // 辞書データを読み込む
    const loadData = async () => {
      await engineRef.current.loadCsv('/mons.csv');
      setIsLoaded(true);
    };
    loadData();
  }, []);

  const executeSearch = (searchQuery: string, type: FilterType, currentLimit: number | 'all') => {
    if (searchQuery.length > 0 && isLoaded) {
      const parts = engineRef.current.searchLongestMatch(searchQuery, type || undefined, currentLimit);
      setResults(parts);
      setShowFuzzy(false);
    } else {
      setResults([]);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    executeSearch(value, filterType, limit);
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
    setLimit(val);
    executeSearch(query, filterType, val);
  };

  const executeFuzzySearch = () => {
    if (!query) return;
    const fResults = engineRef.current.searchFuzzy(query, filterType || undefined, limit);
    setFuzzyResults(fResults);
    setShowFuzzy(true);
  };

  const handleFilterChange = (type: FilterType) => {
    setFilterType(type);
    executeSearch(query, type, limit);
  };

  return (
    <div className="app-container">
      <header>
        <h1>パズドラ「名前コラ」検索</h1>
        <p className="subtitle">理想のモンスター名を構成するパーツを見つけ出そう</p>
      </header>

      <main className="search-container glass-panel">
        <label htmlFor="search-input" className={`status-badge ${!isLoaded ? 'loading' : ''}`}>
          {isLoaded ? '🎯 辞書ロード完了 (約13000件)' : '⏳ 辞書データを読み込み中...'}
        </label>

        <div className="filter-tabs" style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
          {(['', 'モンスター名', 'スキル', 'リーダースキル'] as FilterType[]).map((type) => (
            <button
              key={type}
              onClick={() => handleFilterChange(type)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: filterType === type ? 'rgba(99, 102, 241, 0.2)' : 'rgba(0,0,0,0.2)',
                color: filterType === type ? '#fff' : 'var(--text-muted)',
                fontWeight: filterType === type ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {type === '' ? 'すべて' : type}
            </button>
          ))}
        </div>

        <div className="input-wrapper" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            id="search-input"
            type="text"
            className="search-input"
            placeholder="例：朝ランニングする神"
            value={query}
            onChange={handleSearch}
            disabled={!isLoaded}
            autoComplete="off"
            style={{ width: '100%', boxSizing: 'border-box' }}
          />
          <select
            className="search-input"
            style={{ width: '100%', padding: '0.75rem 1rem', appearance: 'auto', background: 'rgba(0, 0, 0, 0.2)', boxSizing: 'border-box', fontSize: '1rem' }}
            value={limit}
            onChange={handleLimitChange}
            disabled={!isLoaded}
          >
            <option value={5}>上位 5件まで表示</option>
            <option value={10}>上位 10件まで表示</option>
            <option value={25}>上位 25件まで表示</option>
            <option value={50}>上位 50件まで表示</option>
            <option value="all">すべて探す</option>
          </select>
        </div>
        {query.length > 0 && (
          <button
            onClick={executeFuzzySearch}
            style={{
              marginTop: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'rgba(236, 72, 153, 0.2)',
              color: '#f472b6',
              border: '1px solid rgba(236, 72, 153, 0.4)',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            候補を広げる（まるごとあいまい検索）
          </button>
        )}
      </main>

      {query && !showFuzzy && (
        <section className="results-container">
          {results.length > 0 ? (
            results.map((result, idx) => (
              <ResultCard key={idx} result={result} />
            ))
          ) : (
            <div className="empty-state">
              検索中...
            </div>
          )}
        </section>
      )}

      {query && showFuzzy && (
        <section className="results-container">
          <h3 style={{ marginLeft: '0.5rem', color: '#f472b6' }}>「{query}」のあいまい検索結果</h3>
          <div className="result-card glass-panel">
            <div className="parts-list">
              {fuzzyResults.length > 0 ? (
                fuzzyResults.map((source, sIdx) => (
                  <div key={sIdx} className="part-item">
                    <span className="part-name">{source.monsterName}</span>
                    <span className="part-type">{source.type}</span>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginLeft: 'auto' }}>
                      「{source.text}」
                    </span>
                  </div>
                ))
              ) : (
                <div className="not-found">あいまい検索でも見つかりませんでした</div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
