export class Indexer {
	
	static {
		
		this.indexed = Symbol('Indexer.indexed'),
		this.indices = Symbol('Indexer.indices'),
		this.lastIndices = Symbol('Indexer.lastIndices');
		
	}
	
	constructor() {
		
		this.cache = {};
		
	}
	clearCache() {
		
		const cache = this.cache;
		let k;
		
		for (k in cache) delete cache[k];
		
	}
	// キャッシュされる値は matchAll の戻り値である配列内の要素をそのまま使う。
	// すべての要素にはプロパティ input があり、これは一致検索の文字列全体を示す。
	// つまり各要素の input は重複しており、仮にその文字列が非常に巨大だった場合、リソースに負荷を与えることが予想される。
	// このプロパティ input は、現状では（多分）使用していないため、削除するか、別に一元化してプロパティとして保存しても恐らく問題はないと思われる。
	// ただし、単純に削除した場合、出力から入力を復元することができなくなる点に留意が必要。
	setCache(matched, handler) {
		
		const cache = this.cache, input = matched[0]?.input, { indexed, indices, lastIndices } = Indexer;
		
		if (!(input in cache)) {
			
			const	v = (cache[input] = matched)[indexed] = [], l = matched.length, handles = typeof handler === 'function';
			let i,i0, m;
			
			i = i0 = -1;
			while (++i < l)	(m = matched[i]).captor = this,
									(!handles || handler(m, i,l)) &&
										((v[++i0] = m)[lastIndices] = (m[indices] = m.index) + m[0].length);
			
		}
		
		return cache[input];
		
	}
	getCache(str) {
		return this.cache?.[str];
	}
	
}
export class Unit extends Indexer {
	
	// https://qiita.com/HMMNRST/items/4b10dfb621a469034257#-%E5%90%A6%E5%AE%9A%E5%85%88%E8%AA%AD%E3%81%BF
	static unit = /(?!)/g;
	static flags = 'g';
	static escapeRegExpPattern(pattern) {
		// https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
		return pattern.replace(/[.*+?^=!:${}()|[\]\/\\]/g, '\\$&');
		
	}
	static createRegExpG(rx = Unit.unit, flags = Unit.flags) {
		
		rx instanceof RegExp || (
			(rx && typeof rx === 'object') ||
				(rx = { pattern: Unit.escapeRegExpPattern(''+(rx || '')), unescapes: true, flags }),
			typeof (flags = 'flags' in rx ? rx.flags : flags) === 'string' ?
				flags.indexOf('g') === -1 && (flags += 'g') : (flags = 'g'),
			rx = new RegExp(rx?.unescapes ? rx.pattern : Unit.escapeRegExpPattern(rx.pattern), flags)
		);
		
		if (!rx.global) throw new TypeError('RegExp must be global.');
		
		return rx;
		
	}
	
	constructor(unit, flags) {
		
		super(),
		
		this.setUnit(unit, flags);
		
	}
	setUnit(unit, flags) {
		
		const last = this.unit;
		
		unit = unit instanceof Unit ? unit.unit : Unit.createRegExpG(unit, flags),
		(last instanceof RegExp && last.flags === unit.flags && last.source === unit.source) || this.clearCache();
		
		return this.unit = unit;
		
	}
	
}

export class Sequence extends Unit {
	
	static repetition = 2;
	static cacheHandler(match) {
		return !('sequence' in match);
	}
	
	constructor(unit, flags, repetition) {
		
		super(unit, flags),
		
		this.setRepetition((unit && typeof unit === 'object' && unit?.repetition) || repetition);
		
	}
	
	setRepetition(repetition = Sequence.repetition) {
		
		const last = this.repetition;
		
		(this.repetition = Number.isNaN(repetition = parseInt(repetition)) ? Sequence.repetition : repetition) === last ||
			this.clearCache();
		
		return this.repetition;
		
	}
	
	// 第一引数 str に与えられた文字列の中から、this.seq が示す正規表現に一致する文字列の位置情報を列挙した配列を返す。
	// str と seq との一致判定処理は String.prototype.matchAll によって行なわれる。
	// this.repetition に有効な値が設定されている場合、一致した文字列が連続して連なっていると、それらの位置情報を結合する。
	// その際、結合した位置情報に、連なり内の一致文字列の連続回数を整数値で示すプロパティ sequence が設定される。
	// 既定ではこの連なりの位置情報は戻り値には含まれない。
	// この情報を戻り値に含ませる場合、第二引数 includesRepetition に真を示す値を指定する。
	index(str, includesRepetition) {
		
		if (str in this.cache) return this.cache[str];
		
		const matched = [ ...str.matchAll(this.unit) ], l = matched.length;
		
		if (!l) return this.setCache(matched);
		
		const indices = [], repetition = this.repetition;
		let i,i0,l0,i1,l1,i2,l2, m,m0,mi, ii, times,outOfRepetition,cnt;
		
		i = ii = -1;
		while (++i < l) {
			
			i0 = i;
			while (++i0 < l && (m = matched[i0 - 1]).index + m[0].length === matched[i0].index);
			
			if ((times = i0 - i) < repetition) {
				
				// 一致した文字列の連なりが規定の繰り返し回数以下の時。
				// それらの一致はすべて個別の一致として記録される。
				
				--i;
				while (++i < i0) indices[++ii] = matched[i];
				
			} else {
				
				// 一致した文字列の連なりが規定の繰り返し回数を満たす時。
				// 繰り返しは左方から順に数えられ、連なりの終端までに繰り返しに端数が出た場合、それらは連なり外の個別の一致として記録される。
				
				outOfRepetition = i + times - (cnt = repetition * parseInt(times / repetition));
				
				if (includesRepetition) {
					
					i1 = i - 1, l1 = i0 - outOfRepetition;
					while (++i1 < l1) {
						
						if ((i1 - outOfRepetition) % cnt)
							(indices[++ii] = (m = matched[i1])).sequence = repetition, mi = m.length;
						else {
							
							m[0] += (m0 = matched[i1])[0];
							
							if (l2 = m0.length) {
								i2 = 0;
								while (++i2 < l2) m[++mi] = m0[i2];
							}
							
						}
						
					}
					
				}
				
				i1 = i0 - outOfRepetition - 1;
				while (++i1 < i0) indices[++ii] = matched[i1];
				
			}
			
			i = --i0;
			
		}
		
		return this.setCache(indices, Sequence.cacheHandler);
		
	}
	replace(str, replacer = '') {
		
		const matched = this.index(str, true).matched, l = matched.length, u = this.unit;
		let i,m,lm, replaced;
		
		i = -1, replaced = '';
		while (++i < l) replaced += str.substring(lm ? lm.index + lm[0].length : 0, (m = matched[i]).index) +
			('sequence' in (lm = m) ? m[0].substring(0, m[0].length / m.sequence) : m[0].replaceAll(u, replacer));
		
		return replaced += lm ? str.substring(lm.index + lm[0].length) : str;
		
	}
	
}

// 実際にそれに置き換えられるか、置き換える意義があるのかはともかくとして、
// 特定のメソッドが Symbol の静的プロパティに置き換えられるかは、安定性や保守性の向上、コードの短絡化の観点から検討する価値があると思われる。
// https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Symbol#static_properties
export class Chr extends Unit {
	
	static unit = '#';
	
	// 既定では、このオブジェクトを通じて文字列の一致判定をした時、
	// 指定した正規表現が空文字との一致を示しても、
	// 他の判定に非空文字を含んでいれば一致から空文字を除去する。（一方、空文字しか存在しない場合、それをそのまま返す）
	// matchesEmpty に真を示す値を指定するとこの挙動が変わり、空文字を含む一致した箇所をすべてそのまま返す。
	// これらは特定の状況を想定した仕様だが、現在そうした状況に対応しないように方針を変えたためこの引数を使う処理は存在しない。
	// また空文字と一致する正規表現は、文字列の長さに比例して肥大した戻り値を作成するため、パフォーマンス的に冗長に思われる。
	constructor(unit = Chr.unit, seq, matchesEmpty) {
		
		super(unit),
		
		this.init(undefined, seq, matchesEmpty);
		
	}
	
	init(unit = this.unit || Chr.unit, seq = this.seq, matchesEmpty) {
		
		this.matchesEmpty = matchesEmpty,
		unit === this.unit || (unit = this.setUnit(unit)),
		seq === this.seq || (seq = this.setSeq(seq));
		
		if (this.unit.source === this.seq?.source) throw new Error('The srouce of "unit" and "seq" must be different.');
		
		return this;
		
	}
	setSeq(seq, flags, repetition) {
		
		return this.seq = seq ? seq instanceof Sequence ? seq : new Sequence(seq, flags, repetition) : null;
		
	}
	
	index(str) {
		
		if (str in this.cache) return this.cache[str];
		
		const	matched = [ ...str.matchAll(this.matchesEmpty ? this.unit : this) ],
				seqLastIndices = this.seq?.index?.(str, true).lastIndices,
				handler = seqLastIndices && (m => seqLastIndices.indexOf(m.index) === -1);
		
		return this.setCache(matched, handler);
		
	}
	
	test(str, ...masks) {
		
		const indexed = this.index(str)[Indexer.indexed], l = indexed?.length, l0 = masks.length;
		
		if (!l0) return !!l;
		
		let i,i0,i1,l1,idx,len,mask,m;
		
		i = -1;
		while (++i < l) {
			
			i0 = -1, len = (idx = indexed[i].index) + indexed[i][0].length;
			while (++i0 < l0) {
				
				i1 = -1, l1 = (mask = masks[i0]).length;
				while (++i1 < l1 && ((m = mask[i1]).lo < len && idx < m.ro));
				if (i1 < l1) return true;
				
			}
			
		}
		
		return false;
		
		
		
	}
	// 第一引数 str でこのインスタンスのメソッド match を実行した結果から、
	// 第二引数 masks に指定された任意の数の文字列範囲を示す位置情報の外側にあるもののみを絞り込んだ結果を含んだ Object を返す。
	// 絞り込んだ結果は matched、そして maskIndices の内側にあると判定された文字の位置情報は masked に配列の要素として示される。
	// 第二引数に指定する値は、Brackets のメソッド locate の戻り値か、それに準じたものであることが求められる。
	// これはプログラミングにおける文字列の判定を想定していて、masks の中にあるこのインスタンスの文字列は、
	// それ自体は意味を持たない別の文字列として除外することを目的としている。
	// 例えば str が "a{a}" で、このインスタンスの文字列が a、masks が { } の位置を示す時、
	// このインスタンスの文字列位置として記録されるのは、一文字目の a だけになる。
	// コード上では new Chr('a').mask('a{a}', [ { li: 2, r: 3 } ]); と指定する。（ここでは masks の指定は必要最低限）
	// 戻り値は { ..., masked: [ 2 ], unmasked: [ 0 ] } である。（上記の例で言えば、文字列としての a の位置は masked に記録されている）
	mask(str, ...masks) {
		
		const	data = { matched: this.index(str), masked: [] },
				matched = data.matched,
				unmasked = data.unmasked = [ ...matched[Indexer.indexed] ],
				l = unmasked.length,
				l0 = masks.length;
		
		let i,umi;
		
		if (!(umi = l) || !l0) return data;
		
		const masked = data.masked;
		let i0,i1,l1,um,idx,len,mi,mask;
		
		i = mi = -1;
		while (++i < umi) {
			
			i0 = -1, len = (idx = (um = unmasked[i]).index) + um[0].length;
			while (++i0 < l0) {
				
				i1 = -1, l1 = (mask = masks[i0]).length;
				while (++i1 < l1 && (len <= mask[i1].lo || mask[i1].ro <= idx));
				
				if (i1 === l1) continue;
				
				masked[++mi] = um, unmasked.splice(i--, 1), --umi;
				break;
				
			}
			
		}
		
		return data;
		
	}
	split(str, ...masks) {
		
		const separators = this.mask(...arguments).unmasked, l = separators.length, splitted = [];
		let i,i0, cursor,idx,separator;
		
		i = i0 = -1, cursor = 0;
		while (++i < l)	splitted[++i0] = str.substring(cursor, idx = (separator = separators[i]).index),
								cursor = idx + separator[0].length;
		splitted[++i0] = str.substring(cursor);
		
		return splitted;
		
	}
	replace(str, replacer, ...masks) {
		
		return this.split(str, ...masks).join(replacer);
		
	}
	
	clone() {
		
		const { unit, seq, matchesEmpty } = this;
		
		return new Chr(
				{ pattern: unit.source, flags: unit.flags, unescapes: true },
				{ pattern: seq.source, flags: seq.flags, repetition: seq.repetition, unescapes: true },
				matchesEmpty
			);
		
	}
	equals(chr) {
		
		if (!(chr instanceof Chr)) return false;
		
		const u = this.unit, u0 = chr.unit, s = this.seq?.unit, s0 = chr.seq?.unit;
		
		return u.source === u0.source && u.flags === u0.flags &&
			s?.source === s0?.source && s?.flags === s0?.flags && s?.repetition === s0?.repetition;
	}
	
	// このオブジェクトのインスタンを String.prototype.matchAll の第一引数に与えた時にこのメソッドが実行される。
	// 一致語句に空文字を含む場合、一致語句すべてが空文字であればそれらを、そうでなければ一致語句の中のすべての空文字を省き、
	// いずれの場合もイテレーターではなく Array にして返す。
	[Symbol.matchAll](str) {
		
		const matched = [ ...RegExp.prototype[Symbol.matchAll].call(this.unit, str) ];
		
		if (!matched) return matched;
		
		const l = matched.length, v = [];
		let i, vi;
		
		i = vi = -1;
		while(++i < l) matched[i][0] && (v[++vi] = matched[i]);
		
		return vi === -1 ? matched : v;
		
	}
	
}

// Array を継承し、自身の要素として設定された任意の数の Chr を通じて、文字列の位置の特定に関する処理を行なうメソッドを提供する。
export class Term extends Array {
	
	static escSeq = '\\';
	static sortLocs(a, b) {
		return a?.[0]?.lo === null ? -1 : b?.[0]?.lo === null ? 1 : a?.[0]?.lo - b?.[0]?.lo;
	}
	static sortLoc(a, b) {
		return a.lo === null ? -1 : b.lo === null ? 1 : a.lo - b.lo ||
			('outer' in a ? a.outer.length - b.outer.length : a.$.length - b.$.length) || 1;
	}
	// 第一引数 str の中から、第二引数 l と第三引数 r の間にある文字列を特定し、その位置など、それに関する情報を返す。
	// Term.prototype.locate の戻り値を任意の数だけ第四引数 masks 以降に指定すると、
	// l ないし r の位置が masks が示す位置範囲に一致する時は、その l,r の情報を戻り値に含めない。
	static get(str, l, r, ...masks) {
		
		l || (l = r, r = null),
		
		typeof l === 'string' && (l = new Chr(l, Term.escSeq)),
		r && typeof r === 'string' && (r = new Chr(r, Term.escSeq));
		
		const lI = l.mask(str, ...masks).unmasked, lL = lI.length, locales = [];
		
		if (!lL) return locales;
		
		const	equals = r && l.equals(r), rI = equals ? lI : (r || l).mask(str, ...masks).unmasked, rL = rI.length;
		// 最長一致にするために、rI の値を reverse() して設定するように変更したが、影響不明。
		//const	equals = r && l.equals(r), rI = equals ? lI : (r || l).mask(str, ...masks).unmasked.reverse(), rL = rI.length;
		
		if (!rL) return locales;
		
		const rShift = equals ? 2 : 1, localedL = [];
		let i,i0,mi,lxi, L,LI, R,RI, locale;
		
		i = mi = -1;
		while ((i += rShift) < rL) {
			RI = (R = rI[i]).index + (r ? 0 : R[0].length);
			i0 = lL;
			while (--i0 > -1 && (((L = lI[i0]).index + L[0].length > RI) || localedL.indexOf(i0) !== -1));
			if (i0 > -1) {
				localedL[++mi] = i0,
				// *o は、一致文字列の一致開始位置、*i は一致終了位置。例えば str.substring(*.*o, *.*i) で一致部分を抜き出せる。
				// ls は、r の左側にあるすべての l の一致情報。この関数が判定する一致は基本的に最短一致だが、
				// このプロパティが示す情報を材料に最長一致を組むことができるかもしれない。
				locale = locales[mi] = { l: L, lo: L.index, li: L.index + L[0].length, ls: lI.slice(0, i0 + 1), r: r ? R : R.index, ri: RI, ro: r ? RI + R[0].length : RI },
				locale.inner = str.substring(locale.li, locale.ri),
				locale.outer = str.substring(locale.lo, locale.ro);
			}
		}
		
		return locales;
		
	}
	// 第一引数 str を、任意の数指定された第二引数以降の値に基づき配列化する。
	// 各 data の示す位置の範囲内にある文字列は、その位置情報と内容を示す Object になり、範囲外はそのまま文字列として列挙される。
	// 第二引数以降には Term.prototype.locate の戻り値のプロパティ completed に相当する値を指定する。
	static plot(str, ...data) {
		
		if (!(str += '')) return [ str ];
		
		const dl = data.length;
		
		if (!dl) return [ str ];
		
		const locs = data.flat(1), li = locs.length;
		let i,i0,l0, datum;
		
		if (!li) return [ str ];
		
		const sl = str.length - 1, result = [], { max, min } = Math;
		let loc,sub,cursor;
		
		i = i0 = -1, cursor = 0, locs.sort(Term.sortLoc);
		
		//while (++i < li) {
		//	cursor < (loc = locs[i]).lo &&
		//		(sub = str.substring(cursor, max((loc = locs[i]).lo, 0))) && (result[++i0] = sub);
		//	if (min(cursor = (result[++i0] = loc).ro, sl) === sl) break;
		//}
		//cursor <= sl && (result[++i0] = str.substring(cursor));
		
		// 何か問題が起きた時はここが原因の可能性が高いが、処理内容がややこしく解読には困難を伴う。
		// 現状の処理は上記のコメント内の処理を適切な出力が行なえるように修正したものだが、
		// 対処療法的で理解を伴っておらず、問題の再発および別の問題の発生の可能性は高い。
		while (++i < li) {
			cursor <= (loc = locs[i]).lo && (
				(sub = str.substring(cursor, max((loc = locs[i]).lo, 0))) && (result[++i0] = sub),
				cursor = (result[++i0] = loc).ro
			);
			if (min(loc.ro, str.length) === str.length) break;
		}
		
		cursor <= sl && (result[++i0] = str.substring(cursor));
		
		return result;
		
	}
	// 第一引数 locales に指定された文字列の位置情報を階層化する。
	// 位置情報は Term.prototype.locate の戻り値のプロパティ completed 相当でなければならない。
	// 階層化、つまり位置情報がネストする際、第二引数 callback に関数が指定されていればそれを実行する。
	// 関数には引数として位置情報、その位置情報が列挙されている配列内の番号、配列の長さ、そして第三引数以降に与えられた args が与えられる。
	// 関数の戻り値が真を示す場合、その位置情報は下位のものも含め、戻り値に含まれない。
	static nest(locales, callback, ...args) {
		
		const	locs = [ ...locales ], l = locs.length, data = [], nested = [],
				hasCallback = typeof callback === 'function',
				nest = Term.nest;
		let i,i0,di,ni, loc, datum, cancels;
		
		i = di = -1, locs.sort(Term.sortLocs);
		while (++i < l) {
			
			i0 = i, ni = -1, datum = { ...(loc = locs[i]) },
			cancels = hasCallback && callback(loc, i,l, locs, ...args);
			while (++i0 < l && locs[i0].ri < loc.ri) nested[++ni] = locs[i0];
			
			cancels || (data[++di] = datum, ni === -1 || (datum.nested = nest(nested))),
			ni === -1 || (nested.length = 0), i = i0 - 1;
			
		}
		
		return data;
		
	}
	
	constructor(...chrs) {
		
		const hasEsc = Array.isArray(chrs[0]), defaultEscSeq = hasEsc ? chrs[1] : undefined;
		
		super(...(hasEsc ? chrs[0] : chrs)),
		
		this.setDefaultEscSeq(defaultEscSeq);
		
	}
	
	setDefaultEscSeq(seq = Term.escSeq) {
		
		this.escSeq = seq;
		
	}
	// 第二引数が存在しない時、第一引数はインスタンスのインデックスとしてその位置の要素を返す。
	// 位置が整数でない場合は、末尾の要素を返す。負の値の場合、末尾からその値分だけ遡った位置の要素を返す。
	// 要素が Chr でない場合、要素値を引数として新しい Chr を作成し、該当要素もその Chr に置き換える。
	// 第二引数が存在する時、第一引数が整数でなければ、その値が Chr であればそれを、でなければその値を引数として新しい Chr を作成し、
	// 第二引数に指定された値に基づいたインスタンスの該当する位置にその Chr を割り当てた上で、戻り値にして返す。
	// 第一引数が整数の場合、該当する位置の要素を返すが、それが偽を示す場合、第二引数に指定された値を Chr として返し、
	// またその値を指定された位置の要素に置き換える。いずれの場合も、値が有効かつ Chr でなければ、その値を引数として新しい Chr を作成する。
	// 第三引数は常に Chr として指定されるべき引数が無効だった時のフォールバックとして（仮にそれが引数として無効な値でも）使われる。
	// 平たく言えば、第一引数のみを指定した時は getter、第一引数に整数以外の任意の値を指定した時は setter として機能する。
	chr(a0, a1, fallback) {
		
		const gets = arguments[1] === undefined,
				idx = Number.isInteger(a1 = gets ? a0 : a1) ? a1 > -1 ? a1 : this.length + a1 : this.length - 1;
		
		return gets ?	(a0 = this[idx] || a1 || fallback) instanceof Chr ? a0 : (this[idx] = new Chr(a0, this.escSeq)) :
							(this[idx] = (a0 ||= fallback) instanceof Chr ? a0 : new Chr(a0, this.escSeq));
		
	}
	
	// 第一引数に指定された str の中から、すべての要素の一致を判定し、
	// 第二引数以降に与えられた masks により、それらの範囲内外で一致部分を区分けた情報を配列に列挙して返す。
	// 恐らく不要なメソッド。
	// Term.get 内部で同等の処理を個別に行なっている。
	// このメソッドを事前に使えば重複する処理を回避できるかもしれないが、Term.get の汎用性が失われる恐れがある。
	mask(str, ...masks) {
		
		const	l = this.length, data = [];
		let i,di, chr;
		
		i = di = -1;
		while (++i < l) (chr = this.chr(i)) && (data[++di] = chr.mask(str, ...masks));
		
		return data;
		
	}
	
	// 第一引数 str に与えられた文字列から、このオブジェクトのインスタンスの要素が示す Chr に一致する部分を特定し
	// その各種情報を Object にして返す。
	// Object には以下のプロパティがある。
	// 	completed
	// 		str 内で、すべての要素が連続して一致した部分の位置情報を示す Object を列挙する配列。
	// 	incomplete
	// 		str 内で、一部の要素が連続して一致した位置情報を列挙する配列。
	// 	locale
	// 		対応するすべての位置情報をシリアライズして列挙した各種配列をプロパティに持つ。この情報を使うケースはもしかしたらないかもしれない。
	// 		collection
	// 			全一致か部分一致かを問わず、一致したすべての位置情報をシリアライズして列挙した配列。
	// 		completed
	// 			全一致した位置情報をシリアライズして列挙した配列。
	// 		incomplete
	// 			部分一致した位置情報をしりあらいずして列挙した配列。
	// 個々の位置情報を表す Object には String.prototype.matchAll が返す値と、さらにいくつかの独自のプロパティを持つ。
	locate(str, ...masks) {
		
		const	l = this.length,
				many = l > 1,
				//LocalesEndIndex = l / 2|0,
				LocalesEndIndex = l - +(l > 1) - +(l > 0),
				//LocalesEndIndex = l * 2 - 1,
				{ get, sortLoc } = Term,
				result = { completed: [], incomplete: [], locale: { completed: [], incomplete: [] } },
				{ completed, incomplete } = result,
				rLocs = result.locale,
				cLocs = rLocs.completed,
				icLocs = rLocs.incomplete;
		let	i,i0,l0,l1, li,ci, cli,icli, ll, locs,loc,loc0, prev,last,
				currentChr, locales,inners,outers,splitted, term;
		
		ll = -1, locs = [];
		
		if (i = l) {
			
			l0 = many ? 0 : -1;
			while (--i > l0) {
				l1 = (loc = get(str, i ? (prev = this.chr(i - 1)) : undefined, last || this.chr(i), ...masks)).length,
				i0 = -1, last = prev;
				while (++i0 < l1) locs[++ll] = loc[i0];
			}
			rLocs.collection = [ ...locs.sort(Term.sortLoc) ];
			
		}
		
		i = cli = icli = -1, ci = -1, ++ll, li = 0;
		while (++i < ll) {
			
			// i の値で分岐させていたが、要素が 3 以上の時に正確な値を返さないため、それを修正するために li に変更。
			// これまで正確な値を返していた時の入力でも変化がないか未検証。
			if (!li) {
				
				last = ((locales = [ loc0 = locs.splice(i, 1)[0] ])[li]).ri,
				inners = [ loc0.inner ],
				splitted = many ? [ loc0.l, loc0.inner, loc0.r ] : [ loc0.l ],
				outers = [ loc0.outer ],
				term = {
					locales,
					inners,
					outers,
					splitted,
					lo: loc0.lo,
					li: loc0.li,
					ri: loc0.ri,
					ro: loc0.ro,
					$: loc0.outer,
					captor: this
				},
				currentChr = this[ci = this.indexOf(loc0.r.captor)],
				--ll;
				
				if (l < 3) {
					
					completed[++cli] = term, cLocs.push(...locales), --i;
					continue;
					
				} else if (i === ll) {
					
					incomplete[++icli] = term, icLocs.push(...locales);
					break;
					
				}
				
			}
			
			if (!(loc = locs[i]) || currentChr !== loc.l.captor || last !== loc.lo) {
				
				i === ll - 1 && (
						incomplete[++icli] = term,
						icLocs.push(...locales),
						term.ri = loc.ri,
						term.ro = loc.ro,
						term.$ += loc.inner + loc.r[0],
						i = -1, li = 0
					);
				
				continue;
				
			}
			
			last = (locales[++li] = loc0 = locs.splice(i--, 1)[0]).ri,
			inners[li] = splitted[splitted.length] = loc0.inner,
			splitted[splitted.length] = loc0.r,
			outers[li] = loc0.outer,
			term.ri = loc0.ri,
			term.ro = loc0.ro,
			term.$ += loc0.inner + loc0.r[0],
			currentChr = this[++ci], --ll;
			
			if (li === LocalesEndIndex) {
				
				completed[++cli] = term, cLocs.push(...locales), i = -1, li = 0;
				
			} else if (ll && i === ll - 1) {
				
				incomplete[++icli] = term, icLocs.push(...locales), i = -1, li = 0;
				
			};
			
		}
		
		return result;
		
	}
	
}

// Array を継承し、Term を要素に持つ。
// 要素の Term が示す文字列の位置情報を特定するメソッド Terms.prototype.getMasks を提供する。
// 取得した位置情報は Term.plot などで使用する。
// Term は汎用性を意識しているが、Terms は ParseHelper のサブセット的な存在で、それ単体では意味をなさないプロパティやメソッドは多い。
export class Terms extends Array {
	
	static termIndex = Symbol('Terms.termIndex');
	static unmasks = Symbol('Terms.unmasks');
	static callback = Symbol('Terms.callback');
	static deletes = Symbol('Terms.deletes');
	static splices = Symbol('Terms.deletes');
	
	// 内部処理用の関数で、第二引数 source に与えられた配列の中から、第一引数 v に一致する要素の位置を再帰して取得する。
	// 戻り値は一致した v を列挙する配列で、その配列の、シンボル Terms.termIndex が示すプロパティに v の位置が指定される。
	static recursiveGet(v, source = this) {
		
		if (source.constructor !== Array) return;
		
		const index = source.indexOf(v);
		
		if (index !== -1) {
			(source = [ ...source ])[this.termIndex] = index;
			return source;
		}
		
		const l = source.length, recursiveGet = this.recursiveGet;
		let i, v0;
		
		i = -1;
		while (++i < l && !(v0 = recursiveGet(v, source[i])));
		
		return v0 && v0;
		
	}
	// 内部処理用の関数で、第一引数 callback に指定した値が適切な値であれば、
	// それを基にして Reflect.apply に指定する引数を順に列挙する配列を返す。
	//static normalizeTermCallback(callback) {
	//	
	//	typeof callback === 'function' && (callback = [ callback ]);
	//	
	//	return Array.isArray(callback) && typeof callback[0] === 'function' &&
	//		(callback.length > 1 && !Array.isArray(callback[2]) && (callback[2] = [ callback[2] ]), callback);
	//	
	//}
	
	//constructor(precedence, esc, defaultThis, replaceDescriptor) {
	constructor(configuration) {
		
		//this.super = [],
		//this.callback = new Map(),
		configuration?.constructor === Object ? (
				configuration?.terms?.constructor === Array ? super(...configuration.terms) : super(),
				configuration.precedence &&
					this.setByPrecedence(configuration.precedence, configuration.esc, configuration.defaultThis, configuration.replacer),
				this.replaceAll(configuration)
			) :
			super(...arguments);
		
	}
	
	// 第一引数 precedenceDescriptors が示す Term の記述子に基づいて、自身の要素に Term を設定する。
	// 記述子には以下のプロパティを設定する。
	// 	name *required
	// 		Term の名前で、この名前を引数にして、作成した Term を示すインスタンスのプロパティのための Symbol を作成する。
	// 		name の値は precedenceDescriptors 内で重複しない方が極めて好ましい。
	// 		文字列と Symbol を指定でき、文字列を指定した場合、その値を第一引数にして作成された Symbol に置き換えられる。
	// 	term *required
	// 		Term か、そののメンバーとなる値を配列に列挙して指定する。
	// 	callback
	// 		term が一致した時に実行されるコールバック関数とその実行条件を配列に列挙して指定する。
	// 		配列はそのまま Reflect.apply の引数として用いられる。関数単体で指定することもでき、その場合は関数はインスタンスを主体に実行される。
	// 	unmasks
	// 		真を示す値を指定した時、その Term は、各種一致検索で使われた時に、一致の判定を行ない、
	// 		その結果を後続の Term の一致判定に影響させるが、値そのものは戻り値に含めない。
	// 		例えば、このプロパティが真を示す値を持つ Term に、後続の Term との一致がすべて囲まれていた場合、戻り値にはいかなる一致情報も含まない。
	// 	esc
	// 		Term をエスケープする際の Sequence を指定する。未指定の場合、このメソッドの第二引数に指定された Sequence を使う。
	// 		このメソッドの第二引数と同じく、null を指定すると、エスケープできない Term を作成する。
	//
	// このメソッドは任意に設定する際の煩わしさを軽減するのが目的で、このメソッドを使わなくても同じ設定をすることは可能。
	setByPrecedence(precedenceDescriptors, esc, defaultThis = this, replacer, terms = this) {
		
		Array.isArray(precedenceDescriptors) || (precedenceDescriptors = [ precedenceDescriptors ]);
		
		const l = precedenceDescriptors.length;
		let i,ti,v, pd, term, callback, sym;
		
		i = -1, ti = this.length - 1,
		esc = esc instanceof Sequence ? esc : typeof esc === 'string' ? new Sequence(esc) : null,
		replacer || typeof replacer === 'object' || (replacer = undefined);
		while (++i < l) {
			
			if (!('name' in (pd = precedenceDescriptors[i]) && 'term' in pd)) continue;
			
			if (Array.isArray(pd)) {
				
				this[++ti] = this.setByPrecedence(pd, esc, defaultThis, replacer, []);
				
			} else if (pd && typeof pd === 'object') {
				
				term = this[++ti] = this[typeof pd.name === 'symbol' ? pd.name : Symbol(pd.name)] =
					(term = replacer && pd.name in replacer ? replacer[pd.name] : pd.term) instanceof Term ?
						term : new Term(term, 'esc' in pd ? pd.esc : esc),
				
				(callback = pd.callback) && (
						typeof callback === 'function' && (callback = [ callback ]),
						Array.isArray(callback) && typeof callback[0] === 'function' &&
							(term[Terms.callback] = callback[0].bind(callback?.[1] ?? defaultThis, ...callback.slice(2)))
					),
				pd.unmasks && (term[Terms.unmasks] = true);
				
			}
			
		}
		
		return terms;
		
	}
	
	// Terms の中から、第一引数 name に一致する値をプロパティ description に持つ Symbol を取得する。
	// name に一致する Symbol が複数ある場合、一番最初に一致した Symbol を返す。一致が見つからなかった場合 null を返す。
	symOf(name) {
		
		const syms = Object.getOwnPropertySymbols(this), l = syms.length;
		let i;
		
		i = -1;
		while (++i < l && syms[i].description !== name);
		
		return i === l ? null : syms[i];
		
	}
	// symOf と同じだが、name に一致したすべての Symbol を配列に列挙して返すのと、一致が見つからなかった場合、空の配列を返す点が異なる。
	symsOf(name) {
		
		const syms = Object.getOwnPropertySymbols(this), l = syms.length, matched = [];
		let i,ti;
		
		i = ti = -1;
		while (++i < l) syms[i].description === name && (matched[++ti] = syms[i]);
		
		return matched;
		
	}
	termOf(name) {
		
		return this[this.symOf(name) || Symbol()];
		
	}
	
	// 第一引数 source に与えた Object から、symbol 型の名前を持つプロパティの値を、
	// 実行元の対応する Symbol を名前に持つ要素と置き換える。
	// 第二引数 any に真を示す値を指定すると、プロパティの名前の型を問わず、source のすべてのプロパティを対象に置き換えを試みる。
	// この場合、例えばプロパティ名が文字列であれば、その文字列をプロパティ description に持つ Symbol を名前にした要素がそのプロパティの値と置換される。
	replaceAll(source, any = false) {
		
		if (!source || typeof source !== 'object') return;
		
		const syms = Object[any ? 'keys' : 'getOwnPropertySymbols'](source), l = syms.length;
		
		let i;
		while (++i < l) this.replace(syms[i], source[syms[i]]);
		
	}
	replace(name, term) {
		
		const index = this.indexOfTerm(typeof name === 'symbol' ? name : this.symOf(name));
		
		if (index) {
			
			const [ unmasks, callback ] = Terms, i = index[Terms.termIndex], last = index[i];
			
			unmasks in last &&
				(term[unmasks] = last[unmasks], delete last[unmasks], term[callback] = last[callback], delete last[callback]);
			
			return index[i] = term;
			
		} else return null;
		
	}
	indexOfTerm(name) {
		
		const term = this[name];
		
		return term instanceof Term ? Terms.recursiveGet(term, [ ...this ]) : null;
		
	}
	
	// 以下のコメントの内容はこのオブジェクトの持つ機能が別のオブジェクトの静的メソッドだった時のもので、
	// 大枠は変わらないが、このオブジェクトおよびそのメソッド getMasks を正確に説明するものではない。
	// 別に書き起こす必要があるが、現状怠っている。
	//
	// 第一引数 str に指定した文字列に、第二引数 hierarchy 内に列挙された Brackets のインスタンスの持つメソッド locate を順に実行し、
	// その結果を第三引数 result に指定された Object のプロパティに記録して、それを戻り値にする。
	// result はこのメソッド内での再帰処理用の引数で、通常指定する必要はない。
	// 各 Brackets の結果は、以下のようにカスケード的に後続の locate の引数に与えられる。
	// Strings.locate('hi', [ brk0, brk1, brk2 ]);
	//		...locale0 = brk0.locate(str);
	// 	...locale1 = brk1.locate(str, locale0);
	// 	...locale2 = brk2.locate(str, locale0, locale1);
	// hierarchy 内で配列をネストした場合、ネストされた Brackets.locate は前述のように先行する Brackets.locate の結果を引数として与えられるが、
	// 以下のように同じネスト内の他の Brackets.locate の結果は引数に加えない。
	// Strings.locate('hi', [ brk0, [ brk1, brk2 ], brk3 ]);
	// 	...locale1 = brk1.locate(str, locale0);
	// 	...locale2 = brk2.locate(str, locale0);
	// 	...brk3.locate(str, locale0, locale1, locale2);
	// 戻り値は Brackets.locate の結果を示す Object で、プロパティに data, named を持つ。
	// data には実行したすべての Brackets.locate の結果を***一切の例外なく機械的に再帰順で***列挙する。
	// 仮に hierarchy にネストが含まれていても、data 内の要素は並列に列挙される。
	// named は、hierarchy の Brackets が Object のプロパティとして指定された場合、その Object のプロパティ name をプロパティ名にして、
	// named の中にプロパティとして設定される。
	// Strings.locate(str, [ brk0, { target: brk1, name: 'stuff' } ]);
	// 	// = { data: [ locale0, locale1 ], named: { stuff: locale1 } }
	// named も、hierarchy のネストを考慮しない。name の重複は後続の結果で上書きされる。
	// 基本的にはこの関数は内部処理以外で使うことを想定しておらず、
	// さらに言えばコードの平易化以外を目的としていないが、入力が適切であれば（この関数が持つ目的に対して）汎用的に動作すると思われる。
	// 当初はネスト後、さらにネストした先の Brackets.locate の結果は、後続の Brackets.locate の引数に含ませないようにするつもりだったが（直系ではないため）、
	// 非常に複雑な仕組みが必要になりそうなわりに、現状ではそうしたケースに対応する必要がないため、現状のような簡易なものにしている。
	// （上記は Array.prototype.flat で実現できるかもしれない）
	// 今の仕様でこうした状況に対応する場合、異なる hierarchy を作成し、個別に実行することで対応が期待できるかもしれない。
	// 同じように、現状では存在しないが、Brackets.locate 相当のメソッドを持つ Brackets 以外のオブジェクトに対応する必要もあるかもしれない。
	// 仕組みが仕様と密接に結びついており、コードだけ見ても存在理由が理解し難いため、比較的詳細な説明を記しているが、
	// 目的そのものは上記の通り単なる可読性の向上のため以上のものではなく、重要性の低い処理を担っている。
	// 例えば Strings.get 内にある "Brackets.plot(v, ...Strings.locate(v).data.slice(1))" で
	// 第二引数以下に渡す引数を直接指定することができるのであれば、この関数はまったく必要ない。
	getMasks(str, ...masks) {
		
		const l = this.length, any = [ ...masks ];
		let i,mi,ml,ai,k,i0,l0, term,t0, currentMasks, result;
		
		i = -1, mi = ai = any.length - 1;
		while (++i < l) {
			
			if ((term = this[i]).constructor === Array) {
				
				i0 = -1, l0 = term.length, ml = (currentMasks = [ ...any ]).length - 1;
				while (++i0 < l0) {
					
					if (!(t0 = (t0 = term[i0]).constructor === Array ? [ t0 ] : t0 && typeof t0 === 'object' && t0)) continue;
					
					ai = any.push(...(result = new Terms(t0).getMasks(str, ...currentMasks)).any) - 1,
					mi = masks.push(...result.masks) - 1;
					
				}
				
				k = undefined;
				
			} else if (term instanceof Term) {
				
				(result = term.locate(str, ...any).completed).length &&
					(any[++ai] = result, term[Terms.unmasks] || (masks[++mi] = result));
				
			}
			
		}
		
		return { masks, any };
		
	}
	//exec(term, defaultValue = '', ...args) {
	//	
	//	const callback = term[Terms.callback];
	//	
	//	return callback ? Array.isArray(callback[2]) ? Reflect.apply(callback[0], callback[1], [ ...callback[2], ...args ]) : Reflect.apply(callback[0], callback[1], args) : defaultValue;
	//	
	//}
	
	split(str, separator) {
		
		return separator.split(str, ...this.getMasks(str).masks);
		
	}
	
	plot(str, detail, ...additionalMasks) {
		
		if (!(str += '')) return [ str ];
		
		const masks = [ ...this.getMasks(str).masks, ...additionalMasks ].flat(1), ml = masks.length;
		
		if (!ml) return [ str ];
		
		const sl = str.length - 1, result = [], { max, min } = Math, { deletes, splices } = Terms;
		let i,i0,l0,v, datum, mask,sub,cursor;
		
		i = i0 = -1, cursor = 0, masks.sort(Term.sortLoc);
		while (++i < ml) {
			cursor <= (mask = masks[i]).lo && (
				(sub = str.substring(cursor, max((mask = masks[i]).lo, 0))) && (result[++i0] = sub),
				cursor = mask.ro,
				(v = typeof (v = mask.captor[Terms.callback]) === 'function' ? v(mask, masks, str, detail, this) : mask) === deletes ||
					(Array.isArray(v) && v[splices] ? v.length && (i0 = result.push(...v) - 1) : (result[++i0] = v))
			);
			if (min(mask.ro, str.length) === str.length) break;
		}
		
		cursor <= sl && (result[++i0] = str.substring(cursor));
		
		return result;
		
	}
	
}

// このオブジェクトを継承する場合、メソッド ParseHelper.protoype.setPrecedence を通じて設定を行うことを推奨する。
// setPrecedence は、構文記述子を優先順に列挙した配列を指定する。
// 構文記述子には以下のプロパティを設定できる。
// 	name
// 		記述子によって作られた構文文字 Term を持つ自身のプロパティ名。プロパティは直接インスタンスに作成される。
// 	term
// 		任意の数の構文文字を列挙する配列で、Term の引数。
// 	callback
// 		構文文字に一致した際に呼びだされるコールバック関数。Function を指定すると、関数は this で束縛される。
// 		Object を指定すると、以下のプロパティに基づいて束縛を任意に設定できる。
// 		handler
// 			コールバック関数本体。
// 		scope
// 			関数を束縛するオブジェクト。未指定だと既定値として this が使われる。
// 		args
// 			関数は Function.ptototype.bind によって束縛され、このプロパティはその第二引数に相当する。
// 			このプロパティが存在しない場合、bind の第二引数は未指定で実行される。
// 			値が配列であればそれをそのまま、それ以外の場合は配列に入れて指定される。
// 			引数に配列を指定したい場合は配列の中にその配列を入れて指定する。
// 	unmasks
// 		このプロパティが真を示す記述子は、それによって作られた Term が一致を示す文字列を構文ではなく値として使う。
// 		これは通常、構文内で型の違う値を区別するために指定する。
// 	esc
// 		任意のエスケープ文字を指定する場合はこのプロパティに指定する。
//
// 記述子を列挙した配列はネストできるが、ネスト内の記述子の扱いは最上位とは少し異なる。
// より厳密に言えば、扱いが異なるのは記述子が作る Term に対してで、
// 最上位は常に先行する Term の一致結果を考慮するが、ネスト内は、先行する Term の存在を考慮しない。
// この挙動については Terms.prototype.getMasks のコメントで説明しているか、説明する予定。
//
// 任意の構文体系を作る際に、共通化できる処理を提供するのがこのオブジェクトの意図で、
// このオブジェクトを継承した先で構文のより具体的な仕様を実装することを想定している。
//
// 以下覚え書きバックアップ
// プロパティ
// 	[ParseHelper.symbol.hierarchy]
// 		Term(構文文字)を優先順で列挙した Terms。
// 	super
// 		* 記述子を通じて指定できるように変更したため、このオブジェクト自身のコンストラクターで実装される。
// 		対象文字列内の範囲として認識するが、Term.plot によって要素化されない Term を配列に列挙して指定する。
// 		文字列など、構文の範囲（スコープ）ではなく、それを構成する値の範囲を示す Term を指定することを想定。
// 		プロパティ名の super はこの意味では適切ではないかもしれないが、相応しい名前が思いつかなかったため便宜的に使用。
// メソッド
// 	[ParseHelper.symbol.before]
// 	[ParseHelper.symbol.main]
// 	[ParseHelper.symbol.after]
export class ParseHelper extends Terms {
	
	//static setTermTo(precedenceDescriptors, name, term) {
	//	
	//	const l = precedenceDescriptors.length;
	//	let i, pd;
	//	
	//	i = -1;
	//	while (++i < l)	if ((pd = precedenceDescriptors[i]).constructor === Array)
	//								ParseHelper.setTermTo(pd, name, term);
	//							else if (pd && typeof pd === 'object' && pd.name === name && (pd.term = term)) return;
	//	
	//}
	static setSymbols(target) {
		
		const	symbolNamesRaw = target?.[this.symbolNames],
				symbolNames = symbolNamesRaw === 'string' ? [ symbolNamesRaw ] : symbolNamesRaw;
		
		if (!Array.isArray(symbolNames)) return;
		
		const l = symbolNames.length,
				ss = this.symbol,
				s = target[ss] && typeof target[ss] === 'object' ? target[ss] : (target[ss] = {});
		let i,k, sn;
		
		i = -1;
		while (++i < l)
			(sn = symbolNames[i]) && typeof sn === 'string' && typeof s[sn] !== 'symbol' && (s[sn] = Symbol(sn));
		
		// precedence は ParseHelper ではなく Terms のための設定記述子になったので、以下は不要に思われる。
		//sn = ParseHelper.setPrecedenceSymbols(target[ParseHelper.symbol.precedenceDescriptors]);
		//for (k in sn) s[k] = sn[k];
		
		return s;
		
	}
	//static setPrecedenceSymbols(pd) {
	//	
	//	if (!Array.isArray(pd)) return {};
	//	
	//	const l = pd.length, s = {};
	//	let i;
	//	
	//	i = -1;
	//	while (++i < l) {
	//		if (Array.isArray(pd[i])) {
	//			s = { ...s, ...ParseHelper.setPrecedenceSymbols(pd[i]) };
	//		} else if (pd[i] && typeof pd[i] === 'object' && typeof pd[i].name === 'symbol') {
	//			s[Symbol.keyFor(pd[i].name)] = pd[i].name;
	//		}
	//	}
	//	
	//	return s;
	//	
	//}
	static {
		
		const	symbols = [
					
					'before',
					'main',
					'after',
					
					'deletes',
					'splices',
					'passthrough',
					
					'precedenceDescriptors',
					'esc',
					'symbolNames',
					'symbol',
					'hierarchy'
					
				],
				l = symbols.length;
		let i;
		
		i = -1;
		while (++i < l) this[symbols[i]] = Symbol(this.name + '.' + symbols[i]);
		
	};
	
	//constructor(precedenceRemapper, esc = this.constructor.esc) {
	constructor(configuration, constructor = ParseHelper) {
		
		Array.isArray(configuration) && (configuration = { precedence: configuration }),
		(!configuration || configuration.constructor !== Object) && (configuration = {}),
		
		configuration.precedence ||= constructor[ParseHelper.precedenceDescriptors],
		'esc' in configuration || (configuration.esc = constructor[ParseHelper.esc]),
		
		super(configuration);
		
		//this.super = [],
		//this.map = new Map(),
		
		//this.setByPrecedence(this.constructor[ParseHelper.symbol.precedenceDescriptors], esc);
		//this.remapPrecedenceTerm(precedenceRemapper, esc);
		
	}
	
	safeReturn(v) {
		const c = v?.constructor;
		return c === Array ? [ ...v ] : c === Object ? { ...v } : v;
	}
	
	get(str, detail = {}) {
		
		let v;
		
		for (v of this.getParser(str, detail));
		
		return v;
		
	}
	*getParser(str, detail = {}, plot = this.plot(str) ?? []) {
		
		const parsed = [], { before, main, after, deletes, splices, passthrough } = ParseHelper;
		let i,l, v;
		
		//if (Array.isArray(this.super)) {
		//	
		//	i = -1, l = this.super.length;
		//	while (++i < l) (i0 = precedence.indexOf(this.super[i])) === -1 || masks.splice(i0, 1);
		//	
		//}
		
		l = plot.length;
		
		if (typeof this[before] === 'function') {
			
			if ((v = this.safeReturn(this[before](plot, l, str, detail, this), l = plot.length, v)) !== passthrough) return v;
			
			(v = yield v) && (plot = v);
			
		}
		
		if (typeof this[main] === 'function') {
			
			let pi;
			
			i = pi = -1, l = plot.length;
			while (++i < l) {
				
				v = this[main](plot[i], parsed, plot, l, str, detail, this);
				
				if (Array.isArray(v) && v.hasOwnProperty(splices) && v.length) {
					
					pi = parsed.push(...v) - 1;
					
				} else if (v === deletes) {
					
					plot.splice(i--, 1), --l;
					
				} else {
					
					parsed[++pi] = v;
					
				}
				
			}
			
		} else parsed.push(...plot);
		
		(v = yield parsed) && (parsed = v);
		
		yield this.safeReturn(
						typeof this[after] === 'function' ?
							this[after](parsed, parsed.length, plot, l, str, detail, this) : parsed
					);
		
	}
	
}

export class Strings {
	
	static anonAssignKey = Symbol('Strings.anonAssignKey');
	
	constructor(param, sp, exp, desc) {
		
		sp = this.sp = sp instanceof StringsParser ? sp : new StringsParser(sp);
		
		const	es = StringsExpression.symbol;
		
		this.exp = exp instanceof StringsExpression ?
			exp : new StringsExpression({ replacer: { [es.str]: sp.termOf('str'), [es.evl]: sp.termOf('evl') } }),
		
		this.desc = desc instanceof StringsDescriptor ? desc : new StringsDescriptor(),
		
		this.assigned = {},
		this.unlabels = [];
		
	}
	
	get(str, assigned = this.assigned) {
		
		(assigned && typeof assigned === 'object') || (assigned = { [Strings.anonAssignKey]: assigned });
		
		const parameters = this.sp.get(str, assigned), pl = parameters.length, esc = this.sp.esc;
		let i,i0,l0, p, args;
		
		return parameters;
		
		i = -1;
		while (++i < pl) {
			
			if (!(p = parameters[i]) || typeof p !== 'object') continue;
			
			p = this.param.get(p.inners[0], assigned);
			
			if (Array.isArray(args = (p = parameters[i]).args) && (l0 = args.length)) {
				
				i0 = -1;
				while (++i0 < l0) args[i0] = this.exp.get(args[i0], assigned);
				
			}
			
			p.v = this.desc.get(p, assigned);
			
		}
		
		return parameters;
		
		const composed = Composer.compose(parameters), cl = composed.length;
		
		i = -1;
		while (++i < cl) composed[i] = esc.replace(composed[i]);
		
		return composed;
		
	}
	
	register(descriptor, describe) {
		
		this.desc.register(...arguments);
		
	}
	
}

export class StringsParser extends ParseHelper {
	
	static {
		
		this.assignedIndex = Symbol('StringsParser.assignedIndex'),
		
		// esc = escape
		this[ParseHelper.esc] = '\\',
		
		// str = string, nst = nest, ref = reference, blk = block
		this[ParseHelper.symbolNames] = [
			'str', 'nst', 'ref', 'syx',
			're', 'evl', 'fnc', 'dom', 'amp', 'frk', 'ech', 'clc',
			'backwards', 'every'
		],
		
		(this.syx = {
			str: [ "'", "'" ],
			nest: [ '<', '>' ],
			ref: [ '<', '>' ],
			l: '[',
			r: ']',
			assign: '=',
			suppressor: ';',
			separator: ':',
			comma: new Chr(/[\s\t]*,[\s\t]*/g)
		}).assignment =
			new Chr(new RegExp(`[${Unit.escapeRegExpPattern(this.syx.suppressor + this.syx.separator)}]`, 'g'));
		
		const	s = ParseHelper.setSymbols(this),
				{ str,nest,ref, l, r, assign, suppressor, separator } = this.syx,
				assignment = this.syx.assignment;
		
		this[ParseHelper.precedenceDescriptors] = [
			{ name: s.str, term: str, unmasks: true },
			{ name: s.nst, term: nest, callback: StringsParser.nest },
			{ name: s.ref, term: ref, callback: StringsParser.reference },
			{ name: s.syx, term: [ l, r ], callback: StringsParser.parse },
			// sya = syntax assign
			//{ name: 'sya', term: [ l, assignment, r ], callback: StringsParser.parse },
			//{ name: 'syx', term: [ l, assignment, separator, r ], callback: StringsParser.parse },
			//{
			//	name: s._syx,
			//	term: [ '[', /(?:=\s*?(?<assign>[a-zA-Z_$][\w$]*?))?\s*?(?:(?:;|\:)\s*?(?<option>.*?))?\s*?:/g, ']' ],
			//	callback: Strings.parse
			//},
		];
		
		this.parameterPrecedence = [
			{ name: s.str, term: str, esc: null },
			{ name: s.nst, term: nest, esc: null },
			{ name: s.syx, term: [ l, r ], esc: null },
		];
		
	}
	static nest(mask, masks, input, detail, self) {
	}
	static reference(mask, masks, input, detail, self) {
	}
	static parse(mask, masks, input, detail, self) {
		
		const	{ assign, assignment, suppressor } = StringsParser.syx;
		
		if (!assignment.test(mask.inners[0], ...this.paramMask.getMasks(mask.inners[0]).masks)) return mask.$;
		
		//coco
		
		return mask;
		
		const	splitted = mask.splitted,
				header = splitted[1].split(assign),
				descriptor = header[0]?.trim?.(),
				label = header?.[1]?.trim?.(),
				suppresses = suppressor instanceof RegExp ? suppressor.test(splitted[2][0]) : splitted[2][0] === suppressor;
		let i,l, option, args, v;
		
		switch (mask.captor) {
			
			case this.termOf('sya'):
			args = splitted[3];
			break;
			
			case this.termOf('syx'):
			option = splitted[3].trim(), args = splitted[5];
			break;
			
		}
		
		args &&= this.argMask.split(args.trim(), StringsParser.syx.comma),
		
		v = { descriptor, label, option, args };
		
		return suppresses ? { suppressed: v } : v;
		
	}
	
	constructor(configuration) {
		
		super(configuration, StringsParser);
		
		const s = StringsParser.symbol;
		
		this.paramMask = new Terms({ precedence: StringsParser.parameterPrecedence, defaultThis: this, replacer: { [s.str]: [ ...this.termOf('str') ], [s.nst]: [ ...this.termOf('nst') ], [s.syx]: [ ...this.termOf('syx') ] } }),
		
		this.argMask = new Terms(this.termOf('str'), this.termOf('nst'), this.termOf('sya'), this.termOf('syx'));
		
	}
	
	[ParseHelper.before](plot, plotLength, input, detail, self) {
		
		(detail.hasOwnProperty(StringsParser.assignedIndex) && Array.isArray(detail[StringsParser.assignedIndex])) ||
			(detail[StringsParser.assignedIndex] = []);
		
		return ParseHelper.passthrough;
		
	}
	//[ParseHelper.before](plot, plotLength, input, detail, self) {
	//	
	//	detail.v ||= {}, detail.addr ||= [];
	//	
	//	return ParseHelper.passthrough;
	//	
	//}
	[ParseHelper.main](block, parsed, plot, plotLength, input, detail, self) {
		
		const index = detail[StringsParser.assignedIndex], l = index.length, k = block?.label;
		
		return k && (detail[k] = block), detail[index[l] = Symbol()] = block;
		
	}
	//[ParseHelper.main](block, parsed, plot, plotLength, input, detail, self) {
	//	
	//	const addr = detail[ParseHelper.assignedIndex], l = addr.length;
	//	//coco
	//	addr[l] = Symbol(),
	//	block && typeof block === 'object' && block.label && (detail[l] = block.label);
	//	
	//	return block;
	//	if (typeof block === 'string') return block;
	//	hi(block);
	//	return block.captor?.[Terms.callback]?.(block, { block, parsed, plot, plotLength, input, detail, self });
	//	
	//	const callback = this[ParseHelper.mask].callback(block.captor);
	//	
	//	return Array.isArray(callback) ?
	//		Reflect.apply(callback[0], callback[1], [ ...callback[2], block, { block, parsed, plot, plotLength, input, detl, self } ]) : block.$;
	//	
	//	const	{ label, stores, every, backwards, inner } =
	//				this.parse(block.inners[0], this.unlabels.indexOf(block.captor) !== -1);
	//	let i,i0,l0, args, v,vi, arg;
	//	
	//	label && (detail.addr[l] = label),
	//	
	//	v = this.map.get(block.captor)?.(inner, ...arguments) ?? inner,
	//	label && (detail.v[label] = v),
	//	
	//	every && typeof v === 'number' ? (v = -v) : v && typeof v === 'object' && (v[Strings.sym.every] = every),
	//	backwards && v && typeof v === 'object' && (v[Strings.sym.backwards] = backwards);
	//	
	//	return stores ? { neglect: v } : v;
	//	
	//}
	
	//register(descriptor, describe) {
	//	
	//	this?.desc?.register(...arguments);
	//	
	//}
	
}

export class StringsExpression extends ParseHelper {
	
	static descriptor = {
		
		call(mask, masks, input, detail, self) {
			
			// コメントの行は変更前の処理で、ネストする計算でエラーが起きていたが、
			// ここに手を加えた覚えはないものの、戻り値の [0] を外すと動作するようになっている。またおかしくなった時はここを確認。
			// 実際は手を加えた(恐らく StringsExpression.prototype.after の戻り値)が、ここが変更箇所のいくつかの呼び出し元のひとつであるため、
			// 変更時に影響の確認を怠っていたものと思われる。
			//return this.get(inner, detail)[0];
			return this.get(inner, detail);
			
		},
		number(mask, masks, input, detail, self) {
			return +mask.$;
		},
		
		string(mask, masks, input, detail, self) {
			return mask.$;
		},
		
		eval(mask, masks, input, detail, self) {
			return (new Function('labeled', mask.$))(detail);
		},
		
		identify(mask, masks, input, detail, self) {
			return detail && typeof detail === 'object' ? detail?.[mask.$] ?? undefined : undefined;
		},
		
		ops(mask, masks, input, detail, self) {
			
			const op = mask.$, precedence = StringsExpression.opsPrecedence, l = precedence.length;
			let i;
			
			i = -1;
			while (++i < l && precedence[i].kw.indexOf(op) === -1);
			
			if (i === l) throw new SyntaxError(`There are no operator such "${op}".`);
			
			return precedence[i].sym;
		}
		
	};
	static add(v, left, right, idx, ldx, rdx, parsed, parsedLength, plot, plotLength, input, detail, self) {
		
		return [
			idx - (idx - ldx),
			(rdx ?? idx) - ldx + 1,
			left === null ? right === null ? null : +right : right === null ? left : left + right
		];
		
	}
	static sub(v, left, right, idx, ldx, rdx, parsed, parsedLength, plot, plotLength, input, detail, self) {
		
		return [
			idx - (idx - ldx),
			(rdx ?? idx) - ldx + 1,
			left === null ? right === null ? null : -right : right === null ? left : left - right
		];
		
	}
	static div(v, left, right, idx, ldx, rdx, parsed, parsedLength, plot, plotLength, input, detail, self) {
		
		return [
			idx - (idx - ldx),
			(rdx ?? idx) - ldx + 1,
			left === null ? right === null ? null : right : right === null ? left : left / right
		];
		
	}
	static mul(v, left, right, idx, ldx, rdx, parsed, parsedLength, plot, plotLength, input, detail, self) {
		
		return [
			idx - (idx - ldx),
			(rdx ?? idx) - ldx + 1,
			left === null ? right === null ? null : right : right === null ? left : left * right
		];
		
	}
	static kwd(v, left, right, idx, ldx, rdx, parsed, parsedLength, plot, plotLength, input, detail, self) {
		
		switch (v) {
			case 'nai': v = null; break;
			case 'hu': v = undefined; break;
			case 'shin': v = true; break;
			case 'gi': v = false; break;
			default: throw new SyntaxError(`Got an unknown keyword "${v}".`);
		}
		
		return [ idx, 1, v ];
		
	}
	
	static {
		
		this.opsSymbolNames = [ 'nai', 'div', 'mul', 'sub', 'add' ],
		this[ParseHelper.symbolNames] = [
			'str', 'cll', 'evl', 'num', 'idt', 'ops', ...this.opsSymbolNames
		];
		
		const	s = ParseHelper.setSymbols(this),
				opsPrecedence = this.opsPrecedence = [
					{ sym: s.kwd, callback: StringsExpression.nai, kw: [ 'nai', 'hu', 'shin', 'gi' ] },
					{ sym: s.div, callback: StringsExpression.div, kw: [ '/' ] },
					{ sym: s.mul, callback: StringsExpression.mul, kw: [ '*' ] },
					{ sym: s.sub, callback: StringsExpression.sub, kw: [ '-' ] },
					{ sym: s.add, callback: StringsExpression.add, kw: [ '+' ] }
				],
				l = opsPrecedence.length;
		let i,i0,l0,oi,kw, ops;
		
		i = oi = -1, ops = [];
		while (++i < l) {
			i0 = -1, l0 = (kw = Array.isArray(kw = opsPrecedence[i].kw) ? [ ...kw ] : [ kw ]).length;
			while (++i0 < l0) kw[i0] = Unit.escapeRegExpPattern(kw[i0]);
			l0 && (ops[++oi] = kw.join('|'));
		}
		
		this[ParseHelper.precedenceDescriptors] = [
			{ name: s.str, term: [ "'", "'" ], callback: StringsExpression.descriptor.string },
			{ name: s.cll, term: [ '(', ')' ], callback: StringsExpression.descriptor.call },
			{ name: s.evl, term: [ '`', '`' ], callback: StringsExpression.descriptor.eval },
			{ name: s.num, term: [ /\d+(?:\.\d+)?/g ], callback: StringsExpression.descriptor.number },
			{ name: s.idt, term: [ /[$A-Za-z_\u0080-\uFFFF][$\w\u0080-\uFFFF]*/g ], callback: StringsExpression.descriptor.identify },
			{ name: s.ops, term: [ new RegExp('(?:' + ops.join('|') + ')', 'g') ], callback: StringsExpression.descriptor.ops }
		];
		
	}
	
	constructor(configuration) {
		
		super(configuration, StringsExpression);
		
	}
	
	[ParseHelper.after](parsed, parsedLength, plot, plotLength, input, detail, self) {
		
		const prcdc = StringsExpression.opsPrecedence, l = prcdc.length, splice = Array.prototype.splice;
		let i,i0,li,ri, op,p,v, lp, spliceArgsLength;
		
		i = -1, lp = parsedLength - 1;
		while (++i < l) {
			
			i0 = -1, op = prcdc[i];
			while (++i0 < parsedLength) {
				
				(p = parsed[i0]) === op.sym && (
					
					v = op.callback?.(
							p,
							(li = i0 > 0 ? i0 - 1 : null) === null ? li : parsed[li],
							(ri = i0 === lp ? null : i0 + 1) === null? ri : parsed[ri],
							i0, li, ri,
							...arguments
						),
					Array.isArray(v) && (
							splice.call(parsed, ...v),
							i0 = (v[0] + (spliceArgsLength = v.slice(2).length)) - 1,
							lp = (parsedLength -= v[1] - spliceArgsLength) - 1
						)
				);
				
			}
			
		}
		
		return parsed[0];
		
	}
	
}

export class StringsDescriptor {
	
	static {
		
		this.deletes = Symbol('StringsDescriptor.deletes'),
		this.reflects = Symbol('StringsDescriptor.reflects');
		
	}
	
	constructor() {
		
		this.descriptor = {},
		
		this.register(...arguments);
		
	}
	
	get(parameter, assigned, property) {
		
		const	descriptor = this.descriptor[parameter.descriptor];
		let v;
		
		if (Array.isArray(descriptor) && descriptor[StringsDescriptor.reflects]) {
			
			const l = descriptor.length, args = [];
			let i;
			
			i = -1;
			while (++i < l) args[i] = parameter.args[i];
			
			v = Reflect.apply(descriptor[0], descriptor[1], [ ...args, ...descriptor[2] ]);
			
		} else v = descriptor;
		
		parameter.label && assigned && typeof assigned === 'object' && (assigned[parameter.label] = v);
		
		return v;
		
	}
	
	// 第二引数に指定されたコールバック関数 describe を、
	// 第一引数 descriptor の型によって異なる方法でインスタンスに関連付ける。
	// descriptor が文字列の時は、その名前をプロパティ名にする。
	// 配列の時は、その要素をプロパティ名とする。
	// Object の時は、describe は用いられず、descriptor のキーと値のペアを、それぞれ descriptor、describe とする。
	// describe およびそれと同等のプロパティの値には、関数か配列を指定する。
	// 配列の場合、その値は Reflect.apply の引数に準じた要素を列挙する必要がある。
	// ただし、第三引数部分は、配列ではなく、与えたい引数を任意の数だけ配列の二番目以降に列挙する。
	// 第三引数 asValue に真を示す値を指定すると、describe に、null などを含む任意の値を指定できる。
	// この場合、通常はコールバック関数の戻り値を通じて値を取得する場面で、その値が固定値として与えられる。
	// describe にシンボル StringsDescriptor.deletes を指定すると、descriptor に指定したプロパティを削除する。
	register(descriptor, describe, asValue) {
		
		if (!descriptor) return;
		
		switch (typeof descriptor) {
			
			case 'string':
			this.registerCallback(descriptor, describe, asValue);
			break;
			
			case 'object':
			if (Array.isArray(descriptor)) {
				
				const l = descriptor.length;
				let i;
				
				i = -1;
				while (++i < l) this.registerCallback(descriptor[i], describe, asValue);
				
			} else if (descriptor) {
				
				let k;
				for (k in descriptor) this.registerCallback(k, descriptor[k], asValue);
				
			}
			break;
			
		}
		
	}
	registerCallback(name, callback, asValue) {
		
		if (callback === StringsDescriptor.deletes) {
			delete this.descriptor[name];
			return;
		}
		
		if (asValue) {
			this.descriptor[name] = callback;
			return;
		}
		
		typeof callback === 'function' && (callback = [ callback, undefined ]);
		
		Array.isArray(callback) && typeof callback[0] === 'function' &&
			(callback[2] = callback.slice(2), (this.descriptor[name] = callback)[StringsDescriptor.reflects] = true);
		
	}
	
}

const strings = new Strings();
export default strings.get.bind(strings);

class Counter {
	
	static describe(from, to, value, pad, separator, parameter, assigned) {
		
		// 以下の this は、Composer で実行する時に、 Composer.exec in this で真を示す時に this[Composer.exec] に置き換えられる。
		// 上の記述は謎だが、Composer.$ は、実行時に、生成する文字列を列挙する Array に置換される。
		const reflections = [ [ this.count, Composer.$, [ from, to, value ] ] ];
		
		reflections[Composer.reflections] = true,
		
		Number.isNaN(typeof (pad = parseInt(pad))) || !pad ||
			(reflections[1] = [ String.prototype[pad > 0 ? 'padStart' : 'padEnd'], Composer.$, [ Math.abs(pad), separator ] ]);
		
		return reflections;
		
	}
	
	// 第一引数 from の値を、第二引数 to の値になるまで第三引数 value を加算し、
	// その過程のすべての演算結果を第四引数 values に指定された配列に追加する。
	// 例えば increase(2, 5, 1) の場合、戻り値は [ 2, 3, 4, 5 ] になる。
	// from, to には文字列を指定できる。この場合、from が示す文字列のコードポイントから、
	// to が示す文字列のコードポイントまで、value を加算し続ける。
	// increase('a', 'e', 1) であれば戻り値は [ 'a', 'b', 'c', 'd', 'e' ] である。
	// from, to いずれの場合も、指定した文字列の最初の一文字目だけが演算の対象となることに注意が必要。
	// increase('abcd', 'efgh', 1) の戻り値は先の例の戻り値と一致する。
	// 無限ループ忌避のため、value は常に自然数に変換される。
	// 一方で value は負の値を受け付け、指定すると出力の末尾は常に to の値に丸められる。
	// increase(0,3,2) の戻り値は [ 0, 2 ] だが、 increase(0,3,-2) の戻り値は [ 0, 2, 3 ] である。
	static count(from = 0, to = 1, value = 1) {
		
		if (!value) return (this[this.length] = from);
		
		const	isNum = typeof from === 'number' && typeof to === 'number', round = value < 0;
		let i, vl, v;
		
		from = isNum ?	(Number.isNaN(v = from === undefined ? 0 : +from) ? (''+from).codePointAt() : v) :
							(''+from).codePointAt()
		to = isNum ?	(Number.isNaN(v = to === undefined ? 1 : +to) ? (''+to).codePointAt() : v) :
							(''+to).codePointAt(),
		vl = this.length - 1, value = Math.abs(value);
		
		if (from < to) {
			
			const l = to - from + value;
			
			i = -value;
			while ((i += value) < l) {
				if ((v = from + i) > to) {
					if (!round) break;
					v = to;
				}
				this[++vl] = isNum ? ''+v : String.fromCodePoint(v);
			}
			
		} else {
			
			const l = to - from - value;
			
			i = value;
			while ((i -= value) > l) {
				if ((v = from + i) < to) {
					if (!round) break;
					v = to;
				}
				this[++vl] = isNum ? ''+v : String.fromCodePoint(v);
			}
			
		}
		
		return this;
		
	}
	
}
strings.register([ '+', 'cnt' ], [ Counter.describe, Counter ]);

class Reflector {
	
	// 第一引数に指定された配列の中の記述子に基づいた処理を、
	// 第二引数に指定された配列の要素に対して行なう。
	// values の中の要素は文字列であることが暗黙的に求められる。
	// 記述子は Object で、以下のプロパティを指定できる。
	//		value (optional)
	//			実行対象。未指定であれば values に与えられた対象の値になる。後続の記述子の target が未指定ないし nullish だった場合、
	//			直近の有効な target の値を引き継いで処理が行なわれる。
	// 	name
	//			処理される要素が持つメソッド名。例えば要素が文字列なら、String のメソッドなどが指定できる。
	// 	args (optional)
	// 		name が示すメソッドに渡される引数を列挙した配列。
	// 上記記述子の指定内容は、name が示すメソッドに apply を通して反映される。
	// メソッドの戻り値は values に追加されると同時に、後続のメソッドの実行対象にもなる。これは連続した文字列操作を想定した仕様。
	// target が true の場合、戻り値ではなく、直近の実行対象が再利用される。
	static describe(methodName, target, ...args) {
		
		const reflection = [], reflections = [ reflection ];
		
		reflection[0] = methodName || 'toString',
		reflection[1] = typeof target === 'boolean' ? (target || (reflection[Composer.each] = true), Composer.$) : target,
		reflection[2] = args,
		
		reflections[Composer.reflections] = true;
		
		return reflections;
		
	}
	
}
strings.register([ '@', 'app' ], [ Reflector.describe, Reflector ]);

class Selector {
	
	static describe(urls, selector = ':root', propertyName = [ 'innerHTML' ], rxSrc, interval = -1, timeout = 30000) {
		
		const reflections = [ [ Selector.select, Composer.$, ...args ] ];
		
		reflections[Composer.reflections] = true;
		
		return reflections;
		
	}
	
	// 第一引数 urls に指定された配列の要素が示すべき URL にアクセスし、
	// 取得した HTML を(HTML であるべき) <iframe> に読み込み、
	// 展開されたドキュメントの第二引数 selector に一致するすべての要素から、第三引数 propertyName に指定された属性値ないしプロパティを取得する。
	// 取得した値は第六引数 values に指定された配列に列挙される Promise を通じて渡される。
	// urls が偽を示す時は、このオブジェクトが属するドキュメントに対して上記の処理を同期処理で行なう。
	// つまり、values の要素には Promise ではなく取得した値がそのまま設定される。
	// 第四引数 interval に自然数が設定された時、非同期で行なわれる値の取得処理は、
	// urls に指定された URL 順に、ひとつ処理が完了する毎に intervals で指定したミリ秒待機後、次の要素へ移行するのを urls の末尾まで繰り返す。
	// 一方 values には戻り値に渡された時点ですべての要素に Promise が設定されている。
	// 正しく動作すればこの values の末端の Promise の解決がすべての要素の解決を意味することになる。
	// intervals に自然数以外の値（既定値）を指定すると、すべての URL 先に同時平行してアクセスする。
	// 第五引数 timeout に自然数が設定されると、それをミリ秒として、timeout までに HTML の取得ができなければ
	// 強制的にその通信を中断し、該当の Promise を拒否する。timeout は、既定では 30 秒に設定される。
	// URL 先のドキュメントを、ブラウザーからウェブページへアクセスするのとまったく同じに、実際に完全にブラウザー上で展開するため、
	// URL の数が多ければ多いほどパフォーマンスの問題が生じる。
	// また intervals に指定する値が小さければ、アクセス先に経済的なものも含む深刻な損害を与えかねない点に注意しなければならない。
	// こうした問題を踏まえた上で実行し、実際にアクセスに成功しても、期待した結果は得られないかもしれない。
	// 特に動的にリソースを読み込むページ上の情報はほとんど正確な結果は期待できない。
	// このメソッドは、まず対象の URL が示す HTML を文字列として取得したあと、
	// このスクリプトを読み込んだページ上に追加した iframe の属性 srcdoc にそれを指定する。
	// つまり HTML の絶対パスは、このスクリプトの実行パスになり、HTML が異なる階層に存在していた場合、HTML 内のすべての相対パスに不整合が生じるのである。
	// このメソッドが期待する結果を返すのは、概ね静的なページに対してのみである。
	// これは W3C の定める同一オリジンポリシーによる制限で、サーバーと連携するか、拡張機能上でなければ回避することはできない。
	//
	// 入れ子状の Promise が複雑に接続しており、匿名関数を通じたコールバック関数の作成の多用と、
	// 特定の箇所で Promise を生成元外で解決している点を踏まえなければ、履行の追跡は難しいと思われる。
	// 通信処理とは関係のない、戻り値の作成を、他の処理と切り分けて捉えることも重要。
	// さらに、これらの一連の遅延処理の流れは、この関数群の呼び出し元 Composer.getComposer をまたぎ、一方だけの理解では把握に至れない。
	//
	// 以下は旧解説。
	// 第一引数 selector に指定した文字列を、document.querySelectorAll の第一引数にし、
	// 選択されたすべての要素から、第二引数 propertyName に指定したプロパティの値を取得し、
	// それを第三引数 values に指定した配列に追加する。
	static select(urls, selector = ':root', propertyName = [ 'innerHTML' ], rxSrc, interval = -1, timeout = 30000) {
		
		if (urls) {
			
			Array.isArray(urls) || (urls = [ urls ]);
			
			const	URLs = [], l = urls.length, current = location.origin + location.pathname,
					awaits = (interval = interval|0) > -1,
					prs = Selector.promiseRemoteSelector;
			let i;
			
			i = -1;
			while (++i < l) {
				
				// 引数 intervals が有効で、かつ urls の数が多い時、恐らくすさまじい数の Promise のネストが発生するだろう。
				// await を使えばいいかもしれないが、Strings.prototype.get を非同期関数にすることによって生じる影響を検討する気になれない。
				
				this[i] = awaits > -1 && i ? 
					this[i - 1].then((url => () => new Promise(rs => setTimeout(() => prs(url, current, selector, propertyName, rxSrc, timeout, this).catch(error => error).then(v => rs(v)), interval)))(urls[i])) :
					prs(urls[i], current, selector, propertyName, rxSrc, timeout, this);
				
			}
			
			return this;
			
		} else {
			
			return Selector.getNodesValue(document.querySelectorAll(selector), propertyName, rxSrc, this);
			
		}
		
	}
	static promiseRemoteSelector(url, current, selector, propertyName, rxSrc, timeout, values = []) {
		
		const ac = new AbortController();
		
		console.info('[Strings]', 'LOAD', url);
		
		return new Promise((rs, rj) => {
				const ac = new AbortController();
				fetch(new URL(url, current)+'', { signal: ac.signal }).
					then(response => rs(response)).catch(error => rj(error)),
				timeout && setTimeout(() => (ac.abort(), rj(Error('timeouted'))), timeout);
			}).
				then(response => response.text()).catch(error => error).
					then(v => v instanceof Error ? v : Selector.remote(v, selector, propertyName, rxSrc, values));
		
	}
	static remote(html, selector, propertyName, rxSrc, values) {
		
		let resolver;
		const iframe = document.createElement('iframe'),
				// https://developer.mozilla.org/ja/docs/Web/API/crypto_property
				signature = crypto.getRandomValues(new Uint32Array(1)).join(),
				messenger = `<script>
						const	loaded = event => {
												removeEventListener('message', loaded),
												postMessage(
													{
														signature: '${signature}',
														values:	(${Selector.getNodesValue.toString().replace(new RegExp(`^${Selector.getNodesValue.name}`), 'function')})
																		(document.querySelectorAll('${selector}'), ${JSON.stringify(propertyName)}, ${JSON.stringify(rxSrc || null)})
													},
													'${location.origin}'
												)
											};
						addEventListener('DOMContentLoaded', loaded);
					</script>`,
				promise = new Promise (rs => resolver = rs),
				received = message => message.data?.signature === signature && (
						iframe.contentWindow.removeEventListener('message', received),
						iframe.remove(),
						values.push(...message.data.values),
						resolver(values)
					),
				loaded = event => (
						iframe.removeEventListener(event.type, loaded),
						iframe.contentWindow.addEventListener('message', received)
					);
		
		iframe.addEventListener('load', loaded),
		iframe.srcdoc = html + messenger,
		document.body.appendChild(iframe);
		
		return promise;
		
	}
	static getNodesValue(nodes = [], propertyName = [ 'innerHTML' ], rxSrc, values = []) {
		
		const	l = nodes.length,
				requiresAttr = typeof propertyName === 'string',
				pl = propertyName?.length,
				rx = rxSrc && new RegExp(rxSrc);
		let i,i0, vl, v;
		
		if (!l || !(requiresAttr || pl)) return values;
		
		i = -1, vl = values.length - 1;
		
		if (requiresAttr) {
			
			while (++i < l) values[++vl] = nodes[i].getAttribute(propertyName) || '';
			
		} else if (propertyName[0] === 'style') {
			
			while (++i < l) values[++vl] = nodes[i].style.getPropertyValue(propertyName?.[1]) || '';
		
		} else {
		
			while (++i < l) {
				
				i0 = -1, v = nodes[i];
				while (++i0 < pl && (v = v[propertyName[i0]]) && typeof v === 'object');
				values[++vl] = v;
				
			}
			
		}
		
		if (rx) {
			
			i = -1, vl = values.length;
			while (++i < vl) values[i] = rx.exec(values[i])?.[0] || '';
			
		}
		
		return values;
		
	}
}
strings.register([ '$', 'dom' ], [ Selector.describe, Selector ]);

export class Composer {
	
	static {
		
		this.$ = Symbol('Composer.$'),
		this.exec = Symbol('Composer.exec'),
		this.reflections = Symbol('Composer.reflections'),
		this.reflection = Symbol('Composer.reflection'),
		this.each = Symbol('Composer.each');
		
	}
	
	// 第一引数 array の要素を第二引数 values に追加するだけの関数。
	// 同様の処理は JavaScript のネイティブの機能を用いてよりエコノミーに実現できるが、
	// ここでは拡張の余地を作ることを目的として実装している。逆に言えばこの関数にそれ以上の意味はない。
	static concat(array, values = []) {
		
		const l = array.length;
		let i,l0;
		
		i = -1, l0 = values.length - 1;
		while (++i < l) values[++l0] = array[i];
		
		return values;
		
	}
	
	// 第一引数 urls に指定された配列の要素が示すべき URL にアクセスし、
	// 取得した HTML を(HTML であるべき) <iframe> に読み込み、
	// 展開されたドキュメントの第二引数 selector に一致するすべての要素から、第三引数 propertyName に指定された属性値ないしプロパティを取得する。
	// 取得した値は第六引数 values に指定された配列に列挙される Promise を通じて渡される。
	// urls が偽を示す時は、このオブジェクトが属するドキュメントに対して上記の処理を同期処理で行なう。
	// つまり、values の要素には Promise ではなく取得した値がそのまま設定される。
	// 第四引数 interval に自然数が設定された時、非同期で行なわれる値の取得処理は、
	// urls に指定された URL 順に、ひとつ処理が完了する毎に intervals で指定したミリ秒待機後、次の要素へ移行するのを urls の末尾まで繰り返す。
	// 一方 values には戻り値に渡された時点ですべての要素に Promise が設定されている。
	// 正しく動作すればこの values の末端の Promise の解決がすべての要素の解決を意味することになる。
	// intervals に自然数以外の値（既定値）を指定すると、すべての URL 先に同時平行してアクセスする。
	// 第五引数 timeout に自然数が設定されると、それをミリ秒として、timeout までに HTML の取得ができなければ
	// 強制的にその通信を中断し、該当の Promise を拒否する。timeout は、既定では 30 秒に設定される。
	// URL 先のドキュメントを、ブラウザーからウェブページへアクセスするのとまったく同じに、実際に完全にブラウザー上で展開するため、
	// URL の数が多ければ多いほどパフォーマンスの問題が生じる。
	// また intervals に指定する値が小さければ、アクセス先に経済的なものも含む深刻な損害を与えかねない点に注意しなければならない。
	// こうした問題を踏まえた上で実行し、実際にアクセスに成功しても、期待した結果は得られないかもしれない。
	// 特に動的にリソースを読み込むページ上の情報はほとんど正確な結果は期待できない。
	// このメソッドは、まず対象の URL が示す HTML を文字列として取得したあと、
	// このスクリプトを読み込んだページ上に追加した iframe の属性 srcdoc にそれを指定する。
	// つまり HTML の絶対パスは、このスクリプトの実行パスになり、HTML が異なる階層に存在していた場合、HTML 内のすべての相対パスに不整合が生じるのである。
	// このメソッドが期待する結果を返すのは、概ね静的なページに対してのみである。
	// これは W3C の定める同一オリジンポリシーによる制限で、サーバーと連携するか、拡張機能上でなければ回避することはできない。
	//
	// 入れ子状の Promise が複雑に接続しており、匿名関数を通じたコールバック関数の作成の多用と、
	// 特定の箇所で Promise を生成元外で解決している点を踏まえなければ、履行の追跡は難しいと思われる。
	// 通信処理とは関係のない、戻り値の作成を、他の処理と切り分けて捉えることも重要。
	// さらに、これらの一連の遅延処理の流れは、この関数群の呼び出し元 Composer.getComposer をまたぎ、一方だけの理解では把握に至れない。
	//
	// 以下は旧解説。
	// 第一引数 selector に指定した文字列を、document.querySelectorAll の第一引数にし、
	// 選択されたすべての要素から、第二引数 propertyName に指定したプロパティの値を取得し、
	// それを第三引数 values に指定した配列に追加する。
	static select(urls, selector = ':root', propertyName = [ 'innerHTML' ], rxSrc, interval = -1, timeout = 30000, values = []) {
		
		if (urls) {
			
			Array.isArray(urls) || (urls = [ urls ]);
			
			const	URLs = [], l = urls.length, current = location.origin + location.pathname,
					awaits = (interval = interval|0) > -1;
			let i;
			
			i = -1;
			while (++i < l) {
				
				// 引数 intervals が有効で、かつ urls の数が多い時、恐らくすさまじい数の Promise のネストが発生するだろう。
				// await を使えばいいかもしれないが、Strings.prototype.get を非同期関数にすることによって生じる影響を検討する気になれない。
				
				values[i] = awaits > -1 && i ? 
					values[i - 1].then((url => () => new Promise(rs => setTimeout(() => Composer.promiseRemoteSelector(url, current, selector, propertyName, rxSrc, timeout).catch(error => error).then(v => rs(v)), interval)))(urls[i])) :
					Composer.promiseRemoteSelector(urls[i], current, selector, propertyName, rxSrc, timeout);
				
			}
			
			return values;
			
		} else {
			
			return Composer.getNodesValue(document.querySelectorAll(selector), propertyName, rxSrc, values);
			
		}
		
	}
	static promiseRemoteSelector(url, current, selector, propertyName, rxSrc, timeout, values = []) {
		
		const ac = new AbortController();
		
		console.info('[Strings]', 'LOAD', url);
		
		return new Promise((rs, rj) => {
				const ac = new AbortController();
				fetch(new URL(url, current)+'', { signal: ac.signal }).
					then(response => rs(response)).catch(error => rj(error)),
				timeout && setTimeout(() => (ac.abort(), rj(Error('timeouted'))), timeout);
			}).
				then(response => response.text()).catch(error => error).
					then(v => v instanceof Error ? v : Composer.remoteSelector(v, selector, propertyName, rxSrc, values));
		
	}
	static remoteSelector(html, selector, propertyName, rxSrc, values) {
		
		let resolver;
		const iframe = document.createElement('iframe'),
				// https://developer.mozilla.org/ja/docs/Web/API/crypto_property
				signature = crypto.getRandomValues(new Uint32Array(1)).join(),
				messenger = `<script>
						const	loaded = event => {
												removeEventListener('message', loaded),
												postMessage(
													{
														signature: '${signature}',
														values:	(${Composer.getNodesValue.toString().replace(new RegExp(`^${Composer.getNodesValue.name}`), 'function')})
																		(document.querySelectorAll('${selector}'), ${JSON.stringify(propertyName)}, ${JSON.stringify(rxSrc || null)})
													},
													'${location.origin}'
												)
											};
						addEventListener('DOMContentLoaded', loaded);
					</script>`,
				promise = new Promise (rs => resolver = rs),
				received = message => message.data?.signature === signature && (
						iframe.contentWindow.removeEventListener('message', received),
						iframe.remove(),
						values.push(...message.data.values),
						resolver(values)
					),
				loaded = event => (
						iframe.removeEventListener(event.type, loaded),
						iframe.contentWindow.addEventListener('message', received)
					);
		
		iframe.addEventListener('load', loaded),
		iframe.srcdoc = html + messenger,
		document.body.appendChild(iframe);
		
		return promise;
		
	}
	static getNodesValue(nodes = [], propertyName = [ 'innerHTML' ], rxSrc, values = []) {
		
		const	l = nodes.length,
				requiresAttr = typeof propertyName === 'string',
				pl = propertyName?.length,
				rx = rxSrc && new RegExp(rxSrc);
		let i,i0, vl, v;
		
		if (!l || !(requiresAttr || pl)) return values;
		
		i = -1, vl = values.length - 1;
		
		if (requiresAttr) {
			
			while (++i < l) values[++vl] = nodes[i].getAttribute(propertyName) || '';
			
		} else if (propertyName[0] === 'style') {
			
			while (++i < l) values[++vl] = nodes[i].style.getPropertyValue(propertyName?.[1]) || '';
		
		} else {
		
			while (++i < l) {
				
				i0 = -1, v = nodes[i];
				while (++i0 < pl && (v = v[propertyName[i0]]) && typeof v === 'object');
				values[++vl] = v;
				
			}
			
		}
		
		if (rx) {
			
			i = -1, vl = values.length;
			while (++i < vl) values[i] = rx.exec(values[i])?.[0] || '';
			
		}
		
		return values;
		
	}
	
	// 第一引数 targets に指定された要素を第二引数 values の対応する位置の要素と結合する。
	// targets の要素数が values よりも多い場合（これはこの関数が想定している唯一の状況だが）、
	// 現在の要素の位置が values の要素数を超過した時点で、values の要素位置は 0 に戻り、targets の後続の要素との結合を続行する。
	// every([ 'a', 'b', 'c' ], [ 'b' ]) であれば戻り値は [ 'ab', 'bb', 'cb' ] である。
	// 内部処理以外の状況での使用は一切想定していないため、例えば targets.length / values.length で余りが出る場合、
	// 出力結果は期待とはかなり異なるものになると思われる。
	static every(targets, values) {
		
		const l = targets.length, l0 = values.length;
		let i;
		
		i = -1;
		while (++i < l) targets[i] += values[i - parseInt(i / l0) * l0];
		
		return targets;
		
	}
	static everyReverse(targets, values) {
		
		const l = values.length, l0 = targets.length, v = [];
		let i;
		
		i = -1;
		while (++i < l) v[i] = targets[i - parseInt(i / l0) * l0] + values[i];
		
		return v;
		
	}
	
	// parts の中に Promise を生成する記述子が含まれる場合、この関数は、合成された文字列を列挙する配列で解決される Promise を返す。
	// そうでない場合は合成された文字列を列挙する配列を返す。
	// 第二引数 promises に真を示す値を指定すると、この関数は常に上記の値で解決する Promise を返す。
	static compose(parts, promises) {
		
		const	composer = Composer.getComposer(parts),
				{ done, value } = composer.next(),
				composed =	done ? value : value instanceof Promise ?
									(promises = false, value.then(() => composer.next().value)) : composer.next().value;
		
		return promises ? Promise.resolve(composed) : composed;
		
	}
	// 第一引数 parts に指定された配列に列挙した記述子に基づいて任意の文字列を任意の数生成し、
	// それを配列に列挙して戻り値にする。
	// 各記述子の詳細については、対応するメソッドの説明を参照。
	// この関数内で処理される記述子に string, number とがある。
	// 要素が string の場合、その文字列はそれ以前に生成されたすべての文字列にそのまま合成される。
	// 要素が number の場合、その数値は、parts 内の数値に対応する位置の記述子を示し、
	// その記述子が生成した、合成前の値を流用する形で、現在までに合成された文字列すべてにそれらの値を改めて合成する。
	// compose([ { from: 0, to: 2 }, 'a', 0 ]) の場合、戻り値は [ '0a0', '1a1', '2a2' ] である。
	// compose([ { from: 0, to: 3 }, { from: 'a', to: 'b' }, 0 ]) の戻り値は、
	// [ '0a0', '0b1', '1a2', '1b3', '2a0', '2b1', '3a2', '3b3' ] だが、
	// この結果を想定しているのでなければ、ボタンの掛違いのように不規則に合成されたこの文字列群に使い道はほとんどないだろう。
	// 第一記述子が四つの文字列を生成、第二記述子が二つの文字列を生成し、それを第一の結果と合成して、計八つの文字列が生成される。
	// 第三記述子は、第一記述子が生成した合成前の四つの文字列をその八つの文字列に機械的に合成する。
	// 第二記述子の時点では二つ間隔で周期していたのが、第三記述子で四つ周期に戻されるため、文字列の組み合わせが網羅的でなくなっている。
	// これはつまり、数値が示す記述子が生成した要素数と、その数値時点での合成された文字列の総数が一致しているかそれ以下で、かつ割り切れる必要があると言うことである。
	// そしてなによりもその二つの状況以外を現状の実装は想定していない。
	// この処理は every を通じて行なわれるため、具体的な実装については同メソッドの説明を参照できる。
	// 想定している処理内容そのものは既存の値の流用以上のものではないが、
	// 使用しなければならない状況は残念ながら比較的多いと思われ、実装がピーキーである点に留意が必要である。
	//
	// 変更予定:
	// 記述子の値が数値だった場合は、単にその数値が示す記述子の値で、他の記述子同様に、それまでに生成された文字列毎にすべて合成する。
	// すべての記述子にプロパティ Strings.sym.every が設定でき、それが真を示す値の時は、その記述子が生成する文字列は、それ以前の文字列と順番に結合され、
	// 数が満たない場合は生成順を 0 に巻き戻して結合を繰り返し、生成文字列がそれまでの文字列の数を超過する場合はそこで結合を終了する。
	// 例えばそれまでに生成した文字列が 0,1,2 で、every を持つ記述子が 0,1 だった場合、合成された文字列は 00,11,20 になる。
	// 同じように、every を持つ記述子が 0,1,2,3 を生成する場合、合成される文字列は 00,11,22 になる。
	static replaceValue(source, target, value) {
		
		if (!source) return source;
		
		const constructor = source.constructor;
		
		if (constructor !== Array || constructor !== Object) return source;
		
		const keys = Object.keys(source), l = keys.length, replaced = constructor === Array ? [] : {};
		let i,k,s;
		
		i = -1;
		while (++i < l)
			replaced[k = keys[i]] = (s = source[k]) === target ? value : Composer.replaceValue(s, target, value);
		
		return source;
		
	}
	static *getComposer(parts) {
		
		let i,i0,l0,i1,l1,pi,pl, p, nodes,propertyName, composed, suppresses, source, resolver, every,backwards;
		const	l = (Array.isArray(parts) ? parts : (parts = [ parts ])).length, URLs = [],
				values = [], snapshots = [], sources = [],
				errored = Symbol(),
				promise = new Promise(rs => resolver = rs),
				promised = (v, promise, snapshot, source) => {
					
					const i = snapshot.indexOf(promise);
					
					i === -1 || (
						v === errored ?	(snapshot.splice(i, 1), source && source.splice(i, 1)) :
												(snapshot[i] = v, source && (source[i] = v))
					),
					++pi === pl && (snapshot.flat(1), source && source.flat(1), resolver());
					
				};
		
		i = -1, pi = pl = 0, composed = [];
		while (++i < l) {
			
			switch (typeof (p = parts[i])) {
				
				case 'object':
				
				if (!p) continue;
				
				if (suppresses = 'suppressed' in p) {
					
					values.push(...Composer.compose([ p.suppressed ]));
					
					break;
					
				}
				
				//if (Array.isArray(p)) {
				//	
				//	i0 = -1, l0 = p.length;
				//	while (++i0 < l0) Composer.concat(Composer.compose(p[i0]), values);
				//	
				//	break;
				//	
				//}
				
				if (Array.isArray(p.v) && p.v[Composer.reflections]) {
					
					i0 = -1, l0 = p.v.length;
					while (++i0 < l0) {
						
						if (p.v[i][Composer.each]) {
							
							i1 = -1, l1 = values.length;
							while (++i1 < l1)
								Composer.replaceValue(p.v[i], Composer.$, values[i]), values[i] = Reflect.apply(...p.v[i]);
							
						} else Composer.replaceValue(p.v[i], Composer.$, values), Reflect.apply(...p.v[i]);
						
					}
					
				} else values[0] = p.v;
				
				//if (p.selector) {
				//	
				//	Composer.select(p.urls, p.selector, p.propertyName, p.rxSrc, p.interval, p.timeout, values);
				//	
				//} else if ('from' in p || 'to' in p || 'value' in p)
				//	Composer.increase(p?.from ?? 0, p?.to ?? 1, p?.value ?? 1, values);
				//
				//Array.isArray(p[Composer.reflections]) && Composer.applyAll(p[Composer.reflections], values);
				
				break;
				
				case 'number':
				
				snapshots[i] = sources[i] = p;
				
				continue;
				
				default: values[0] = p;
				
			}
			
			snapshots[i] = [ ...(suppresses ? values : (sources[i] = [ ...values ])) ],
			
			i0 = -1, l0 = values.length;
			while (++i0 < l0) values[i0] instanceof Promise && (
					++pl,
					values[i0].then(v => v).catch(error => (console.error(error), errored)).then(((promise, ss, src) => v => promised(v, promise, ss, src))(values[i0], snapshots[i], sources[i]))
				);
			
			values.length = 0, suppresses = null;
			
		}
		
		pl && (yield promise),
		
		i = -1;
		while (++i < l) {
			
			if (!(i in sources)) continue;
			
			if (typeof (source = sources[i]) === 'number') {
				
				if (!Array.isArray(source = snapshots[(every = (source = source|0) < 0) ? source * -1 : source])) continue;
				
				every || (source = [ ...source ]);
				
			} else if (parts[i] && typeof parts[i] === 'object') {
				backwards = parts[i][Strings.sym.backwards],
				every = parts[i][Strings.sym.every];
			}
			
			composed = Composer[backwards ? 'everyReverse' : every ? 'every' : 'mix'](composed, source);
			
		}
		
		return composed;
		
	}
	
	// 第一引数 strs に指定された配列内の各要素に、第二引数 values に指定された配列内の要素を合成する。
	static mix(strs, values, container = []) {
		
		const l = (Array.isArray(strs) ? strs.length ? strs : (strs[0] = '', strs) : (strs = [ '' ])).length;
		let i;
		
		i = -1;
		while (++i < l) Composer.generate(strs[i], values, container);
		
		return container;
		
	}
	
	// 第一引数 str に指定された文字列に、第二引数 values に指定された配列内の要素をすべて合成する。
	static generate(str, values, container = []) {
		
		const l = (Array.isArray(values) ? values : (values = [ values ])).length;
		let i, i0 = (Array.isArray(container) ? container : (container = [])).length - 1;
		
		if (l) {
			
			i = -1;
			while (++i < l) container[++i0] = str + values[i];
			
		} else container[++i0] = str;
		
		
		return container;
		
	}
	
}