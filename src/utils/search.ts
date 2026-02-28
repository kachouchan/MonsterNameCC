import Papa from 'papaparse';
import Fuse from 'fuse.js';

export interface DictItem {
    id: string;
    name: string;
    skill: string;
    leaderSkill: string;
}

export interface SearchPart {
    text: string;           // DBに登録されているオリジナル文字列（スキル名など）
    type: string;           // モンスター名、スキル、リーダースキル
    monsterName: string;    // 表示用モンスター名
    normText: string;       // 検索用正規化文字列
}

export interface MatchResult {
    part: string;           // ユーザー入力から切り出した文字列
    sources: SearchPart[];  // マッチしたソース元リスト
    isNotFound?: boolean;   // 該当なしフラグ
}

export class SearchEngine {
    private dictionary: DictItem[] = [];
    private allParts: SearchPart[] = [];
    private fuse: Fuse<SearchPart> | null = null;
    public maxItemLen: number = 0;

    constructor() { }

    public async loadCsv(csvUrl: string) {
        try {
            const response = await fetch(csvUrl);
            const csvText = await response.text();

            const parsed = Papa.parse(csvText, {
                header: false,
                skipEmptyLines: true,
            });

            this.dictionary = parsed.data.map((row: any) => ({
                id: row[0] || '',
                name: row[1] || '',
                skill: row[2] === '無し' ? '' : (row[2] || ''),
                leaderSkill: row[3] === '無し' ? '' : (row[3] || ''),
            }));

            this.buildIndexes();
        } catch (err) {
            console.error('Failed to load CSV:', err);
        }
    }

    // 全角英数を半角に、大文字を小文字に統一（ひらがなとカタカナは区別したままにする）
    private normalize(str: string): string {
        if (!str) return '';
        let norm = str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, match => String.fromCharCode(match.charCodeAt(0) - 0xFEE0));
        return norm.toLowerCase();
    }

    private buildIndexes() {
        this.allParts = [];
        this.maxItemLen = 0;

        for (const item of this.dictionary) {
            if (item.name) this.addPart(item.name, item.name, 'モンスター名');
            if (item.skill) this.addPart(item.skill, item.name, 'スキル');
            if (item.leaderSkill) this.addPart(item.leaderSkill, item.name, 'リーダースキル');
        }

        // Fuse for fuzzy search fallback
        this.fuse = new Fuse(this.allParts, {
            keys: ['normText'],
            threshold: 0.4,
            distance: 100,
            includeScore: true,
        });
    }

    private addPart(text: string, monsterName: string, type: string) {
        const normText = this.normalize(text);
        if (!normText) return;

        if (normText.length > this.maxItemLen) {
            this.maxItemLen = normText.length;
        }

        this.allParts.push({
            text,
            type,
            monsterName,
            normText
        });
    }

    /**
     * 最長一致原則（貪欲法）による部分文字列の再帰的分割
     * @param filterType 検索対象を絞り込む場合（'モンスター名' 等）に指定
     */
    public searchLongestMatch(keyword: string, filterType?: string): MatchResult[] {
        const results: MatchResult[] = [];
        let remaining = keyword;

        while (remaining.length > 0) {
            let foundMatch = false;
            const startLen = Math.min(remaining.length, this.maxItemLen > 0 ? this.maxItemLen : remaining.length);

            // 最長一致から順に試行
            for (let len = startLen; len >= 1; len--) {
                const subStr = remaining.substring(0, len);
                const normSubStr = this.normalize(subStr);
                const hits: SearchPart[] = [];

                // 完全一致（部分一致）検索: インデックス内の正規化テキストが normSubStr を含むか
                for (const part of this.allParts) {
                    // タイプ絞り込みがある場合はそれに従う
                    if (filterType && part.type !== filterType) continue;

                    if (part.normText.includes(normSubStr)) {
                        // 重複排除（同じモンスター名の同じタイプは無視等簡易処理可）
                        if (!hits.some(h => h.monsterName === part.monsterName && h.text === part.text && h.type === part.type)) {
                            hits.push(part);
                        }
                        if (hits.length >= 10) break; // 最大10件まで
                    }
                }

                if (hits.length > 0) {
                    results.push({
                        part: subStr,
                        sources: hits
                    });
                    remaining = remaining.substring(len);
                    foundMatch = true;
                    break;
                }
            }

            // 該当なし（1文字も一致しない）
            if (!foundMatch) {
                // Fuse.jsを使ったあいまい検索でのフォールバックも検討可能だが
                // 基本は1文字を「該当なし」として進む
                const notFoundChar = remaining.substring(0, 1);

                // オプション処理：あいまい検索で候補を探す（1文字の場合はノイズが多いので2文字以上推奨）
                // 今回は単純化して該当なしとする
                results.push({
                    part: notFoundChar,
                    sources: [],
                    isNotFound: true
                });

                remaining = remaining.substring(1);
            }
        }

        return results;
    }

    /**
     * 単語単位であいまい検索を行う補助メソッド
     */
    public searchFuzzy(query: string, filterType?: string): SearchPart[] {
        if (!this.fuse) return [];
        const normQuery = this.normalize(query);
        let results = this.fuse.search(normQuery, { limit: (filterType ? 30 : 10) }); // フィルタ用に少し多めに取得

        let items = results.map(r => r.item);
        if (filterType) {
            items = items.filter(item => item.type === filterType);
        }
        return items.slice(0, 10);
    }
}
