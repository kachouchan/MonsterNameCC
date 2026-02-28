import { useState, useEffect, useRef } from 'react';
import { SearchEngine, type MatchResult, type SearchPart } from './utils/search';
import './index.css';

type FilterType = '' | 'モンスター名' | 'スキル' | 'リーダースキル';

function App() {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('');
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

  const executeSearch = (searchQuery: string, type: FilterType) => {
    if (searchQuery.length > 0 && isLoaded) {
      const parts = engineRef.current.searchLongestMatch(searchQuery, type || undefined);
      setResults(parts);
      setShowFuzzy(false);
    } else {
      setResults([]);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    executeSearch(value, filterType);
  };

  const executeFuzzySearch = () => {
    if (!query) return;
    const fResults = engineRef.current.searchFuzzy(query, filterType || undefined);
    setFuzzyResults(fResults);
    setShowFuzzy(true);
  };

  const handleFilterChange = (type: FilterType) => {
    setFilterType(type);
    executeSearch(query, type);
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

        <div className="input-wrapper" style={{ marginTop: '1rem' }}>
          <input
            id="search-input"
            type="text"
            className="search-input"
            placeholder="例：朝ランニングする神"
            value={query}
            onChange={handleSearch}
            disabled={!isLoaded}
            autoComplete="off"
          />
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
              <div key={idx} className="result-card glass-panel">
                <div className="result-header">
                  <span className="target-char">{result.part}</span>
                </div>
                <div className="parts-list">
                  {!result.isNotFound ? (
                    result.sources.map((source, sIdx) => (
                      <div key={sIdx} className="part-item">
                        <span className="part-name">{source.monsterName}</span>
                        <span className="part-type">{source.type}</span>
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginLeft: 'auto' }}>
                          「{source.text}」より
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="not-found">該当する文字を含むパーツが見つかりません</div>
                  )}
                </div>
              </div>
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

export default App;
