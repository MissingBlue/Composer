export class Indexer {
	
	constructor() {
		
		this.cache = {};
		
	}
	clearCache() {
		
		const cache = this.cache;
		let k;
		
		for (k in cache) delete cache[k];
		
	}
	setCache(matched, handler) {
		
		const cache = this.cache, input = matched[0]?.input;
		
		if (!(input in cache)) {
			
			const	indices = [], lastIndices = [], cacheData = cache[input] = { indices, lastIndices, matched },
					l = matched.length, handles = typeof handler === 'function';
			let i,i0, m;
			
			i = i0 = -1;
			while (++i < l) (!handles || handler(m = matched[i], i,l, cacheData)) &&
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
	static unit = '(?!)';
	static option = 'g';
	// https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
	static escapeRegExpStr(regExpStr) {
		return regExpStr.replace(/[.*+?^=!:${}()|[\]\/\\]/g, '\\$&');
	}
	static createGlobalRegExpFromString(rx = Unit.unit, option = Unit.option) {
		
		return	rx instanceof RegExp ?
						rx.global ? rx : new TypeError('RegExp must be global.') :
						new RegExp(
									Sequence.escapeRegExpStr('' + (rx || '')),
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
	
}

export class Chr extends Unit {
	
	static unit = '#';
	static seq = '\\';
	
	constructor(unit = Chr.unit, option, seq, seqOption, seqRepetition) {
		
		super(unit, option),
		
		this.init(unit, option, seq, seqOption, seqRepetition);
		
	}
	
	init(unit = Chr.unit, option, seq = Chr.seq, seqOption, seqRepetition) {
		
		this.masked instanceof Indexer ? this.masked.clearCache() : (this.masked = new Indexer());
		
		if ((this.setUnit(unit, option)).source === (this.seq = new Sequence(seq, seqOption, seqRepetition)).source)
			new Error('The srouce of "unit" and "seq" must be different.');
		
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
		
		if (!l || !l0 || umi === -1) return data;
		
		const masked = data.masked;
		let i0,i1,l1,um,idx,mi,mask;
		
		i = mi = -1;
		while (++i < umi) {
			
			i0 = -1, idx = (um = unmasked[i]).index;
			while (++i0 < l0) {
				
				i1 = -1, l1 = (mask = masks[i0]).length;
				while (++i1 < l1 && (idx < mask[i1].lo || mask[i1].ro <= idx));
				
				if (i1 === l1) continue;
				
				masked[++mi] = um, unmasked.splice(i--, 1), --umi;
				break;
				
			}
			
		}
		
		return data;
		
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

export class Brackets {
	
	static chr = '"';
	static copyChr(a) {
		
		return a instanceof Chr ? a.duplicate() : new Chr(a);
		
	}
	static sortLocales(a, b) {
		return a.lo - b.lo;
	}
	static plot(...data) {
		
		const locs = [], dl = data.length, result = [], max = Math.max, min = Math.min;
		let i,i0,l0,li, datum, loc,sub,cursor;
		
		i = li = -1;
		while (++i < dl) {
			i0 = -1, l0 = (datum = data[i]).length;
			while (++i0 < l0) locs[++li] = datum[i0];
		}
		
		const str = locs.sort(Brackets.sortLocales)[0].l.input,
				sl = str.length - 1;
		
		i = i0 = -1, cursor = 0, ++li;
		while (++i < li) {
			(sub = str.substring(cursor, max((loc = locs[i]).lo, 0))) && (result[++i0] = sub);
			if (min(cursor = (result[++i0] = loc).ro, sl) === sl) break;
		}
		cursor < sl && (result[++i0] = str.substring(cursor));
		
		return result;
		
	}
	
	constructor(l, r) {
		
		this.setLR(l, r);
		
	}
	
	setLR(l,r) {
		
		this.setL(l), this.setR(r);
		
		return this;
		
	}
	setL(l) {
		
		return this.setChr('l', 'r', l);
		
	}
	setR(r) {
		
		return this.setChr('r', 'l', r);
		
	}
	setChr(k, dk, chr = Brackets.chr) {
		
		return this[k] = chr instanceof Chr ? chr : Brackets.copyChr(chr || this[dk]);
		
	}
	
	locate(str, ...masks) {
		
		const lI = this.l.mask(str, ...masks).unmasked, lL = lI.length, locales = [];
		
		if (!lL) return locales;
		
		const	isSame = this.l.isSame(this.r), rI = isSame ? lI : this.r.mask(str, ...masks).unmasked, rL = rI.length;
		
		if (!rL) return locales;
		
		const rShift = isSame ? 2 : 1, localedL = [];
		let i,i0,mi, L,LI, R,RI, locale;
		
		i = -1, mi = -1;
		while ((i += rShift) < rL) {
			i0 = lL, RI = (R = rI[i]).index;
			while (--i0 > -1 && (lI[i0].index >= RI || localedL.indexOf(i0) !== -1));
			if (L = lI[i0]) {
				localedL[++mi] = i0,
				locale = locales[mi] = { l: L, lo: L.index, li: L.index + L[0].length, r: R, ri: RI, ro: RI + R[0].length },
				locale.inner = str.substring(locale.li, locale.ri),
				locale.outer = str.substring(locale.lo, locale.ro);
			}
		}
		
		return locales;
		
	}
	
	// this.locale で得た情報を、その位置情報に基づいて階層化させる。
	// 各要素には内包する要素を列挙した配列を示すプロパティ nested が設定される。
	// 情報は not in place で階層化される（つまり引数に与えた値は変化しない）が、要素内のプロパティの作成はシャローコピーで行なわれる。
	// 第二引数 callback に関数を与えると、階層化する前の要素を引数に与えて階層化順にその関数を実行する。
	// 階層化は左方上位から下位に向けて行なわれ、最下位まで到達すると右方へ移行する。
	// 関数の戻り値が真を示すと、その要素は、その子要素を含め階層に含まれない。（その子要素へのコールバック関数の実行も行なわれない）
	// 関数には要素、要素の位置、階層化前の情報の要素長、階層化前の情報を列挙した配列、このインスタンスの参照が順に引数として与えられる。
	nest(locales, callback) {
		
		const	locs = [ ...locales ], l = locs.length, data = [], nested = [],
				hasCallback = typeof callback === 'function';
		let i,i0,di,ni, loc, datum, cancels;
		
		locs.sort(Brackets.sortLocales),
		
		i = di = -1;
		while (++i < l) {
			
			i0 = i, ni = -1, datum = { ...(loc = locs[i]) },
			cancels = hasCallback && callback(loc, i,l, locs, this);
			while (++i0 < l && locs[i0].ri < loc.ri) nested[++ni] = locs[i0];
			
			cancels || (data[++di] = datum, ni === -1 || (datum.nested = this.nest(nested))),
			ni === -1 || (nested.length = 0), i = i0 - 1;
			
		}
		
		return data;
		
	}
	
}

// []
// 	開始値,終了値,増加値,字詰め文字,桁数(正の値の場合先頭方向、負の値の場合末尾方向へ字詰めする)
// 'a[label:0,5,1,"_",5]<#id/textContent>(a,b)*label*'
export class Amplifier {
	
	static str = new Brackets();
	static dom = new Brackets('<','>');
	static amp = new Brackets('[',']');
	static frk = new Brackets('(',')');
	static lbl = /^(.*?):/;
	static lblc = new Chr(':');
	static re = new Brackets('*','*');
	
	constructor() {}
	
	static get(v) {
		
		const	str = Amplifier.str.locate(v),
				dom = Amplifier.dom.locate(v, str),
				amp = Amplifier.amp.locate(v, str, dom),
				frk = Amplifier.frk.locate(v, str, dom),
				re = Amplifier.re.locate(v, str, dom),
				plot = Brackets.plot(dom, amp, frk, re),
				l = plot.length,
				labeled = {};
		let i, p;
		
		i = -1;
		while (++i < l) {
			
			if (typeof (p = plot[i]) === 'string') continue;
			
			iStr = Amplifier.str.locate(inner = p.inner);
			
			if (p.inner.match(lbl)) {
				
			}
			
			switch (p.l[0]) {
				case '[':
				datum = {
					from: 
				}
				break;
				
			}
		}
		
	};
	
}

export class Composer {
	
	constructor() {}
	
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
	static increase(from = 0, to = 1, value = 1, values = []) {
		
		const isNum = typeof from === 'number', code = isNum ? from : from.codePointAt();
		let i,vl, chr;
		
		i = -1, to = (typeof to === 'number' ? to : to.codePointAt()) - code + 1, vl = values.length - 1;
		while ((i += value) < to) chr = code + i, values[++vl] = isNum ? chr+'' : String.fromCodePoint(chr);
		
		return values;
		
	}
	
	// 第一引数に指定された配列の中の記述子に基づいた処理を、
	// 第二引数に指定された配列の要素に対して行なう。
	// values の中の要素は文字列であることが暗黙的に求められる。
	// 記述子は Object で、以下のプロパティを指定できる。
	// 	name
	//			処理される要素が持つメソッド名。例えば要素が文字列なら、String のメソッドなどが指定できる。
	// 	args (optional)
	// 		name が示すメソッドに渡される引数を列挙した配列。
	// 上記のプロパティから察せられる通り、記述子の指定内容は、name が示すメソッドに apply を通して反映される。
	// apply の第一引数は常に values の該当要素自身になる。
	static applyAll(apps, values = []) {
		
		const l = values.length, l0 = apps.length;
		let i,i0;
		
		i = -1;
		while (++i < l) {
			i0 = -1;
			while (++i0 < l0) values[i] = values[i]?.[apps[i0].name]?.apply(values[i], apps[i0]?.args);
		}
		
		return values;
		
	}
	
	// 第一引数 selector に指定した文字列を、document.querySelectorAll の第一引数にし、
	// 選択されたすべての要素から、第二引数 propertyName に指定したプロパティの値を取得し、
	// それを第三引数 values に指定した配列に追加する。
	static select(selector = ':root', propertyName = 'innerHTML', values = []) {
		
		const nodes = document.querySelectorAll(selector), l = nodes.length;
		let i, l0;
		
		i = -1, l0 = values.length - 1;
		while (++i < l) values[++l0] = nodes[i][propertyName];
		
		return values;
		
	}
	
	// 第一引数 targets に指定された要素を第二引数 values の対応する位置の要素と結合する。
	// targets の要素数が values よりも多い場合（これはこの関数が想定している唯一の状況だが）、
	// 現在の要素の位置が values の要素数を超過した時点で、values の要素位置は 0 に戻り、targets の後続の要素との結合を続行する。
	// makeEven([ 'a', 'b', 'c' ], [ 'b' ]) であれば戻り値は [ 'ab', 'bb', 'cb' ] である。
	// 内部処理以外の状況での使用は一切想定していないため、例えば targets.length / values.length で余りが出る場合、
	// 出力結果は期待とはかなり異なるものになると思われる。
	static makeEven(targets, values) {
		
		const l = targets.length, l0 = values.length;
		let i;
		
		i = -1;
		while (++i < l) targets[i] += values[i - parseInt(i / l0) * l0];
		
		return targets;
		
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
	// この処理は makeEven を通じて行なわれるため、具体的な実装については同メソッドの説明を参照できる。
	// 想定している処理内容そのものは既存の値の流用以上のものではないが、
	// 使用しなければならない状況は残念ながら比較的多いと思われ、実装がピーキーである点に留意が必要である。
	static compose(parts) {
		
		const	l = (Array.isArray(parts) ? parts : (parts = [ parts ])).length, URLs = [], values = [], snapshots = [];
		let i,i0,l0, p, nodes,propertyName, urls = [];
		
		i = -1;
		while (++i < l) {
			
			switch (typeof (p = parts[i])) {
				
				case 'object':
				
				if (!p) continue;
				
				if (Array.isArray(p)) {
					
					i0 = -1, l0 = p.length;
					while (++i0 < l0) Composer.concat(Composer.compose(p[i0]), values);
					
					break;
					
				}
				
				if (p.selector) {
					
					Composer.select(p.selector, p.propertyName, values);
					
				} else if ('from' in p || 'to' in p || 'value' in p)
					Composer.increase(p?.from ?? 0, p?.to ?? 1, p?.value ?? 1, values);
				
				Array.isArray(p.methods) && Composer.applyAll(p.methods, values);
				
				break;
				
				case 'number':
				
				Array.isArray(p = snapshots[p]) && Composer.makeEven(urls, p);
				
				continue;
				
				default: values[0] = p;
				
			}
			
			snapshots[i] = [ ...values ],
			
			urls = Composer.mix(urls, values), values.length = 0;
			
		}
		
		return urls;
		
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
		
		i = -1;
		while (++i < l) container[++i0] = str + values[i];
		
		return container;
		
	}
	
}