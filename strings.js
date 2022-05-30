export class Indexer {
	
	static {
		
		this.indexed = Symbol('Indexer.indexed'),
		this.lastIndex = Symbol('Indexer.lastIndex'),
		this.anon = Symbol('Indexer.anon');
		
	}
	
	constructor() {
		
		this.cache = {};
		
	}
	// キャッシュされる値は matchAll の戻り値である配列内の要素をそのまま使う。
	// すべての要素にはプロパティ input があり、これは一致検索の文字列全体を示す。
	// つまり各要素の input は重複しており、仮にその文字列が非常に巨大だった場合、リソースに負荷を与えることが予想される。
	// このプロパティ input は、現状では（多分）使用していないため、削除するか、別に一元化してプロパティとして保存しても恐らく問題はないと思われる。
	// ただし、単純に削除した場合、出力から入力を復元することができなくなる点に留意が必要。
	setCache(matched, handler) {
		
		const cache = this.cache, input = matched[0]?.input || Indexer.anon;
		
		if (!(input in cache)) {
			
			const	{ indexed, lastIndex } = Indexer,
					v = (cache[input] = matched)[indexed] = [], l = matched.length, handles = typeof handler === 'function';
			let i,i0, m;
			
			i = i0 = -1;
			while (++i < l)	(m = matched[i]).captor = this,
									(!handles || handler(m, i,l)) && ((v[++i0] = m)[lastIndex] = m.index + m[0].length);
			
		}
		
		return cache[input];
		
	}
	getCache(str) {
		
		return this.cache?.[str ?? Indexer.anon];
		
	}
	clearCache() {
		
		const cache = this.cache;
		let k;
		
		for (k in cache) delete cache[k];
		
	}
	
}
export class Unit extends Indexer {
	
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
			rx = new RegExp((rx?.unescapes ? rx?.pattern: Unit.escapeRegExpPattern(rx.pattern)) ?? Unit.unit, flags)
		);
		
		if (!rx.global) throw new TypeError('RegExp must be global.');
		
		return rx;
		
	}
	static {
		// https://qiita.com/HMMNRST/items/4b10dfb621a469034257#-%E5%90%A6%E5%AE%9A%E5%85%88%E8%AA%AD%E3%81%BF
		this.unit = /(?!)/g,
		this.flags = 'g';
	}
	
	constructor(unit, flags) {
		
		super(),
		
		this.setUnit(unit, flags);
		
	}
	
	setUnit(unit, flags) {
		
		const last = this.unit;
		
		unit = unit instanceof Unit ? unit.unit : Unit.createRegExpG(unit, flags);
		
		(last instanceof RegExp ? last.flags === unit.flags && last.source === unit.source : last !== unit) &&
			this.clearCache();
		
		return this.unit = unit;
		
	}
	
}
export class Word {
	
	static w = Symbol('Word.w');
	
	constuctor(str) {
		
		this.w = str;
		
	}
	
	set w(str) {
		
		// https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
		this[Word.w] = ('' + (str ?? '')).replace(/[.*+?^=!:${}()|[\]\/\\]/g, '\\$&');
		
	}
	get w() {
		
		return this[Word.w] ?? '';
		
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
		
		const matched = this.index(str, true)[Indexer.indexed], l = matched.length, u = this.unit;
		let i,m,lm, replaced;
		
		i = -1, replaced = '';
		while (++i < l) replaced += str.substring(lm ? lm.index + lm[0].length : 0,
			(m = matched[i]).index) + ('sequence' in (lm = m) ? m[0].substring(0, m[0].length / m.sequence) : m[0].replaceAll(u, replacer));
		
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
				seqs = this.seq?.index?.(str, true);
		
		if (!seqs) return this.setCache(matched);
		
		const seqLastIndices = [], lastIndex = Indexer.lastIndex, l = seqs.length;
		let i,i0,seq;
		
		i = i0 = -1;
		while (++i < l) lastIndex in (seq = seqs[i]) && (seqLastIndices[++i0] = seq[lastIndex]);
		//hi(str,this.unit.source,this,matched,seqLastIndices);
		return this.setCache(matched, m => seqLastIndices.indexOf(m.index) === -1);
		
	}
	
	// str の中から、インスタンスのプロパティ unit に一致する文字列が、masks が示す文字列範囲外に存在するかどうかを真偽値で返す。
	// Chr.prototype.index に少し似ているが、文字列の一致の確認だけ目的の場合、
	// index はこのメソッドと比べて冗長で不要な情報を多く含んだ戻り値を作成する。
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
				unmasked = data.unmasked = matched && [ ...matched[Indexer.indexed] ],
				l = unmasked?.length,
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
	split(str, limit = Infinity, ...masks) {
		
		const separators = this.mask(str, ...masks).unmasked, l = separators.length, splitted = [];
		let i,i0, cursor,idx,separator;
		
		i = i0 = -1, cursor = 0, Number.isNaN(--limit|0) && (limit = Infinity);
		while (++i < l && i0 < limit)	splitted[++i0] = str.substring(cursor, idx = (separator = separators[i]).index),
												cursor = idx + separator[0].length;
		splitted[++i0] = str.substring(cursor);
		
		return splitted;
		
	}
	replace(str, replacer, ...masks) {
		
		return this.split(str, undefined, ...masks).join(replacer);
		
	}
	
	clone(seq) {
		
		const { unit, matchesEmpty } = this;
		
		return new Chr(
				{ pattern: unit.source, flags: unit.flags, unescapes: true },
				(seq = arguments.length ? seq : this.seq) instanceof Sequence ?
					{ pattern: seq.unit.source, flags: seq.unit.flags, repetition: seq.repetition, unescapes: true } : null,
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
	
	static {
		
		this.callback = Symbol('Term.callback'),
		this.noCallback = Symbol('Term.noCallback'),
		this.binds = Symbol('Term.binds'),
		this.deletes = Symbol('Term.deletes'),
		this.splices = Symbol('Term.splices'),
		this.clones = Symbol('Term.clones'),
		
		this.escSeq = '\\';
		
	}
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
	static plot(str, detail, self, ...masks) {
		
		if (!(str += '')) return [ str ];
		
		const ml = (masks = masks.flat(1)).length;
		
		if (!ml) return [ str ];
		
		const sl = str.length, result = [], max = Math.max, { callback, deletes, splices } = Term;
		let i,i0,l0,v, mask,sub,cursor, term,cb;
		
		i = i0 = -1, cursor = 0, masks.sort(Term.sortLoc);
		while (++i < ml) {
			cursor <= (mask = masks[i]).lo && (
				(sub = str.substring(cursor, max(mask.lo, 0))) && (result[++i0] = sub),
				cursor = mask.ro,
				v = (term = mask.captor).hasOwnProperty(callback) ?
					typeof (cb = term[callback]) === 'function' ? cb(mask, masks, str, detail, self) : cb : mask,
				v === deletes ||
					(Array.isArray(v) && v[splices] ? v.length && (i0 = result.push(...v) - 1) : (result[++i0] = v))
				//(v = typeof (cb = mask.captor[callback]) === 'function' ? cb(mask, masks, str, detail, self) : mask) === deletes || (Array.isArray(v) && v[splices] ? v.length && (i0 = result.push(...v) - 1) : (result[++i0] = v))
			);
			if (mask.ro >= sl) break;
		}
		
		cursor <= sl - 1 && (result[++i0] = str.substring(cursor));
		
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
	setCallback(cb, thisArg = this) {
		
		const { callback, noCallback, binds } = Term;
		
		typeof cb === 'function' && ((cb = [ cb ])[binds] = true),
		
		cb = Array.isArray(cb) && cb[binds] ?
			typeof cb[0] === 'function' ? cb[0].bind(cb?.[1] ?? thisArg, ...cb.slice(2)) : noCallback : cb,
		
		cb === noCallback ? delete this[callback] : (this[callback] = cb);
		
		return this[Term.callback];
		
	}
	plot(str, detail, self = this, ...additionalMasks) {
		
		return (str += '') ? Term.plot(str, detail, this, ...this.locate(str).completed, ...additionalMasks) : [ str ];
		
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
							(this[a0] = (a1 ||= fallback) instanceof Chr ? a1 : new Chr(a1, this.escSeq));
		
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
	
	split(str, limit, separator) {
		
		return separator.split(str, limit, ...this.locate(str).completed);
		
	}
	
	getEscs() {
		
		const l = this.length, escs = new Set();
		let i, esc;
		
		i = -1;
		while (++i < l) (esc = this.chr(i)?.seq) instanceof Sequence && escs.add(esc);
		
		return escs;
		
	}
	clone(escSeq = this.escSeq, callback, thisArg) {
		
		const l = this.length, clone = new Term(), hasCallback = typeof callback === 'function', cb = Term.callback;
		let i, source, chr;
		
		i = -1, clone.setDefaultEscSeq(escSeq);
		while (++i < l)	chr = clone.chr(i, (source = this.chr(i)).clone(null)),
								callback === undefined || chr.setCallback(hasCallback ? callback : source[cb], thisArg);
		
		return clone;
		
	}
	
}

// Array を継承し、Term を要素に持つ。
// 要素の Term が示す文字列の位置情報を特定するメソッド Terms.prototype.getMasks を提供する。
// 取得した位置情報は Term.plot などで使用する。
// Term は汎用性を意識しているが、Terms は ParseHelper のサブセット的な存在で、それ単体では意味をなさないプロパティやメソッドは多い。
export class Terms extends Array {
	
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
	
	static {
		
		this.termIndex = Symbol('Terms.termIndex'),
		this.unmasks = Symbol('Terms.unmasks'),
		this.callback = Symbol('Terms.callback'),
		this.deletes = Symbol('Terms.deletes'),
		this.splices = Symbol('Terms.splices');
		
	}
	
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
		
		const l = precedenceDescriptors.length, clones = replacer?.[Term.clones];
		let i,ti, pd, term,replaces, callback, sym;
		
		i = -1, ti = this.length - 1,
		esc = esc instanceof Sequence ? esc : typeof esc === 'string' ? new Sequence(esc) : null,
		replacer || typeof replacer === 'object' || (replacer = undefined);
		while (++i < l) {
			
			if (!('name' in (pd = precedenceDescriptors[i]) && 'term' in pd)) continue;
			
			if (Array.isArray(pd)) {
				
				this[++ti] = this.setByPrecedence(pd, esc, defaultThis, replacer, []);
				
			} else if (pd && typeof pd === 'object') {
				
				term = this[++ti] = this[typeof pd.name === 'symbol' ? pd.name : Symbol(pd.name)] =
					(term = replacer && (replaces = pd.name in replacer) ? replacer[pd.name] : pd.term) instanceof Term ?
						replaces && clones ? term.clone('esc' in pd ? pd.esc : esc) : term : new Term(term, 'esc' in pd ? pd.esc : esc),
				
				'callback' in pd && term.setCallback(pd.callback, this),
				
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
	
	split(str, limit, separator) {
		
		return separator.split(str, limit, ...this.getMasks(str).masks);
		
	}
	
	plot(str, detail, ...additionalMasks) {
		
		return (str += '') ? Term.plot(str, detail, this, ...this.getMasks(str).masks, ...additionalMasks) : [ str ];
		
	}
	
	getEscs() {
		
		const l = this.length, escs = new Set();
		let i,v, term,escs0;
		
		i = -1;
		while (++i < l)	if (
									escs0 =	(term = this[i]).constructor === Array ? this.getEscs.apply(term) :
												term instanceof Terms ? term.getEscs() :
										 		term instanceof Term && term.getEscs()
								) for (v of escs0) escs.add(v);
		
		return escs;
		
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
		
		this.escOwners = Symbol('ParseHelper.escOwners'),
		this.syntaxError = Symbol('ParseHelper.syntaxError');
		
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
					'hierarchy',
					
					'isPrecedence'
					
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
	*getParser(str, detail = {}, plot = this.plot(str, detail) || []) {
		
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
		
		(v = yield parsed) && (parsed = v),
		
		yield this.safeReturn(
						typeof this[after] === 'function' ?
							this[after](parsed, parsed.length, plot, plot.length, str, detail, this) : parsed
					);
		
	}
	
	fetchEscs() {
		
		const owners = this[ParseHelper.escOwners] || [], l = owners.length + 1, escs = new Set();
		let i,v,o;
		
		i = -1, owners[l - 1] = this;
		while (++i < l) {
			if ((o = owners[i]) instanceof Chr) o.seq instanceof Sequence && escs.add(o.seq);
			else if (o !== this && o instanceof ParseHelper) for (v of o.fetchEscs()) escs.add(v);
			else if (o instanceof Terms) for (v of o.getEscs()) escs.add(v);
			else if (o instanceof Term) for (v of o.getEscs()) escs.add(v);
		}
		
		return escs;
		
	}
	
}

export class Strings {
	
	static {
		
		this.options = {
			
			dup(numbers, separator) {
				
				this[Composer.repetition] = Number.isNaN(numbers = +numbers|0) ? 1 : Math.max(numbers, 0),
				this[Composer.separator] = separator;
				
			}
			
		}
		
		
	}
	
	constructor(param, sp, exp, desc) {
		
		sp = this.sp = sp instanceof StringsParser ? sp : new StringsParser(sp);
		
		const	sps = StringsParser[ParseHelper.symbol], es = StringsExpression[ParseHelper.symbol];
		
		this.exp = exp instanceof StringsExpression ?	exp :
																		new StringsExpression({
																			replacer: {
																				[Term.clones]: true,
																				[es.str]: this.sp[sps.str],
																				[es.ref]: this.sp[sps.ref],
																				[es.nst]: this.sp[sps.nst],
																				[es.evl]: this.sp[sps.evl]
																			}
																		}),
		
		this.optionsSeparator = new Chr(/[\s\t]+/g),
		this.optionsMasks = this.exp[es.grp],
		
		this.desc = desc instanceof StringsDescriptor ? desc : new StringsDescriptor(),
		
		this.assigned = {},
		this.unlabels = [];
		
	}
	
	get(str, assigned = this.assigned) {
		
		(assigned && typeof assigned === 'object') || (assigned = { [StringsExpression.anonAssignKey]: assigned });
		
		const	parameters = this.sp.get(str, assigned), pl = parameters.length, esc = this.sp.esc,
				spNests = StringsParser.nests,
				{ evaluates, refers } = StringsParser,
				{ nests, anonAssignKey } = StringsExpression,
				syntaxError = ParseHelper.syntaxError;
		let i,i0,l0,v,k, p, opts,optsAssigned;
		
		i = -1;
		while (++i < pl) {
			
			if (!(p = parameters[i]) || typeof p !== 'object') continue;
			
			if (p instanceof String) {
				
				parameters[i] = {
					v:	p[spNests] ? this.get(p, assigned) :
						p[evaluates] ? StringsExpression.getExecutor(p, 'assigned')?.(assigned) :
						p[refers] ?  (p += '', p ||= anonAssignKey) in assigned ? assigned[p] :
							p in assigned[StringsParser.assignedIndex] ? assigned[assigned[StringsParser.assignedIndex][p]] :
							'' :
						''+p
				};
				continue;
				
			}
			
			p.muted && (p = p.muted);
			
			if (Array.isArray(opts = p.options)) {
				
				i0 = -1, l0 = opts.length;
				while (++i0 < l0) {
					
					if (Array.isArray(opts[i0]) && ((opts[i0] = this.parseArgs(opts[i0], assigned)) === syntaxError)) {
						parameters[i] = p.source;
						break;
					}
					
				}
				if (i0 < l0) continue;
				
			}
			
			if (opts = p.options) {
				
				optsAssigned = {};
				for (k in Strings.options)
					typeof Strings.options[k] === 'function' && (optsAssigned[k] = Strings.options[k].bind(p));
				optsAssigned = { ...assigned, ...optsAssigned };
				i0 = -1,
				l0 = (opts = this.optionsSeparator.split(opts, undefined, this.optionsMasks.locate(opts).completed)).length;
				while (++i0 < l0) this.evaluate(opts[i0], optsAssigned);
				
			}
			
			p.args &&= this.evaluate(p.args, assigned),
			
			p.v = this.desc.get(p, assigned),
			
			p.label !== null && assigned && typeof assigned === 'object' && (assigned[p.label || anonAssignKey] = p.v);
			
		}
		
		//hi(parameters);
		
		const	composed = Composer.compose(parameters),
				cl = composed.length,
				escs = new Set([ ...this.sp.fetchEscs(), ...this.exp.fetchEscs(), this.optionsSeparator.seq, this.optionsMasks.seq ]);
		
		for (v of escs) {
			if (!v) continue;
			i = -1;
			while (++i < cl) composed[i] = v.replace(composed[i]);
		}
		
		return composed;
		
	}
	
	register(descriptor, describe) {
		
		this.desc.register(...arguments);
		
	}
	
	evaluate(argStr, assigned) {
		
		const	args = this.exp.get(argStr, assigned), l = args.length,
				{ nests } = StringsExpression, { syntaxError } = ParseHelper;
		let i, arg;
		
		i = -1;
		while (++i < l && (arg = args[i]) !== syntaxError) arg?.[nests] && (args[i] = this.get(arg, assigned));
		
		return i === l ? args : syntaxError;
		
	}
	
}

export class StringsParser extends ParseHelper {
	
	static {
		
		this.assignedIndex = Symbol('StringsParser.assignedIndex'),
		//this.optionName = Symbol('StringsParser.optionName'),
		this.nests = Symbol('StringsParser.nests'),
		this.evaluates = Symbol('StringsParser.evaluates'),
		this.refers = Symbol('StringsParser.refers'),
		
		// esc = escape
		this[ParseHelper.esc] = '\\',
		
		// str = string, nst = nest, ref = reference, blk = block
		this[ParseHelper.symbolNames] = [
			'str', 'nst',
			'ref', 'syx', 'sys', 'syl',
			're', 'evl', 'fnc', 'dom', 'amp', 'frk', 'ech', 'clc',
			'backwards', 'every'
		],
		
		(this.syx = {
			str: [ "'", "'" ],
			nest: [ '<', '>' ],
			evl: [ '`', '`' ],
			ref: [ '$[', ']' ],
			l: '[',
			r: ']',
			assign: '=',
			mute: ';',
			separator: ':',
			disable: '!',
			comma: new Chr(/[\n\s\t]*,[\n\s\t]*/g),
			//space: new Chr(/[\n\s\t]+/g)
		}).assignment =
			new Chr(new RegExp(`[${Unit.escapeRegExpPattern(this.syx.mute + this.syx.separator + this.syx.disable)}]`, 'g'));
		
		const	s = ParseHelper.setSymbols(this),
				{ str,nest,evl,ref,arg, l, r, assign, mute, separator, disable } = this.syx,
				assignment = this.syx.assignment;
		
		this[ParseHelper.precedenceDescriptors] = [
			{ name: s.str, term: str, unmasks: true },
			//{ name: s.arg, term: arg, unmasks: true },
			{ name: s.ref, term: ref, callback: StringsParser.reference },
			{ name: s.syx, term: [ l, r ], callback: StringsParser.parse },
			{ name: s.nst, term: nest, callback: StringsParser.nest },
			{ name: s.evl, term: evl, callback: StringsParser.evl },
		],
		
		this.parameterPrecedence = [
			{ name: s.str, term: str, esc: null, unmasks: true },
			{ name: s.ref, term: ref, esc: null, unmasks: true },
			{ name: s.nst, term: nest, esc: null, unmasks: true },
			{ name: s.evl, term: evl, esc: null, unmasks: true },
			//{ name: s.arg, term: arg, esc: null, unmasks: true },
			{ name: s.syx, term: [ l, r ], esc: null, unmasks: true },
			// sys = syntax short, syl = syntax long
			{ name: s.sys, term: [ /^/g, assignment, /$/g ], esc: null },
			{ name: s.syl, term: [ /^/g, assignment, separator, /$/g ], esc: null },
		];
		
	}
	static nest(mask, masks, input, detail, self) {
		
		const v = new String(mask.inners[0]);
		
		v[StringsParser.nests] = true;
		
		return v;
		
	}
	static evl(mask, masks, input, detail, self) {
		
		const v = new String(mask.inners[0]);
		
		v[StringsParser.evaluates] = true;
		
		return v;
		
	}
	static reference(mask, masks, input, detail, self) {
		
		const v = new String(mask.inners[0]);
		
		v[StringsParser.refers] = true;
		
		return v;
		
	}
	static parse(mask, masks, input, detail, self) {
		
		const pm = this.paramMask.getMasks(mask.inners[0]).masks;
		
		const { captor, splitted } = pm[0][0], { symbol, syx } = StringsParser, disable = syx.disable;
		
		if (disable instanceof RegExp ? disable.test(splitted[2][0]) : splitted[2][0] === disable) return '';
		
		const	s = StringsParser[symbol],
				{ optionName, syntaxError } = StringsParser,
				{ assign, comma, mute, space } = syx,
				header = splitted[1].split(assign),
				descriptor = header[0]?.trim?.(),
				label = header.length > 1 ? header?.[1]?.trim?.() : null,
				mutes = mute instanceof RegExp ? mute.test(splitted[2][0]) : splitted[2][0] === mute;
		let i,l, options,opt, args, v;
		
		switch (captor) {
			
			case this.paramMask[s.sys]:
			args = splitted[3];
			break;
			
			case this.paramMask[s.syl]:
			options = splitted[3].trim(), args = splitted[5];
			break;
			
		}
		
		v = { descriptor, label, options, args, source: mask.$ };
		
		return mutes ? { muted: v } : v;
		
	}
	
	constructor(configuration) {
		
		super(configuration, StringsParser);
		
		const s = StringsParser[ParseHelper.symbol];
		
		this.paramMask =	new Terms({
									precedence: StringsParser.parameterPrecedence,
									defaultThis: this,
									replacer: {
										[Term.clones]: true,
										[s.str]: this[s.str],
										[s.ref]: this[s.ref],
										[s.nst]: this[s.nst],
										[s.evl]: this[s.evl],
										[s.syx]: this[s.syx]
									}
								}),
		
		this[ParseHelper.escOwners] = [ this.paramMask, StringsParser.syx.comma ];
		
	}
	
	[ParseHelper.before](plot, plotLength, input, detail, self) {
		
		(detail.hasOwnProperty(StringsParser.assignedIndex) && Array.isArray(detail[StringsParser.assignedIndex])) ||
			(detail[StringsParser.assignedIndex] = []);
		
		return ParseHelper.passthrough;
		
	}
	[ParseHelper.main](block, parsed, plot, plotLength, input, detail, self) {
		
		const index = detail[StringsParser.assignedIndex], l = index.length, k = block?.label;
		
		return k && (detail[k] = block), detail[index[l] = Symbol()] = block;
		
	}
	
}

export class StringsExpression extends ParseHelper {

	static group(mask, masks, input, detail, self) {
		
		const v = this.get(mask.inners[0], detail);
		
		v[StringsExpression.isGroup] = true;
		
		return v;
		
	}
	static eval(mask, masks, input, detail, self) {
		
		return StringsExpression.getExecutor(mask.inners[0], 'assigned')(detail);
		
	}
	static getExecutor(code, ...argNames) {
		
		return new Function(...argNames, code);
		
	}
	// nest のような外部のオブジェクトにバイパスするような機能は、実装が煩雑だが register 的なメソッドを作って動的に任意登録できるような形にすべき。
	static nest(mask, masks, input, detail, self) {
		
		let v;
		
		(v = new String(mask.inners[0]))[StringsExpression.nests] = true;
		
		return v;
		
	}
	static number(mask, masks, input, detail, self) {
		
		return +mask.$;
		
	}
	static string(mask, masks, input, detail, self) {
		
		//return new String(mask.inners[0]);
		return ''+mask.inners[0];
		
	}
	static identify(mask, masks, input, detail, self) {
		
		const k = (mask.capture === this[StringsExpression[ParseHelper.symbol].ref] ? mask.inners[0] : mask.$) ||
			StringsExpression.anonAssignKey;
		
		return detail && typeof detail === 'object' ? k in detail ? detail[k] : undefined : undefined;
		
	}
	
	static add(v, left, right, idx, ldx, rdx, exp, parsed, parsedLength, plot, plotLength, input, detail, self) {
		
		const { bound, splices } = StringsExpression;
		
		(v =	[
					idx - (idx - ldx),
					rdx - ldx + 1,
					left === bound ? right === bound ? null : +right : right === bound ? left : left + right
				])[splices] = true;
		
		return v;
		
	}
	static sub(v, left, right, idx, ldx, rdx, exp, parsed, parsedLength, plot, plotLength, input, detail, self) {
		
		const { bound, splices } = StringsExpression;
		
		(v =	[
					idx - (idx - ldx),
					rdx - ldx + 1,
					left === bound ? right === bound ? null : -right : right === bound ? left : left - right
				])[splices] = true;
		
		return v;
		
	}
	static div(v, left, right, idx, ldx, rdx, exp, parsed, parsedLength, plot, plotLength, input, detail, self) {
		
		const { bound, splices } = StringsExpression;
		
		(v =	[
					idx - (idx - ldx),
					rdx - ldx + 1,
					left === bound ? right === bound ? null : right : right === bound ? left : left / right
				])[splices] = true;
		
		return v;
		
	}
	static mul(v, left, right, idx, ldx, rdx, exp, parsed, parsedLength, plot, plotLength, input, detail, self) {
		
		const { bound, splices } = StringsExpression;
		
		(v =	[
					idx - (idx - ldx),
					rdx - ldx + 1,
					left === bound ? right === bound ? null : right : right === bound ? left : left * right
				])[splices] = true;
		
		return v;
		
	}
	
	static {
		
		this.anonAssignKey = Symbol('StringsExpression.anonAssignKey'),
		this.bound = Symbol('StringsExpression.bound'),
		this.cursor = Symbol('StringsExpression.cursor'),
		this.isGroup = Symbol('StringsExpression.isGroup'),
		this.nests = Symbol('StringsExpression.nests'),
		this.splices = Symbol('StringsExpression.splices'),
		
		this[ParseHelper.symbolNames] = [
			'add',
			'cmm',
			'div',
			'evl',
			'gi',
			'grp',
			'hu',
			'idt',
			'nai',
			'nst',
			'num',
			'mul',
			'ref',
			'shin',
			'spc',
			'str',
			'sub',
		];
		
		const	{
					add,
					cmm,
					div,
					evl,
					gi,
					grp,
					hu,
					idt,
					mul,
					nai,
					nst,
					num,
					ref,
					shin,
					spc,
					str,
					sub
				} = ParseHelper.setSymbols(this);
		
		this.opsPrecedence = [
			{ sym: div, callback: StringsExpression.div },
			{ sym: mul, callback: StringsExpression.mul },
			{ sym: sub, callback: StringsExpression.sub },
			{ sym: add, callback: StringsExpression.add }
		],
		
		this[ParseHelper.precedenceDescriptors] = [
			
			{ name: str, term: [ "'", "'" ], callback: StringsExpression.string },
			{ name: evl, term: [ '`', '`' ], callback: StringsExpression.eval },
			{ name: nst, term: [ '<', '>' ], callback: StringsExpression.nest },
			{ name: grp, term: [ '(', ')' ], callback: StringsExpression.group },
			{ name: ref, term: [ '$[', ']' ], callback: StringsExpression.identify },
			{ name: num, term: [ /(-?(\d+(?:\.\d+)?|Infinity)|NaN)/g ], callback: StringsExpression.number },
			{ name: nai, term: [ /(?:nai|null)/g ], callback: null },
			{ name: hu, term: [ /(hu|undefined)/g ], callback: undefined },
			{ name: shin, term: [ /(shin|true)/g ], callback: true },
			{ name: gi, term: [ /(gi|false)/g ], callback: false },
			{ name: idt, term: [ /[$A-Za-z_\u0080-\uFFFF][$\w\u0080-\uFFFF]*/g ], callback: StringsExpression.identify },
			{ name: cmm, term: [ ',' ], callback: cmm },
			{ name: div, term: [ '/' ], callback: div },
			{ name: mul, term: [ '*' ], callback: mul },
			{ name: sub, term: [ '-' ], callback: sub },
			{ name: add, term: [ '+' ], callback: add },
			{ name: spc, term: [ /[\n\s\t]+/g ], callback: Term.deletes }
			
		];
		
	}
	
	constructor(configuration) {
		
		super(configuration, StringsExpression);
		
		this[ParseHelper.escOwners] = []
		
	}
	
	express(exp, args) {
		
		const	{ bound, cursor, isGroup, nests, opsPrecedence, splices } = StringsExpression,
				ol = opsPrecedence.length,
				splice = Array.prototype.splice,
				{ cmm } = StringsExpression[ParseHelper.symbol];
		let i,l,i0, x,x0, xl,xl0, op,v, li,ri, spliceArgsLength, sym,cb,hasCb;
		
		xl = exp.length;
		
		if (exp[0]?.[nests]) return xl === 1 ?
			exp[0] : (console.error(new SyntaxError('Nesting value must be specified alone.')), ParseHelper.syntaxError);
		
		i = xl;
		while (--i > -1) {
			typeof (x = exp[i]) === 'function' ?
				i += 2 :
				Array.isArray(x) && (
						typeof (x0 = exp[i0 = i - 1]) === 'function' ?
								(exp.splice(i0, 2, x0(...x)), --xl) :
								x[isGroup] ? (l = x.length) ? (exp[i++] = x[l - 1]) : undefined : x
					)
		}
		
		i = -1, xl0 = xl - 1;
		while (++i < ol) {
			
			sym = (op = opsPrecedence[i]).sym, cb = op.callback;
			while ((i0 = exp.indexOf(sym)) !== -1)
					v =	cb(
								exp[li = i0],
								i0 ? exp[--li] : bound,
								(ri = i0 + 1) === xl ? bound : exp[ri],
								i0, li, ri,
								exp, ...args
							),
					v?.[splices] &&	(
												splice.call(exp, ...v),
												i0 = (v[0] + (spliceArgsLength = v.slice(2).length)) - 1,
												xl0 = (xl -= v[1] - spliceArgsLength) - 1
											),
					v?.[cursor] &&	(i += v[cursor]);
			
		}
		
		return xl === 1 ? exp[0] : (console.error(new SyntaxError('Failed to parse an agument.')), ParseHelper.syntaxError);
		
	}
	[ParseHelper.after](parsed, parsedLength, plot, plotLength, input, detail, self) {
		
		if (parsed.indexOf(ParseHelper.syntaxError) !== -1) return ParseHelper.syntaxError;
		
		const { cmm } = StringsExpression[ParseHelper.symbol];
		let startIndex, lastIndex, splicedLength;
		
		// 各種位置を決める流れが正確に把握できていないため、問題が起きた場合はここを確認する。
		// 現状トライアンドエラーの結果、とりあえず動作要件を満たしたものを採用している。
		startIndex = 0;
		while (startIndex < parsedLength)	parsed.splice(
																startIndex,
																splicedLength = ((lastIndex = parsed.indexOf(cmm, startIndex)) === -1 ? (lastIndex = parsedLength) : lastIndex + 1) - startIndex,
																this.express(parsed.slice(startIndex, lastIndex), arguments)
															),
														parsedLength -= --splicedLength,
														startIndex = lastIndex - splicedLength + 1;
		
		return parsed;
		
	}
	
}

export class StringsDescriptor {
	
	static {
		
		this.deletes = Symbol('StringsDescriptor.deletes'),
		this.reflects = Symbol('StringsDescriptor.reflects'),
		this.variadic = Symbol('StringsDescriptor.variadic');
		
	}
	
	constructor() {
		
		this.descriptor = {},
		
		arguments.length && this.register(...arguments);
		
	}
	
	get(parameter, assigned, property) {
		
		const	descriptor = this.descriptor[parameter.descriptor || 'I'], { variadic } = StringsDescriptor;
		let v;
		
		if (Array.isArray(descriptor) && descriptor[StringsDescriptor.reflects] && typeof descriptor[0] === 'function') {
			
			const l = descriptor[0][variadic] ? parameter.args.length : descriptor[0].length, args = [];
			let i;
			
			i = -1;
			while (++i < l) args[i] = parameter.args[i];
			
			v = Reflect.apply(
					descriptor[0],
					descriptor[1],
					descriptor[2]?.length ? [ ...descriptor[2], ...args ] : [ ...args ]
				);
			
		} else v = descriptor;
		
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
			((this.descriptor[name] = callback)[StringsDescriptor.reflects] = true);
		
	}
	
}

const strings = new Strings();
export default strings.get.bind(strings);
class Counter {
	
	static describe(from, to, value, pad, padString, parameter, assigned) {
		
		// 以下の this は、Composer で実行する時に、 Composer.exec in this で真を示す時に this[Composer.exec] に置き換えられる。
		// 上の記述は謎だが、Composer.$ は、実行時に、生成する文字列を列挙する Array に置換される。
		const reflections = [ [ this.count, Composer.$, [ from, to, value ] ] ];
		
		reflections[Composer.reflections] = true,
		
		Number.isNaN(typeof (pad = parseInt(pad))) || !pad ||
			(reflections[1] = [ String.prototype[pad > 0 ? 'padStart' : 'padEnd'], Composer.$, [ Math.abs(pad), padString ] ]);
		
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
		
		return Composer.noReturnValue;
		
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
	static describe(eachElement, method, target, ...args) {
		
		const { $, each, reflections } = Composer, reflector = [], reflectors = [ reflector ];
		
		reflector[0] = method || 'toString',
		reflector[1] = target ?? $,
		reflector[2] = args,
		
		(eachElement || reflector[1] === $) && (reflector[each] = reflector[1] === $),
		reflectors[reflections] = true;
		
		return reflectors;
		
	}
	static {
		
		this.describe[StringsDescriptor.variadic] = true;
		
	}
	
}
strings.register([ '@', 'app' ], [ Reflector.describe, Reflector, [ false ] ]),
strings.register([ '@@', 'apps' ], [ Reflector.describe, Reflector, [ true ] ]);

class Inline {
	
	static describe() {
		
		const l = arguments.length;
		
		return l ? l === 1 ? arguments[0] ?? '' : [ ...arguments ] : '';
		
	}
	static {
		
		this.describe[StringsDescriptor.variadic] = true;
		
	}
	
}
strings.register([ 'I' ], [ Inline.describe, Inline ]);

class Duplicator {
	
	static describe(strings, numbers, separator) {
		
		const	reflections = [ [ Duplicator.duplicate, Composer.$, [ strings, numbers, separator ] ] ];
		
		reflections[Composer.reflections] = true;
		
		return reflections;
		
	}
	
	static duplicate(strings, numbers, separator) {
		
		this.push(...strings), this[Composer.repetition] = numbers, this[Composer.separator] = separator;
		
		return Composer.noReturnValue;
		
	}
	
}
strings.register([ '^', 'dup' ], [ Duplicator.describe, Duplicator ]);

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
		this.each = Symbol('Composer.each'),
		this.noReturnValue = Symbol('Composer.noReturnValue'),
		
		this.muted = Symbol('Composer.muted'),
		
		this.rejectedPromise = Symbol('Composer.rejectedPromise'),
		
		this.valuesOptions = [
			this.repetition = Symbol('Composer.repetition'),
			this.separator = Symbol('Composer.separator'),
		];
		
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
		
		if (constructor !== Array && constructor !== Object) return source;
		
		const keys = Object.keys(source), l = keys.length, replaced = constructor === Array ? [] : {};
		let i,k,s;
		
		i = -1;
		while (++i < l)
			replaced[k = keys[i]] = (s = source[k]) === target ? value : Composer.replaceValue(s, target, value);
		
		return replaced;
		
	}
	static *getComposer(parts) {
		
		let	i,i0,l0,i1,l1,pi,pl, p, v,
				composed, mutes, source, resolver, every,backwards, compose, values, method;
		const	l = (Array.isArray(parts) ? parts : (parts = [ parts ])).length,
				snapshots = [], sources = [],
				{ reflect, reflections, rejectedPromise, repetition, selectiveCopyProperties, separator, valuesOptions } =
					this,
				{ isNaN } = Number,
				{ max } = Math,
				{ isArray } = Array,
				promise = new Promise(rs => resolver = rs),
				promised = (v, promise, snapshot, source) => {
					
					const i = snapshot.indexOf(promise);
					
					i === -1 || (
						v === rejectedPromise ?	(snapshot.splice(i, 1), source && source.splice(i, 1)) :
														(snapshot[i] = v, source && (source[i] = v))
					),
					++pi === pl && (
							v = snapshot.flat(1), snapshot.length = 0, snapshot.push(...v),
							source && (v = source.flat(1), source.length = 0, source.push(...v)),
							resolver()
						);
					
				};
		
		i = -1, pi = pl = 0, composed = [];
		while (++i < l) {
			
			values ||= [];
			
			switch (typeof (p = parts[i])) {
				
				case 'object': case 'undefined':
				
				if (!p) continue;
				
				(mutes = 'muted' in p) ?
					values.push(...Composer.compose([ p.muted ])) :
					(
						isArray(v = p.v) ? v[reflections] ? reflect(v, values) : values.push(...v) : (values[0] = v),
						selectiveCopyProperties(values, p, valuesOptions)
					);
				
				break;
				
				case 'number':
				
				isNaN(p = p|0) || (p < 0 ? (p = l - p) < 0 : p >= l) || p === i || (snapshots[i] = sources[i] = p);
				
				continue;
				
				default: values[0] = p;
				
			}
			
			selectiveCopyProperties(snapshots[i] = mutes ? values : [ ...(sources[i] = values) ], values, valuesOptions),
			
			i0 = -1, l0 = values.length;
			while (++i0 < l0) (v = values[i0]) instanceof Promise && (
					++pl,
					v.then(v => v).catch(error => (console.error(error), rejectedPromise)).
						then(((promise, ss, src) => v => promised(v, promise, ss, src))(v, snapshots[i], sources[i]))
				);
			
			values = mutes = null;
			
		}
		
		pl && (yield promise),
		
		i = -1;
		while (++i < l) {
			
			if (!(i in sources)) continue;
			
			typeof (source = sources[i]) === 'number' ? 
				isArray(values = snapshots[(every = (source = source|0) < 0) ? source * -1 : source]) &&
					(every || selectiveCopyProperties(source = [ ...values ], values, valuesOptions)) :
				parts[i] && typeof parts[i] === 'object' &&
					(backwards = parts[i].backwards, every = parts[i].every),
			
			i0 = -1, l0 = repetition in source ? isNaN(l0 = +source[repetition]|0) ? 1 : max(l0, 0) : 1,
			compose = Composer[backwards ? 'everyReverse' : every ? 'every' : 'mix'];
			while (++i0 < l0) composed = compose(composed, source, i0 ? source?.[separator] ?? '' : '');
			
		}
		
		return composed;
		
	}
	static reflect(reflections, values) {
		
		const	{ $, each, noReturnValue, replaceValue } = Composer, { iterator } = Symbol, { apply } = Reflect,
				l = reflections.length;
		let i,i0,l0, v,r, method,itr, args;
		
		i = -1;
		while (++i < l) {
			
			if (each in (r = reflections[i])) {
				
				if (r[each]) {
					
					i0 = -1, l0 = values.length;
					while (++i0 < l0)
						v = replaceValue(r, $, values[i0]),
						values[i0] = apply(typeof v[0] === 'function' ? v[0] : v[1][v[0]], v[1], v[2]);
					
				} else if (typeof r?.[1][iterator] === 'function') {
					
					i0 = -1, method = r[0], itr = r[1][iterator](), args = r[2];
					for (v of itr) values[++i0] = apply(typeof method === 'function' ? method : v[method], v, args);
					
				}
				
			} else	v = apply(typeof (v = replaceValue(r, $, values))[0] === 'function' ? v[0] : v[1][v[0]], v[1], v[2]),
						v === noReturnValue || (values[0] = v);
			
		}
		
		return values;
		
	}
	static selectiveCopyProperties(target, source, names) {
		
		const l = names.length;
		let i,k;
		
		i = -1;
		while (++i < l) source.hasOwnProperty(k = names[i]) && (target[k] = source[k]);
		
		return target;
		
	}
	
	// 第一引数 strs に指定された配列内の各要素に、第二引数 values に指定された配列内の要素を合成する。
	static mix(strs, values, separator = '', container = []) {
		
		const l = (Array.isArray(strs) ? strs.length ? strs : (strs[0] = '', strs) : (strs = [ '' ])).length;
		let i;
		
		i = -1;
		while (++i < l) Composer.generate(strs[i], values, separator, container);
		
		return container;
		
	}
	
	// 第一引数 str に指定された文字列に、第二引数 values に指定された配列内の要素をすべて合成する。
	static generate(str, values, separator, container = []) {
		
		const l = (Array.isArray(values) ? values : (values = [ values ])).length;
		let i, i0 = (Array.isArray(container) ? container : (container = [])).length - 1;
		
		if (l) {
			
			i = -1;
			while (++i < l) container[++i0] = str + separator + values[i];
			
		} else container[++i0] = str;
		
		
		return container;
		
	}
	
}