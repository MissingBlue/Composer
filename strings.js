export class Indexer {
	
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
		
		const cache = this.cache, input = matched[0]?.input;
		
		if (!(input in cache)) {
			
			const	cacheData = cache[input] = { indices: [], lastIndices: [], matched },
					{ indices, lastIndices } = cacheData, 
					l = matched.length,
					handles = typeof handler === 'function';
			let i,i0, m;
			
			i = i0 = -1;
			while (++i < l)	(m = matched[i]).captor = this,
									handles && handler(m, i,l, cacheData) &&
										(lastIndices[m.indexed = ++i0] = (indices[i0] = m.index) + m[0].length);
			
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
	static option = 'g';
	// https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
	static escapeRegExpStr(regExpStr) {
		return regExpStr.replace(/[.*+?^=!:${}()|[\]\/\\]/g, '\\$&');
	}
	static createGlobalRegExpFromString(rx = Unit.unit, option = Unit.option) {
		
		return	rx instanceof RegExp ?
						rx.global ? rx : new TypeError('RegExp must be global.') :
						new RegExp(
									Unit.escapeRegExpStr(''+(rx || '')),
									typeof option === 'string' ? option + (option.indexOf('g') === -1 ? 'g' : '') : 'g'
								);
		
	}
	
	constructor(unit, option) {
		
		super(),
		
		this.setUnit(unit, option);
		
	}
	setUnit(unit, option) {
		
		unit = Unit.createGlobalRegExpFromString(unit, option);
		
		const last = this.unit;
		
		(last instanceof RegExp && last.flags === unit.flags && last.source === unit.source) || this.clearCache();
		
		return this.unit = unit;
		
	}
	
}

export class Sequence extends Unit {
	
	static repetition = 2;
	static cacheHandler(match) {
		return !('sequence' in match);
	}
	
	constructor(unit, option, repetition) {
		
		super(unit, option),
		
		this.setRepetition(repetition);
		
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

export class Chr extends Unit {
	
	static unit = '#';
	static seq = '\\';
	
	constructor(unit = Chr.unit, option, seq, seqOption, seqRepetition) {
		
		super(unit, option),
		
		this.init(unit, option, seq, seqOption, seqRepetition);
		
	}
	
	init(unit = Chr.unit, option, seq = Chr.seq, seqOption, seqRepetition) {
		
		if ((this.setUnit(unit, option)).source === this.setSeq(seq, seqOption, seqRepetition).source)
			new Error('The srouce of "unit" and "seq" must be different.');
		
	}
	setSeq(seq, seqOption, seqRepetition) {
		
		return this.seq = seq instanceof Sequence ? seq : new Sequence(seq, seqOption, seqRepetition);
		
	}
	
	index(str) {
		
		if (str in this.cache) return this.cache[str];
		
		const matched = [ ...str.matchAll(this.unit) ], seqLastIndices = this.seq.index(str, true).lastIndices,
				handler = m => seqLastIndices.indexOf(m.index) === -1;
		
		return this.setCache(matched, handler);
		
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
		
		const	data = { ...this.index(str), unmasked: [], masked: [] }, matched = data.matched, l = matched.length,
				unmasked = data.unmasked, l0 = masks.length;
		let i,umi;
		
		i = umi = -1;
		while (++i < l) 'indexed' in matched[i] && (unmasked[++umi] = matched[i]);
		
		if (!l || !l0 || umi++ === -1) return data;
		
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
	
	duplicate() {
		
		return new Chr(this.unit.source, this.unit.flags, this.seq.unit.source, this.seq.unit.flags, this.seq.repetition);
		
	}
	isSame(chr) {
		
		if (!(chr instanceof Chr)) return false;
		
		const u = this.unit, u0 = chr.unit, s = this.seq.unit, s0 = chr.seq.unit;
		
		return u.source === u0.source && u.flags === u0.flags &&
			s.source === s0.source && s.flags === s0.flags && s.repetition === s0.repetition;
	}
	
}

// Array を継承し、自身の要素として設定された任意の数の Chr を通じて、文字列の位置の特定に関する処理を行なうメソッドを提供する。
export class Term extends Array {
	
	static escSeq = '\\';
	static sortLocs(a, b) {
		return a?.[0]?.lo === null ? -1 : b?.[0]?.lo === null ? 1 : a?.[0]?.lo - b?.[0]?.lo;
	}
	static sortLoc(a, b) {
		return a.lo === null ? -1 : b.lo === null ? 1 : a.lo - b.lo;
	}
	// 第一引数 str の中から、第二引数 l と第三引数 r の間にある文字列を特定し、その位置など、それに関する情報を返す。
	// Term.prototype.locate の戻り値を任意の数だけ第四引数 masks 以降に指定すると、
	// l ないし r の位置が masks が示す位置範囲に一致する時は、その l,r の情報を戻り値に含めない。
	static get(str, l, r, ...masks) {
		
		l || (l = r, r = null),
		
		typeof l === 'string' && (l = new Chr(l, undefined, Term.escSeq)),
		r && typeof r === 'string' && (r = new Chr(r, undefined, Term.escSeq));
		
		const lI = l.mask(str, ...masks).unmasked, lL = lI.length, locales = [];
		
		if (!lL) return locales;
		
		const	isSame = r && l.isSame(r), rI = isSame ? lI : (r || l).mask(str, ...masks).unmasked, rL = rI.length;
		
		if (!rL) return locales;
		
		const rShift = isSame ? 2 : 1, localedL = [];
		let i,i0,mi, L,LI, R,RI, locale;
		
		i = -1, mi = -1;
		while ((i += rShift) < rL) {
			i0 = lL, RI = (R = rI[i]).index + (r ? 0 : R[0].length);
			while (--i0 > -1 && ((L = lI[i0]).index + L[0].length > RI || localedL.indexOf(i0) !== -1));
			if (i0 > -1) {
				localedL[++mi] = i0,
				locale = locales[mi] = { l: L, lo: L.index, li: L.index + L[0].length, r: r ? R : R.index, ri: RI, ro: r ? RI + R[0].length : RI },
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
		
		const locs = [];
		let i,i0,l0,li, datum;
		
		i = li = -1;
		while (++i < dl) {
			i0 = -1, l0 = (datum = data[i]).length;
			while (++i0 < l0) locs[++li] = datum[i0];
		}
		
		if (!++li) return [ str ];
		
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
		
		const defaultEscSeq = Array.isArray(chrs[0]) ? chrs[1] : undefined;
		
		super(...(defaultEscSeq ? chrs[0] : chrs)),
		
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
		
		return gets ?	(
								a0 = this[idx] || a1 || fallback) instanceof Chr ?
									a0 :
									(this[idx] = new Chr(a0, undefined, this.escSeq)
							) :
							(
								this[idx] = (a0 ||= fallback) instanceof Chr ?
									a0 :
									new Chr(a0, undefined, this.escSeq)
							);
		
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
				limiter = l / 2|0,
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
		
		i = cli = icli = -1, ci = -1, ++ll;
		while (++i < ll) {
			
			if (!i) {
				
				last = ((locales = [ loc0 = locs.splice(i, 1)[0] ])[li = 0]).ri,
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
						i = -1
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
			
			if (li === limiter) {
				
				completed[++cli] = term, cLocs.push(...locales), i = -1;
				
			} else if (ll && i === ll - 1) {
				
				incomplete[++icli] = term, icLocs.push(...locales), i = -1;
				
			};
			
		}
		
		return result;
		
	}
	
}

// Array を継承し、Term を要素に持つ。
// 要素の Term が示す文字列の位置情報を特定するメソッド Terms.prototype.getMasks を提供する。
// 取得した位置情報は Term.plot などで使用する。
// ほぼ単機能のオブジェクトだが、構文解析の設定としての役割を果たし得る。
export class Terms extends Array {
	
	constructor(...terms) {
		
		super(...terms);
		
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
		
		const l = this.length, named = {};
		let i,mi,ml,mi0,ml0,k,i0,l0, term,t0, currentMasks, result,masks0,named0;
		
		i = -1, mi = masks.length - 1;
		while (++i < l) {
			
			if ((term = this[i]).constructor === Array) {
				
				i0 = -1, l0 = term.length, ml = (currentMasks = [ ...masks ]).length - 1;
				while (++i0 < l0) {
					
					if (!(t0 = (t0 = term[i0]).constructor === Array ? [ t0 ] : t0 && typeof t0 === 'object' && t0)) continue;
					
					mi0 = ml, ml0 = (masks0 = (result = new Terms(t0).getMasks(str, ...currentMasks)).masks).length;
					while (++mi0 < ml0) masks[++mi] = masks0[mi0];
					
					named0 = result.named;
					for (k in named0) named[k] = named0[k];
					
				}
				
				k = undefined;
				
			} else if (term && typeof term === 'object') {
				
				masks[++mi] = (term instanceof Term ? term : (k = term?.name, term.target)).locate(str, ...masks).completed,
				k && (named[k] = hierarchy, k = undefined);
				
			}
			
		}
		
		return { masks, named };
		
	}
	
}

// このオブジェクトを継承する場合、メソッド ParseHelper.protoype.setGrammar を通じて設定を行うことを推奨する。
// setGrammar は、構文記述子を優先順に列挙した配列を指定する。
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
// 	super
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
// 	hierarchy
// 		Term(構文文字)を優先順で列挙した Terms。
// 	super
// 		* 記述子を通じて指定できるように変更したため、このオブジェクト自身のコンストラクターで実装される。
// 		対象文字列内の範囲として認識するが、Term.plot によって要素化されない Term を配列に列挙して指定する。
// 		文字列など、構文の範囲（スコープ）ではなく、それを構成する値の範囲を示す Term を指定することを想定。
// 		プロパティ名の super はこの意味では適切ではないかもしれないが、相応しい名前が思いつかなかったため便宜的に使用。
// メソッド
// 	before
// 	main
// 	after
export class ParseHelper {
	
	static deletes = Symbol();
	static passthrough = Symbol();
	
	constructor() {
		
		this.super = [];
		
	}
	
	setGrammar(grammar, esc, terms = [], map = new Map()) {
		
		const l = (Array.isArray(grammar) ? grammar : [ grammar ]).length;
		let i,ti,si, g, term, callback;
		
		i = ti = si = -1;
		while (++i < l) {
			
			if (Array.isArray(g = grammar[i])) {
				
				this.setGrammar(g, esc, terms[++ti] = [], map);
				
			} else if (g && typeof g === 'object') {
				
				term = terms[++ti] = this[g.name] = g.term instanceof Term ? g.term : new Term(g.term, g?.esc ?? esc),
				(callback = this.getGrammarCallback(g.callback)) && map.set(term, callback),
				g.super && (this.super[++si] = term);
				
			}
			
		}
		
		return terms;
		
	}
	getGrammarCallback(descriptor) {
		
		let handler, scope, args;
		
		typeof descriptor === 'function' ?
			(handler = descriptor, scope = this) :
		descriptor && typeof descriptor === 'object' &&
			(
				handler = descriptor.handler,
				scope = 'scope' in descriptor ? descriptor.scope : this,
				args = Array.isArray(descriptor.args) ? descriptor.args : 'args' in descriptor ? [ descriptor.args ] : []
			);
		
		return handler && (args ? handler.bind(scope, ...args) : handler.bind(scope));
		
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
	*getParser(str, detail = {}) {
		
		const	masks = this.hierarchy.getMasks(str).masks, { deletes, passthrough } = ParseHelper;
		let i,l,i0, v;
		
		if (Array.isArray(this.super)) {
			
			i = -1, l = this.super.length;
			while (++i < l) (i0 = this.hierarchy.indexOf(this.super[i])) === -1 || masks.splice(i0, 1);
			
		}
		
		const plot = Term.plot(str, ...masks), parsed = [];
		
		l = plot.length;
		
		if (typeof this.before === 'function') {
			
			if ((v = this.safeReturn(this.before(plot, l, str, detail, passthrough, this), l = plot.length, v)) !== passthrough) return v;
			
			(v = yield v) && (plot = v);
			
		}
		
		if (typeof this.main === 'function') {
			
			const splice = [];
			let pi;
			
			i = pi = -1, l = plot.length;
			while (++i < l) {
				
				v = this.main(plot[i], parsed, plot, l, str, detail, splice, deletes, this);
				
				if (splice.length) {
					
					pi = parsed.push(...splice) - 1,
					splice.length = 0;
					
				} else if (v === deletes) {
					
					plot.splice(i--,1), --l;
					
				} else {
					
					parsed[++pi] = v;
					
				}
				
			}
			
		} else parsed.push(...plot);
		
		(v = yield parsed) && (parsed = v);
		
		yield this.safeReturn(
						typeof this.after === 'function' ?
							this.after(parsed, parsed.length, plot, l, str, detail, this) : parsed
					);
		
	}
	
}

// todo:
// 	(...) の再帰をほぼ検証していないため動作確認。
// 	dom で外部 HTML を読み込み。（Same origin 限定）
// 	すべての構文で括弧内接頭辞 / に対応。
// 	特定の文字列が存在した場合、全体を文字列ではなく生の値で返す。
//
// 構文に基づいて文字列を生成する。
// 構文にエラーハンドリング等は一切実装しておらず、堅牢性はない。
// エスケープは \\ で行なう。\\(=\) を文字列として使う場合は、\\\\ になる。
// ' を使う構文があるため、解析の対象文字列は " で囲うことを推奨。
//
// '...'
// 	シングルクォーテーションで囲まれた値は常に文字列を示す。
// 	文字列中では構文に使う文字を含め、クォーテーション(",')以外の任意の文字列を通常の JavaScript の文字列と同様 \\ なしで指定できる。
// 	エスケープする際は " は \、' は \\ で行なう。
// [...]
// 	左から順に 開始値,終了値,増加値,字詰め文字,桁数(正の値の場合先頭方向、負の値の場合末尾方向へ字詰めする) を記す。
// 	開始値、終了値には文字列も指定できる。その場合、増加値は開始値のコードポイントに加算される。
// 	例えば ['a','c',1] は 'a' 'b' 'c' を生成する。
// 	終了値が開始値より小さい場合、値は負の方向へ進行する。
// 	増加値は負の値を受け付けるが、値は常に自然数に変換される。
// 	一方で、負の値を指定した場合、仮に出力の末尾が増加値を超えた場合、通常だとその値は出力に含まれないが、末尾を常に終了値で補完する。
// 	この構文は Composer.increase の短絡表現のため、より詳細な説明が必要な場合は同メソッドのコメントを参照できる。
// <...>
// 	第一引数の文字列をセレクターとして、指定されたドキュメント（既定ではスクリプトの実行元）内でそれに一致するすべての要素を選択し、
// 	それらから第二引数に指定された属性名ないしプロパティ名の値で文字列を生成する。第二引数を省略した場合、選択要素の textContent に置き換わる。
// 	第二引数に指定した文字列の先頭に . を付けると、属性名ではなくプロパティ名として認識し、
// 	'.dataset.dummy' のように、以後 .プロパティ名 を連結してネストするプロパティにアクセスできる。
// 	第三引数に正規表現を示す文字列を指定すると、その取得した値からその正規表現に一致する部分を抽出して文字列を生成する。
// 	この正規表現は指定段階では文字列であるため、メタ文字に含まれる \ は \\ としなければならない。
//
// 	第一引数の前に | を置いて、その左側に URL に相当する文字列を指定すると、その URL が示す HTML 文書内から要素の値を取得する。
// 	URL には絶対、相対パスを指定できるが、絶対パスを指定しても同一オリジンポリシーによりリソースが取得できることはないと思われる。
// 	相対パスを指定した場合、このスクリプトの実行パスを基点として、パスが示す同一サーバー内のリソースの取得を試みる。
// 	外部リソースの取り扱いにまつわる様々な制約を回避するために、取得したリソースは実行パス上に追加される <iframe> でインラインで展開される。
// 	これは、リソースが実行元とは異なる階層に存在していて、リソース内に相対パスが含まれる場合、リソースが正常に動作しないことを意味する。
// 	この構文が取得するのは画像などのメディアではなくドキュメント構造上に存在する情報なので、リソースが静的な HTML であれば問題が表面化しないが、
// 	外部リソースの JavaScript などで動的に情報を読み込むページの場合、求める情報を得ることはできないだろう。
// 	このように、HTML や JavaScript に課せられた制約のため、提供される機能が実用に至るケースはそれほど多くないか、ほとんどないと思われる。
// 	URL に指定した文字列は、Strings.prototype.get で再帰的に解析される。
// 	これは例えば機械的に生成された規則的な URL 上のページの情報にアクセスする際に有用となるだろう。
// 	URL を指定する時、URL が不特定多数である場合、第四引数に URL にアクセスする間隔をミリ秒で指定できる
// 	例えば URL が 0.html, 1.html で、第四引数が 500 の場合、0.html を取得後、0.5 秒後に 1.html への要求を開始する。
// 	自然数以外の値、例えば -1 を指定すると、すべての URL に同時平行してアクセスする。
// 	これは URL の数によってはサーバーに損害を与えかねないので、ローカルサーバーに対してなどに対してでなければ決して推奨されない。
// 	この値は、既定では 1000 ミリ秒に設定される。
// 	第五引数はリクエストのタイムアウトを待つ時間で、ミリ秒で指定する。設定した時間内にリクエストが完了しなければ、リクエストは強制的に中断され、
// 	その URL が示す情報は未指定として扱われる。既定では 30000 ミリ秒に設定される。
// 	
// (...)
// 	括弧内のコンマで区切られた値で分岐させる。値間は | で区切る。
// 	この中の値は、Strings.get を再帰して処理される。
// 	そのため、文字列の指定は ' で囲わずに行なう必要がある。
// 	そして再帰されるため、任意の構文を必要に応じて使用することができる。
// 	再帰前にラベル付けした値も再帰先から参照できる。（ただし再帰先で同名のラベルを付けた場合、再帰前の同名ラベルはそのラベルの値で上書きされる）
// ::, ;:
// 	[labeled:: ...] のように、各括弧内の行頭から :: ないし ;: までの間はラベルとして認識される。
// 	ラベルを :: で閉じた場合、その括弧の値はその場で展開されると同時にラベル付けされて記録もされる。
// 	ラベルを ;: で閉じた場合、その括弧の値はラベル付けされて後方参照が可能になるが、その場での展開はされない。
// 	ラベル付けされた値を再利用するには、それより後方で下記構文 *...* を使う。
// 	なお、実際には、すべての構文にラベルが暗黙に割り当てられる。
// 	明示的にラベルを指定していない構文に対しては、ただの文字列も含め、全体の左から数えたその構文の位置が便宜的なラベルになる。
// 	例えば "a(b|c)d*1**2*"の場合、生成される文字列は [ 'abdbd', 'abdcd', 'acdbd', 'acdcd' ] である。
// 	この出力は、明示的にラベル付けした "a(1::b|c)(2::d)*1**2*" の出力と等価である。
// *...*
// 	ラベル名をアスタリスクで囲んだものは、そのラベルの値で代替される。
// 	この構文を使用する時、ラベル名の先頭に / を付けると、ラベル付けされた値の適用方法を切り替える。
// 	/ なしの場合、値は それ以前に生成されたすべての文字列 * ラベル付けされた値が持つ文字列の数 分生成される。
// 	/ を付けた場合、ラベル付けされた値は単純にそれまで生成された文字列に結合され、ラベル付けされた値の数 < それまでに生成された文字列の数 だった場合、
// 	ラベル付けされた値は不足に達した時点でラベル付けされた値内を周回して不足分を補う。
// 	以下は動作モードの違いによる出力の例。
// 	labeled = [ 0, 1, 2 ], strings = [ 'a', 'b', 'c', 'd', 'e' ]
// 	Strings.get("[labeled;:0,2,1]['a','e',1]*labeled*");
// 		// [ 'a0', 'a1, 'a2', 'b0', 'b1', 'b2', 'c0', 'c1, 'c2', 'd0', 'd1, 'd2', 'e0', 'e1, 'e2' ]
//		Strings.get("[labeled;:0,2,1]['a','e',1]*/labeled*");
// 		// [ 'a0', 'b1, 'c2', 'd0', 'e1' ]
// `...`
// 	括弧中の文字列を JavaScript として実行し、return によって返された値を戻り値として使う。
// 	引数 labeled に、ラベルを付けた値をプロパティに示す Object が与えられる。
// 	仕様で補え切れない状況に対応するための応急処置的な使用を想定しており、可読性を著しく落とす。
// 	この括弧中でのテンプレート文字列の使用は現状非対応。
// {...}
// 	値間を , で区切り、最初の値を実行主体、次の値(文字列)を(JavaScript APIの)メソッド名、以降をそのメソッドの引数として、指定のメソッドを実行する。
// 	直接値を指定する場合、数値か文字列しか指定できないが、他の構文、例えば `...` と組み合わせることで間接的に任意の値を指定できる。
// 	値にはラベルを変数的に指定でき、その際はラベルの文字列を * で囲む必要はない。
// 	ただし、この場合、指定するラベルは JavaScript の識別子と同じ命名規則に従っていなければならない。
// 	https://developer.mozilla.org/ja/docs/Glossary/Identifier
// ^...^
// 	直後の構文ないし文字列を指定に従って繰り返す。以下の引数を取る。
// 	loopCount (optional)
// 		任意の自然数で、| で区切られた右側の文字列を繰り返す回数を指定する。
// 	separator (optional)
// 		' で囲った任意の文字列で、| で区切られた右側の文字列を繰り返す時の区切り文字になる。
// 	strings
// 		繰り返す文字列を指定する。上記の引数とは | で区切る。指定された文字列は ParseHelper.prototype.get の第一引数として再帰して解析される。
// 		重要な点として、この文字列は ' で囲う必要はない。' で囲うと構文を含んでいても単一の文字列として解釈される。
// 		また、文字列に構文 (...) を使用する場合、同構文内の区切り文字 | は \ でエスケープしなければ認識されない。
// 		文字列中にプレースホルダー $i $I $l が使える。$i は 0 から開始する現在のループ回数、$I は 1 から開始する同回数、$l は loopCount に置換される。
// 		仮にこれらのプレースホルダーを文字列として使う場合は \\$i などとする。プレースホルダーは構文内外問わず任意に指定できる。
// 	指定は "^2,','|a^" のように行なう。この出力は [ 'a,a' ] である。
// 	指定次第で予期しない巨大な出力を生成する点に注意が必要。
// 	（一方、リソース不足エラーにより思ったより巨大なデータを得られない点にも気付くかもしれない）
// ~...~
// 	この構文内の文字列を式として計算を行ないその結果を文字列にする。暫定的な実装で構文記号含め変更の必要が強い。
// 	特に構文の優先順位の必然性など確認が不足している。対応しているのは四則演算のみ。
// 	基本的には使う必要のない構文だが、^...^ でプレースホルダーを使って文字列を生成する時にやや有用。
//
// エスケープも含め、上記の構文文字は任意の文字に変更しようと思えばできなくはないが、一切動作検証していないので強く推奨しない。

// 使用例:
// 	Strings.get("a`return '0'+1;:`[label:0,5,1,5,'_',2,'_']<'#id[id=\"sample\"]', 'textContent'>(a|b)*label*");
export class Strings extends ParseHelper {
	
	static descriptor = {
		
		eval(inner, block, parsed, plot, plotLength, input, detail, splice, deletes, self) {
			
			return (new Function('detail', inner))(detail.v);
			
		},
		echo(inner, block, parsed, plot, plotLength, input, detail, splice, deletes, self) {
			
			const	args = this.or.split(inner, ...this.frkArgHierarchy.getMasks(inner).masks),
					hasOpts = args.length > 1,
					arg = hasOpts ? args[1] : args[0],
					opts = hasOpts ? this.getArgs(args[0], detail, this.argHierarchy) : null,
					l = opts?.[0] ?? 1,
					separator = opts?.[1],
					l0 = l - 1;
			let i,ai, v, arg0, parser;
			
			i = ai = -1;
			while (++i < l) {
				arg0 = this.el.replace(this.eI.replace(this.ei.replace(arg, i), i + 1), l),
				(v = (parser = this.getParser(arg0, detail)).next()).done ?
					(splice[++ai] = v.value) : (ai = splice.push(...parser.next().value) - 1),
				separator && i < l0 && (splice[++ai] = separator);
			}
			
		},
		reflection(inner, block, parsed, plot, plotLength, input, detail, splice, deletes, self) {
			
			const args = this.getArgs(inner, detail, this.argHierarchy);
			
			return {
				methods: [
					{ value: args[0], name: args[1], args: args.slice(2) }
				]
			};
			
		},
		consecutiveNumber(inner, block, parsed, plot, plotLength, input, detail, splice, deletes, self) {
			
			const	args = this.getArgs(inner, detail, this.argHierarchy),
					v = { from: args[0], to: args[1], value: args[2] };
			
			args.length > 3 && (
				v.methods = [
					{
						name: (args[3] = args?.[3] ?? 0) > 0 ? 'padStart' : 'padEnd',
						args: [ Math.abs(args[3]), args?.[4] ?? undefined ]
					}
				]
			);
			
			return v;
			
		},
		fork(inner, block, parsed, plot, plotLength, input, detail, splice, deletes, self) {
			
			const	args = this.or.split(inner, ...this.frkArgHierarchy.getMasks(inner).masks),
					l = args.length,
					v = [],
					addr = detail.addr;
			let i,vi, i0,l0, arg;
			
			i = vi = -1;
			while (++i < l) {
				i0 = -1, delete detail.addr, l0 = (arg = this.get(args[i], detail))?.length ?? 0;
				while (++i0 < l0) v[++vi] = arg[i0];
			}
			
			detail.addr = addr;
			
			return v;
			
		},
		recycle(inner, block, parsed, plot, plotLength, input, detail, splice, deletes, self) {
			
			// inner[0] === this.reFlag で戻り値を分岐させているが、
			// 仮に分岐する場合、detail.addr.indexOf(inner) が異なるキーで同じ結果を得ることになる。
			// これはあり得ないはずなので、indexOf の引数を正規化する改修(inner.replace(this.reFlag, '') のような)が恐らく必要。
			
			let v;
			
			v = detail.addr.indexOf(inner);
			
			return v = v === -1 ? '' : inner[0] === this.reFlag ? -v|0 : v;
			
		},
		selector(inner, block, parsed, plot, plotLength, input, detail, splice, deletes, self) {
			
			const	args = this.or.split(inner, ...this.frkArgHierarchy.getMasks(inner).masks),
					addr = detail.addr,
					urls = args.length > 1 && (delete detail.addr, this.get(args[0], detail)),
					params = this.getArgs(args[+!!urls], (detail.addr ||= addr, detail), this.argHierarchy),
					propertyName = params?.[1]?.split('.') ?? [ '', 'textContent' ];
			
			return {
				urls,
				selector: params?.[0],
				propertyName: propertyName[0] || (propertyName.shift(), propertyName),
				rxSrc: params?.[2],
				interval: params?.[3] || 1000,
				timeout: params?.[4] || 30000
			};
			
		},
		selector_(inner, block, parsed, plot, plotLength, input, detail, splice, deletes, self) {
			
			const	args = this.getArgs(inner, detail, this.argHierarchy),
					arg = args?.[1]?.split('.') ?? [ '', 'textContent' ];
			
			return {
				selector: args?.[0],
				propertyName: arg[0] ? arg[0] : (arg.shift(), arg)
			};
			
		},
		calc(inner, block, parsed, plot, plotLength, input, detail, splice, deletes, self) {
			
			return ''+this.getArgs(inner, detail, this.argHierarchy)[0];
			
		}
	};
	// 実際に使用される主な構文を優先順で列挙したリスト。
	// 一切検証していないが、使用する構文の可否をこの値の変更だけで任意に行なえるかもしれない。
	// 例えばセキュアであることが求められる場合、以下の this.evl を消すことで簡易に対応できる。
	// str = string, re = recycle, evl = eval,
	// fnc = function(reflection), dom = document object model, amp = amplifier, frk = fork, lbl = label,
	// ech = echo = dup(old name) = duplicate
	static hierarchy = [
		{ name: 'str', term: [ "'", "'" ], super: true },
		{ name: 're', term: [ '*', '*' ], callback: Strings.descriptor.recycle },
		{ name: 'evl', term: [ '`', '`' ], callback: Strings.descriptor.eval },
		[
			{ name: 'fnc', term: [ '{', '}' ], callback: Strings.descriptor.reflection },
			{ name: 'dom', term: [ '<', '>' ], callback: Strings.descriptor.selector },
			{ name: 'amp', term: [ '[', ']' ], callback: Strings.descriptor.consecutiveNumber },
			{ name: 'frk', term: [ '(', ')' ], callback: Strings.descriptor.fork },
			{ name: 'ech', term: [ '^', '^' ], callback: Strings.descriptor.echo },
			{ name: 'clc', term: [ '~', '~' ], callback: Strings.descriptor.calc },
			//{ name: 'dup', term: [ '^', '^' ] }
		]
	];
	static stored = ';:';
	static labeled = '::';
	
	constructor() {
		
		super();
		
		// esc = escape
		const esc = this.esc = new Sequence('\\');
		
		this.setGrammar(Strings.hierarchy, esc, this.hierarchy = new Terms(), this.map = new Map()),
		this.argHierarchy = new Terms(this.str, this.re, this.evl),
		this.frkArgHierarchy = new Terms(...this.argHierarchy, this.frk),
		
		this.lbl = new Chr(
				new RegExp(`^(.*?)(${Unit.escapeRegExpStr(Strings.stored)}|${Unit.escapeRegExpStr(Strings.labeled)})`, 'g'),
				undefined,
				esc
			),
		this.reFlag = '/',
		
		// dot, cmm = comma, or, idt = identify for labeled value
		this.dot = new Chr('.', undefined, esc),
		this.cmm = new Chr(',', undefined, esc),
		this.or = new Chr('|', undefined, esc),
		// echo increment, echo length
		this.ei = new Chr(/\$i/g, undefined, esc),
		this.eI = new Chr(/\$I/g, undefined, esc),
		this.el = new Chr(/\$l/g, undefined, esc),
		
		this.expression = new Expression({ str: this.str, evl: this.evl }, esc);
		
	}
	
	before(plot, plotLength, input, detail, passthrough, self) {
		
		detail.v ||= {}, detail.addr ||= [];
		
		return passthrough;
		
	}
	
	main(block, parsed, plot, plotLength, input, detail, splice, deletes, self) {
		
		let l;
		
		detail.v ||= {}, l = (detail.addr ||= []).length;
		
		if (typeof block === 'string') {
			detail.addr[l] = ''+l;
			return block;
		}
		
		const { label, registers, inner } = this.parse(block.inners[0], block.captor === this.evl);
		let i,i0,l0, args, v,vi, arg;
		
		detail.addr[l] = label || ''+l;
		v = this.map.get(block.captor)?.(inner, ...arguments) ?? inner,
		label && (detail.v[label] = v);
		
		return registers ? { neglect: v } : v;
		
	}
	
	after(parsed, parsedLength, plot, plotLength, input, detail, self) {
		
		const composed = Composer.compose(parsed), cl = composed.length;
		let i;
		
		i = -1;
		while (++i < cl) composed[i] = this.esc.replace(composed[i]);
		
		return composed;
		
	}
	
	parse(inner, unlabels) {
		
		const	{ str, evl } = this,
				sLocs = str.locate(inner).completed,
				eLocs = evl.locate(inner).completed,
				label = unlabels || this.lbl.mask(inner, sLocs, eLocs).unmasked?.[0],
				labeled = label && !unlabels;
		
		return {
				label: label && label[1],
				registers: label?.[2] === Strings.stored,
				strLocs: labeled ? str.locate(inner = inner.substring(label.index + label[0].length)).completed : sLocs,
				evlLocs: labeled ? evl.locate(inner).completed : eLocs,
				inner
			};
		
	}
	
	getArgs(str, labeled, hierarchy, passthrough) {
		
		const	args = this.cmm.split(str, ...hierarchy.getMasks(str).masks), l = args.length,
				pt = Array.isArray(passthrough) && passthrough.length;
		let i;
		
		i = -1;
		while (++i < l) args[i] = pt && passthrough.indexOf(i) !== -1 ? args[i] : this.expression.get(args[i], labeled);
		
		return args;
		
	}
	
}

export class Expression extends ParseHelper {
	
	static descriptor = {
		
		call(inner, block, parsed, plot, plotLength, input, detail, splice, deletes, self) {
			
			// コメントの行は変更前の処理で、ネストする計算でエラーが起きていたが、
			// ここに手を加えた覚えはないものの、戻り値の [0] を外すと動作するようになっている。またおかしくなった時はここを確認。
			// 実際は手を加えた(恐らく Expression.prototype.after の戻り値)が、ここが変更箇所のいくつかの呼び出し元のひとつであるため、
			// 変更時に影響の確認を怠っていたものと思われる。
			//return this.get(inner, detail)[0];
			return this.get(inner, detail);
			
		},
		number(inner, block, parsed, plot, plotLength, input, detail, splice, deletes, self) {
			return +block.$;
		},
		
		string(inner, block, parsed, plot, plotLength, input, detail, splice, deletes, self) {
			return inner;
		},
		
		eval(inner, block, parsed, plot, plotLength, input, detail, splice, deletes, self) {
			return (new Function('labeled', inner))(detail);
		},
		
		identify(inner, block, parsed, plot, plotLength, input, detail, splice, deletes, self) {
			return detail && typeof detail === 'object' ? detail?.[inner] ?? undefined : undefined;
		},
		
		ops(inner, block, parsed, plot, plotLength, input, detail, splice, deletes, self) {
			return this.opsSymbol[block.$];
		}
		
	};
	static setTermTo(hierarchyDescriptors, name, term) {
		
		const l = hierarchyDescriptors.length;
		let i, hd;
		
		i = -1;
		while (++i < l) {
			
			if ((hd = hierarchyDescriptors[i]).constructor === Array) {
				
				Expression.setTermTo(hd, name, term);
				
			} else if (hd && typeof hd === 'object' && hd.name === name) {
				
				hd.term = term;
				return;
				
			}
			
		}
		
	}
	static add(v, left, right, idx, ldx, rdx, parsed, parsedLength, plot, plotLength, input, detail, splice, self) {
		
		return [
			idx - (idx - ldx),
			(rdx ?? idx) - ldx + 1,
			left === null ? right === null ? null : +right : right === null ? left : left + right
		];
		
	}
	static sub(v, left, right, idx, ldx, rdx, parsed, parsedLength, plot, plotLength, input, detail, splice, self) {
		
		return [
			idx - (idx - ldx),
			(rdx ?? idx) - ldx + 1,
			left === null ? right === null ? null : -right : right === null ? left : left - right
		];
		
	}
	static div(v, left, right, idx, ldx, rdx, parsed, parsedLength, plot, plotLength, input, detail, splice, self) {
		
		return [
			idx - (idx - ldx),
			(rdx ?? idx) - ldx + 1,
			left === null ? right === null ? null : right : right === null ? left : left / right
		];
		
	}
	static mul(v, left, right, idx, ldx, rdx, parsed, parsedLength, plot, plotLength, input, detail, splice, self) {
		
		return [
			idx - (idx - ldx),
			(rdx ?? idx) - ldx + 1,
			left === null ? right === null ? null : right : right === null ? left : left * right
		];
		
	}
	
	constructor(term, esc) {
		
		super(),
		
		this.opsSymbol = {
			'+': Symbol(),
			'-': Symbol(),
			'/': Symbol(),
			'*': Symbol()
		},
		this.opsIndex = {
			[ this.opsSymbol['+'] ]: Expression.add,
			[ this.opsSymbol['-'] ]: Expression.sub,
			[ this.opsSymbol['/'] ]: Expression.div,
			[ this.opsSymbol['*'] ]: Expression.mul
		},
		this.precedence = [
			this.opsSymbol['/'],
			this.opsSymbol['*'],
			this.opsSymbol['-'],
			this.opsSymbol['+']
		],
		
		this.hierarchyDescriptors = [
			{ name: 'str', term: [ "'", "'" ], callback: Expression.descriptor.string },
			{ name: 'cll', term: [ '(', ')' ], callback: Expression.descriptor.call },
			{ name: 'evl', term: [ '`', '`' ], callback: Expression.descriptor.eval },
			{ name: 'num', term: [ /\d+(?:\.\d+)?/g ], callback: Expression.descriptor.number },
			{ name: 'idt', term: [ /[$A-Za-z_\u0080-\uFFFF][$\w\u0080-\uFFFF]*/g ], callback: Expression.descriptor.identify },
			{	name: 'ops',
				term: [
					new RegExp(`(?:${Object.keys(this.opsSymbol).map(v => Unit.escapeRegExpStr(v)).join('|')})`, 'g')
				],
				callback: Expression.descriptor.ops
			}
		],
		
		this.map = new Map(),
		
		this.setTerm(term, this.esc = esc instanceof Sequence ? esc : new Sequence('\\'));
		
	}
	
	setTerm(term, esc = this.esc) {
		
		const hd = this.hierarchyDescriptors, map = this.map, setTermTo = Expression.setTermTo;
		let k, t,t0;
		
		for (k in term)	(t = term[k]) instanceof Term || (t = new Term(t, esc)),
								(t0 = this[k]) && map.delete(t0),
								setTermTo(hd, k, t);
		
		return this.setGrammar(hd, this.esc, this.hierarchy = new Terms(), map);
		
	}
	main(block, parsed, plot, plotLength, input, detail, splice, deletes, self) {
		
		if (typeof block === 'string') return deletes;
		
		const inner = block.inners[0] || block.$;
		
		return this.map.get(block.captor)?.(inner, ...arguments) ?? deletes;
		
	}
	
	after(parsed, parsedLength, plot, plotLength, input, detail, self) {
		
		const prcdc = this.precedence, l = prcdc.length, splice = Array.prototype.splice;
		let i,i0,li,ri, op,p,v, lp, spliceArgsLength;
		
		i = -1, lp = parsedLength - 1;
		while (++i < l) {
			
			i0 = -1, op = prcdc[i];
			while (++i0 < parsedLength) {
				
				(p = parsed[i0]) === op && (
					
					v = this.opsIndex[p]?.(
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
				)
				
			}
			
		}
		
		return parsed[0];
		
	}
	
}

const strings = new Strings();
export default strings.get.bind(strings);

export class Composer {
	
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
	static increase(from = 0, to = 1, value = 1, values = []) {
		
		if (!value) return (values[values.length] = from);
		
		const	isNum = typeof from === 'number' && typeof to === 'number', round = value < 0;
		let i, vl, v;
		
		from = isNum ?	(Number.isNaN(v = from === undefined ? 0 : +from) ? (''+from).codePointAt() : v) :
							(''+from).codePointAt()
		to = isNum ?	(Number.isNaN(v = to === undefined ? 1 : +to) ? (''+to).codePointAt() : v) :
							(''+to).codePointAt(),
		vl = values.length - 1, value = Math.abs(value);
		
		if (from < to) {
			
			const l = to - from + value;
			
			i = -value;
			while ((i += value) < l) {
				if ((v = from + i) > to) {
					if (!round) break;
					v = to;
				}
				values[++vl] = isNum ? ''+v : String.fromCodePoint(v);
			}
			
		} else {
			
			const l = to - from - value;
			
			i = value;
			while ((i -= value) > l) {
				if ((v = from + i) < to) {
					if (!round) break;
					v = to;
				}
				values[++vl] = isNum ? ''+v : String.fromCodePoint(v);
			}
			
		}
		
		return values;
		
	}
	
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
	static applyAll(apps, values = []) {
		
		const l = values.length, l0 = apps.length;
		//lv = lastValue, ls = lastScope
		let i,i0, app,v,lv,ls;
		
		i = -1;
		while (++i < l) {
			i0 = -1, lv = ls = null;
			while (++i0 < l0) values[i] = lv = (ls = v = ((v = (app = apps[i0])?.value) === true ? ls || lv : v) ?? lv ?? values[i])?.[app.name]?.apply(v, app?.args);
		}
		
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
			
			//while (++i < l) values[i] = new Promise((v => (rs, rj) => {
			//		const ac = new AbortController();
			//		fetch(new URL(v, current)+'', { signal: ac.signal }).
			//			then(response => rs(response)).catch(error => rj(error)),
			//		timeout && setTimeout(() => (ac.abort(), rj(Error('timeouted'))), timeout);
			//	})(values[i])).
			//		then(response => response.text()).
			//			finally(v => v instanceof Error ? v : Composer.remoteSelector(v, selector, propertyName, values));
			//	
			//}
			
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
	// すべての記述子にプロパティ every が設定でき、それが真を示す値の時は、その記述子が生成する文字列は、それ以前の文字列と順番に結合され、
	// 数が満たない場合は生成順を 0 に巻き戻して結合を繰り返し、生成文字列がそれまでの文字列の数を超過する場合はそこで結合を終了する。
	// 例えばそれまでに生成した文字列が 0,1,2 で、every を持つ記述子が 0,1 だった場合、合成された文字列は 00,11,20 になる。
	// 同じように、every を持つ記述子が 0,1,2,3 を生成する場合、合成される文字列は 00,11,22 になる。
	static *getComposer(parts) {
		
		let i,i0,l0,pi,pl, p, nodes,propertyName, composed, neglects, source, resolver;
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
				
				if (neglects = 'neglect' in p) {
					
					values.push(...Composer.compose([ p.neglect ]));
					
					break;
					
				}
				
				if (Array.isArray(p)) {
					
					i0 = -1, l0 = p.length;
					while (++i0 < l0) Composer.concat(Composer.compose(p[i0]), values);
					
					break;
					
				}
				
				if (p.selector) {
					
					Composer.select(p.urls, p.selector, p.propertyName, p.rxSrc, p.interval, p.timeout, values);
					
				} else if ('from' in p || 'to' in p || 'value' in p)
					Composer.increase(p?.from ?? 0, p?.to ?? 1, p?.value ?? 1, values);
				
				Array.isArray(p.methods) && Composer.applyAll(p.methods, values);
				
				break;
				
				case 'number':
				
				snapshots[i] = sources[i] = p;
				
				continue;
				
				default: values[0] = p;
				
			}
			
			snapshots[i] = [ ...(neglects ? values : (sources[i] = [ ...values ])) ],
			
			i0 = -1, l0 = values.length;
			while (++i0 < l0) values[i0] instanceof Promise && (
					++pl,
					values[i0].then(v => v).catch(error => (console.error(error), errored)).then(((promise, ss, src) => v => promised(v, promise, ss, src))(values[i0], snapshots[i], sources[i]))
				);
			
			values.length = 0, neglects = null;
			
		}
		
		pl && (yield promise),
		
		i = -1;
		while (++i < l) {
			
			if (!(i in sources)) continue;
			
			if (typeof (source = sources[i]) === 'number') {
				
				if (!Array.isArray(source = snapshots[(i0 = (source = source|0) < 0) ? source * -1 : source])) continue;
				
				if (i0) {
					
					Composer.every(composed, source);
					continue;
					
				}
				
				source = [ ...source ];
				
			}
			
			composed = Composer.mix(composed, source);
			
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