export class Indexer {
	
	static {
		
		this.indexed = Symbol('Indexer.indexed'),
		this.anon = Symbol('Indexer.anon');
		
	}
	
	constructor() {
		
		this.cache = {};
		
	}
	
	// 第一引数 matched に与えられた String.prototype.matchAll の戻り値の要素に、以下のプロパティを設定してキャッシュする。
	// 	captor
	// 		文字列に対して一致を示した、このオブジェクトないしこのオブジェクトの継承先を示す。
	// 	lastIndex
	// 		一致の終端位置を示す数値。位置は、例えば一致した文字列長が 1 で、
	// 		matchAll の戻り値の要素が持つプロパティ index が 2 だった場合、このプロパティは 3 を示す。
	// また後述するように、要素だけでなく matched そのものにもプロパティが設定される。
	// キャッシュされた matched は、matchAll を使う継承先の実装に基づいて再利用される。
	// 第二引数 handler に関数を指定すると、matched の各要素を引数にして任意に実装されたその関数を順次実行し、
	// 関数の戻り値が真を示した要素を、matched のプロパティ Indexer.indexed に設定した Map に、
	// handler をキーにした配列に列挙して値として保存する。
	// これにより、特定の条件に基づいて不要な要素をフィルタリングした matched を逐次再利用できる。
	// 
	// handler には以下の引数が与えられる。
	// 	m
	// 		matched の要素。先頭から末尾に向けて順に指定される。
	// 	i
	// 		第一引数 m の matched 内の位置を示す数値。
	// 	l
	// 		matched の要素数。
	// matched はそのままキャッシュされる上、 Indexer.indexed には、その部分的なコピーも重複して保存されるため、
	// 状況次第でリソース上の問題を引き起こす可能性がある。
	// リソースを考慮する場合、matched のプロパティ input を削除するか、キャッシュに紐付ける形で一元化して保存することで軽減する対策が考えられる。
	setCache(matched, handler) {
		
		if (!Array.isArray(matched) && !(Symbol.iterator in matched && (matched = [ ...matched ])))
			throw new Error('Argument "matched" must be an iterable object.');
		
		const { cache } = this, input = matched[0]?.input || Indexer.anon;
		
		if (!(input in cache) || (handler && !cache[input]?.has?.(handler))) {
			
			const	{ indexed } = Indexer, l = matched.length, v = [], handles = typeof handler === 'function';
			let i,i0, m;
			
			i = i0 = -1, m = (cache[input] ||= matched)[indexed] ||= new Map(), handler && m.set(handler, v);
			while (++i < l)	(m = matched[i]).captor ||= this,
									m.lastIndex = m.index + m[0].length,
									(!handles || handler(m, i,l)) && (v[++i0] = m);
			
		}
		
		return cache[input];
		
	}
	getCache(str, handler, rx) {
		
		const cache =	this.cache?.[(str = ''+str) || Indexer.anon] ||
								(rx instanceof RegExp && this.setCache(str.matchAll(rx), handler));
		
		return cache && typeof handler === 'function' ? cache?.[indexer.indexed].get?.(handler) : cache;
		
	}
	clearCache() {
		
		const { cache } = this;
		let k;
		
		for (k in cache) delete cache[k];
		
	}
	
}

export class Pattern {
	
	static {
		
		this.str = Symbol('Pattern.str'),
		this.escape = /[.*+?^=!:${}()|[\]\/\\]/g;
		
	}
	
	constructor(str) {
		
		this.str = str;
		
	}
	
	toString() {
		
		return this.source;
		
	}
	
	set str(v) {
		
		// https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
		this[Pattern.str] = (this.source = '' + (v ?? '')).replace(Pattern.escape, '\\$&');
		
	}
	get str() {
		
		return this[Pattern.str] ?? '';
		
	}
	
}

// プロパティ unit は setter, getter になっており、特定の値か、それを列挙した配列を指定すると、
// その値を保存して、get 時に、それらを元に正規表現を即席で作成して戻り値にする。
// unit へ指定する値は、RegExp インスタンス、Pattern インスタンスおよび文字列で、
// RegExp の場合、そのプロパティ source の値を（一方プロパティ flags は常に無視される）、
// Pattern の場合はプロパティ str、文字列の場合は文字列がそのまま使われ、RegExp 作成時にそれらの値を結合して一致パターンとする。
// この内、値に Pattern を使った場合、Pattern に指定した文字列は、Pattern への指定時に、自動的に正規表現で使われるメタ文字などがエスケープされる。
// new Unit([ /[]/, new Pattern('[]'), '[]' ])
// 例えば上記の指定に基づいて this.unit で取得される正規表現は /[]\[\][]/g である。（フラグには常に g が追加される）
export class Unit extends Indexer {
	
	static {
		
		this.flags = Symbol('Unit.flags'),
		
		this.defaultFlags = (this.defaultFlag = 'g').split('');
		//this.defaultFlags = (this.defaultFlag = 'dg').split('');
		
	}
	
	constructor(patterns, flags) {
		
		super(),
		
		this.patterns = [],
		
		this.setUnit(patterns, flags);
		
	}
	
	// 互換用、不用になれば削除可
	setUnit(patterns, flags) {
		
		this.unit = !Array.isArray(patterns) && patterns && typeof patterns === 'object' ?
			(flags ||= patterns.flags, patterns instanceof RegExp ? patterns.source : patterns) : patterns,
		
		this.flags = flags;
		
	}
	
	toString() {
		
		const u = this.unit;
		
		return `/${u.source}/${u.flags}`;
		
	}
	
	set unit(values) {
		
		const l =	(values = (Array.isArray(values) ? values :
							(values = values instanceof Chr ? values.patterns : [ values ])).flat()).length,
				patterns = this.patterns,
				pl = patterns.length;
		let i, v, updated;
		
		i = -1;
		while (++i < l) patterns[i] === (patterns[i] = values[i]) || (updated ||= true);
		
		l < pl && (patterns.length = l), (updated || l !== pl) && this.clearCache();
		
	}
	get unit() {
		
		const { flags, patterns } = this, l = patterns.length, s = Pattern.str;
		let i, unit, p;
		
		i = -1, unit = '';
		while (++i < l) unit += (p = patterns[i])?.[s] ?? (p instanceof RegExp ? p.source : ''+p);
		// 上記の Pattern のインスタンスからシンボル str を名前にするプロパティの値を取得しているのは最適化を意図しており、
		// 通常は同インスタンスのプロパティ str から起動される getter 関数を通じて同じ値を同じように取得できる。
		// この getter 関数は頻繁に呼び出される可能性が強いため、最適化の恩恵を存分に享受できる。
		
		return (this.last === unit && this.lastFlags === flags && this.lastRx instanceof RegExp && this.lastRx) ||
			(this.lastRx = new RegExp(this.last = unit, this.lastFlags = flags));
		
	}
	set flags(v = Unit.defaultFlag) {
		
		const { defaultFlags, flags } = Unit, lastFlags = this[flags];
		
		if (typeof v === 'string') {
			
			const l = defaultFlags.length;
			let i, df;
			
			i = -1, v;
			while (++i < l) v.indexOf(df = defaultFlags[i]) === -1 && (v += df);
			
		} else v = defaultFlag;
		
		lastFlags === (this[flags] = v) || this.clearCache();
		
	}
	get flags() {
		
		return this[Unit.flags] ||= Unit.defaultFlag;
		
	}
	
}

export class Sequence extends Unit {
	
	static repetition = 2;
	static cacheHandler(match) {
		return !('units' in match);
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
	
	// 第一引数 str に与えられた文字列に対して、インスタンスのプロパティ unit が示す RegExp で String.prototype.matchAll を実行し、
	// その戻り値の各要素から、一致が連なっている要素を見つけ出し、その連なりを構成する要素をグループ化する。
	// グループ化された要素には以下のプロパティが設定される。
	// 	units
	// 		連なりを構成する要素を列挙した配列。
	// このメソッドの戻り値および Sequence そのものは、文字列のエスケープ判定に使うことを想定している。
	// 例えば上記の連なりは、エスケープシーケンスをエスケープしている箇所と捉えることができる。
	// 逆に言えば、それ以外の要素は直後の文字をエスケープしていると看做すことができる。
	// 第二引数 excludesRepetition に真を示す値を指定すると、戻り値から連なりを示す要素を取り除いた一致情報を配列に列挙して返す。
	// この時の戻り値は、エスケープされている部分の情報のみが戻り値に含まれていると解釈することができる。
	// このメソッドの実行結果はキャッシュされ、インスタンスの情報と str に変化がなければ、二回目以降の実行は常にキャッシュを返す。
	index(str, excludesRepetition) {
		
		if (str in this.cache)
			return excludesRepetition ? this.cache[str][Indexer.indexed].get(Sequence.cacheHandler) : this.cache[str];
		
		const matched = [ ...str.matchAll(this.unit) ], l = matched.length;
		
		if (!l) return this.setCache(matched, Sequence.cacheHandler);
		
		const indices = [], { repetition } = this;
		let i,i0,l0,i1,l1,k, m,m0,m1, u,ui,units, ii, times;
		
		i = ii = -1;
		while (++i < l) {
			
			if ((l0 = i + repetition) <= l) {
				
				i0 = i;
				while (++i0 < l0 && (m = matched[i0 - 1]).index + m[0].length === matched[i0].index);
				
			} else i0 = l;
			
			if ((times = i0 - i) === repetition) {
				
				// 一致した文字列の連なりが規定の繰り返し回数を満たす時。
				// 繰り返しは左方から順に数えられ、連なりの終端までに繰り返しに端数が出た場合、それらは連なり外の個別の一致として記録される。
				
				//l1 = i + repetition * (cnt = m.count = times / repetition | 0),
				//l1 === i0 ? (i1 = i) : (ii = indices.push(...matched.slice(i, i1 = i + (i0 - l1))) - 1),
				//m0 = (indices[++ii] = m = matched[i1])[0], (u = m.units = [])[ui = 0] = m0;
				//while (++i1 < i0) m0 += (u[++ui] = (m1 = matched[i1])[0]), m1.length > 1 && m.push(...m1.slice(1));
				//m[0] = m.entire = m0;
				m = matched[i1 = i], u = [];
				for (k in m) u[k] = m[k];
				m0 = (indices[++ii] = u)[0], (units = u.units = [])[ui = 0] = m, l1 = i + repetition;
				while (++i1 < l1) m0 += (m1 = units[++ui] = matched[i1])[0], m1.length > 1 && u.push(...m1.slice(1));
				u[0] = m0;
				//i1 === i0 || (ii = indices.push(...matched.slice(i1, i0)) - 1);
				
			} else {
				
				// 一致した文字列の連なりが規定の繰り返し回数以下の時。
				// それらの一致はすべて個別の一致として記録される。
				
				--i;
				while (++i < i0) indices[++ii] = matched[i];
				
			}
			
			i = --i0;
			
		}
		
		return this.setCache(indices, Sequence.cacheHandler), this.index(str, excludesRepetition);
		
	}
	replace(str, replacer = '') {
		
		const	matched = this.index(str), l = matched.length, u = this.unit;
		let i,m,lm, replaced;
		
		i = -1, replaced = '';
		while (++i < l) replaced +=	str.substring(lm ? lm.lastIndex : 0, (m = matched[i]).index) +
												('units' in (lm = m) ? m.units.at(-1)[0] : replacer);
		
		return replaced += lm ? str.substring(lm.lastIndex) : str;
		
	}
	
}

// 実際にそれに置き換えられるか、置き換える意義があるのかはともかくとして、
// 特定のメソッドが Symbol の静的プロパティに置き換えられるかは、安定性や保守性の向上、コードの短絡化の観点から検討する価値があると思われる。
// https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Symbol#static_properties
export class Chr extends Unit {
	
	static {
		
		this.unit = '#';
		
	}
	
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
	
	init(patterns = this.patterns || Chr.unit, seq = this.seq, matchesEmpty) {
		
		this.matchesEmpty = matchesEmpty,
		patterns === this.patterns || this.setUnit(patterns),
		this.setSeq(seq);
		
		if (this.unit.source === this.seq?.source) throw new Error('The srouce of "unit" and "seq" must be different.');
		
		return this;
		
	}
	setSeq(seq, flags, repetition) {
		
		return this.seq = seq ? seq instanceof Sequence ? seq : new Sequence(seq, flags, repetition) : null;
		
	}
	
	index(str) {
		
		const k = str || Indexer.anon;
		
		if (k in this.cache) return this.cache[k];
		
		const	matched = [ ...str.matchAll(this.matchesEmpty ? this.unit : this) ],
				l = matched.length, seqs = l && this.seq?.index?.(str, true);
		
		if (!seqs) return this.setCache(matched);
		
		const l0 = seqs.length, unescaped = [];
		let i,i0,i1, m,mi;
		
		i = i1 = -1;
		while (++i < l) {
			i0 = -1, mi = (m = matched[i]).index;
			while (++i0 < l0 && seqs[i0].lastIndex !== mi);
			i0 === l0 && (unescaped[++i1] = m);
		}
		
		// 本来は setCache には String.prototype.matchAll の戻り値を任意の関数を伴ってそのまま指定すべきだが、
		// ここでは最適化を企図して、あらかじめ戻り値から必要な要素だけをフィルタリングした上で指定している。
		// これによりキャッシュのプロパティ Indexer.indexed の Map を経ずにキャッシュを取得をすることができるようになるが、一方で
		// 仮に matchAll の戻り値を別に、そのままの形でキャッシュしたい時に不整合を引き起こす可能性が生じる。
		
		return this.setCache(unescaped);
		
	}
	
	// str の中から、インスタンスのプロパティ unit に一致する文字列が、masks が示す文字列範囲外に存在するかどうかを真偽値で返す。
	// Chr.prototype.index に少し似ているが、文字列の一致の確認だけ目的の場合、
	// index はこのメソッドと比べて冗長で不要な情報を多く含んだ戻り値を作成する。
	// *上記説明をいつ書いたか定かではないが、この処理内で Chr.prototype.index を実行しているため、的外れのように思える。
	// 恐らく Chr.prototype.mask の間違い。
	test(str, ...masks) {
		
		const indexed = this.index(str), l = indexed?.length, l0 = masks.length;
		
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
				unmasked = data.unmasked = matched && [ ...matched ],
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
	
	isSameAs(chr) {
		
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
	[Symbol.split](str) {
		
		const indices = this.index(str), l = indices.length, splitted = [];
		
		if (l) {
			
			let i, si, idx;
			
			i = si = -1;
			while (++i < l) splitted[++si] = str.substring(idx?.lastIndex ?? 0, (idx = indices[i]).index);
			splitted[++si] = str.substring(idx.lastIndex);
			
		} else splitted[0] = str;
		
		return splitted;
		
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
		
		this.escSeq = new Pattern('\\');
		
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
	static get(str, l, r, isFlat, ...masks) {
		
		l || (l = r, r = null),
		
		typeof l === 'string' && (l = new Chr(l, Term.escSeq)),
		r && typeof r === 'string' && (r = new Chr(r, Term.escSeq));
		
		const lI = l.mask(str, ...masks).unmasked, lL = lI.length, locales = [];
		
		if (!lL) return locales;
		
		const	same = r && l.isSameAs(r), rI = same ? lI : (r || l).mask(str, ...masks).unmasked, rL = rI.length;
		// 最長一致にするために、rI の値を reverse() して設定するように変更したが、影響不明。
		//const	same = r && l.isSame(r), rI = same ? lI : (r || l).mask(str, ...masks).unmasked.reverse(), rL = rI.length;
		
		if (!rL) return locales;
		
		const rShift = same ? 2 : 1, localedL = !isFlat && [];
		let i,i0,l0,mi, L,LI, R,RI, locale;
		
		i = mi = l0 = -1;
		while ((i += rShift) < rL) {
			
			i0 = lL, RI = (R = rI[i]).index + (r ? 0 : R[0].length);
			while (--i0 > l0 && (((L = lI[i0]).lastIndex > RI) || (localedL && localedL.indexOf(i0) !== -1)));
			
			if (i0 > l0) {
				// *o は、一致文字列の一致開始位置、*i は一致終了位置。例えば str.substring(*.*o, *.*i) で一致部分を抜き出せる。
				// ls は、r の左側にあるすべての l の一致情報。この関数が判定する一致は基本的に最短一致だが、
				// このプロパティが示す情報を材料に最長一致を組むことができるかもしれない。
				const { lo,li, ro,ri } = locale = locales[++mi] = {
							l: L, lo: L.index, li: L.lastIndex, ls: lI.slice(0, i0 + 1),
							r: r ? R : R.index, ri: RI, ro: r ? RI + R[0].length : RI
						};
				locale.inner = str.substring(li, ri),
				locale.outer = str.substring(lo, ro),
				localedL ? (localedL[mi] = i0) : (l0 = i0);
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
		
		this.setDefaultEscSeq(defaultEscSeq),
		
		this.isFlat = hasEsc ? chrs[2] : undefined;
		
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
		
		const l = this.length, data = [];
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
				l1 = (loc = get(str, i ? (prev = this.chr(i - 1)) : undefined, last || this.chr(i), this.isFlat, ...masks)).length,
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
		while (++i < l)	chr = clone.chr(i, new Chr(source = this.chr(i), null)),
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
	static createTermValue(term, dict) {
		
		const { isArray } = Array, v = [], v0 = [], l = (isArray(term) ? term : (term = [ term ])).length;
		let i,i0,l0,k, ti,vi, t,v1, asArray;
		
		i = vi = -1, (!dict || typeof dict !== 'object') && (dict = undefined);
		while (++i < l) {
			
			// 冗長だが、処理の共通化のために非配列値をいったん配列に入れている。
			i0 = ti = -1, l0 = (t = (asArray = isArray(t = term[i])) ? [ ...t ] : (v0[0] = t, v0)).length;
			while (++i0 < l0) typeof (k = t[i0]) === 'symbol' ?
				((v1 = dict?.[k]) == null || (t[++ti] = isArray(v1) ? Terms.createTermValue(v1, dict) : v1)) :
				(t[++ti] = k);
			
			ti === -1 || (v[++vi] = asArray ? t : t[0]);
			
		}
		
		return v;
		
	}
	
	static {
		
		this.dict = Symbol('Terms.dict'),
		this.termIndex = Symbol('Terms.termIndex'),
		this.unmasks = Symbol('Terms.unmasks'),
		this.callback = Symbol('Terms.callback'),
		this.deletes = Symbol('Terms.deletes'),
		this.splices = Symbol('Terms.splices');
		
	}
	
	constructor(configuration) {
		
		configuration?.constructor === Object ? (
				configuration?.terms?.constructor === Array ? super(...configuration.terms) : super(),
				configuration.precedence &&	this.setByPrecedence(
															configuration.precedence,
															configuration.esc,
															configuration.defaultThis,
															configuration.replacer,
															this[Terms.dict] = configuration?.dict ?? {}
														),
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
	//
	// 第四引数 replacer は、インスタンス間で値を共有するための擬似的な仕組みだったが、
	// オブジェクト Pattern により、この引数なしでも値を共有することができるようになったため、
	// 今のところ変更に伴う検証のコストを忌避してそのままにしているが、
	// 仕様が難解なのと実装も複雑で、現状不要になっているように思われることもあり、保守性の観点からも取り除いた方が良いように思われる。
	setByPrecedence(precedenceDescriptors, esc, defaultThis = this, replacer, dict, terms = this) {
		
		Array.isArray(precedenceDescriptors) || (precedenceDescriptors = [ precedenceDescriptors ]);
		
		const l = precedenceDescriptors.length, clones = replacer?.[Term.clones];
		let i,ti, pd, term,replaces, callback;
		
		i = -1, ti = this.length - 1;
		esc = esc instanceof Sequence ? esc : typeof esc === 'string' ? new Sequence(esc) : undefined,
		replacer || typeof replacer === 'object' || (replacer = undefined);
		while (++i < l) {
			
			if (!('name' in (pd = precedenceDescriptors[i]) && 'term' in pd)) continue;
			
			if (Array.isArray(pd)) {
				
				this[++ti] = this.setByPrecedence(pd, esc, defaultThis, replacer, dict, []);
				
			} else if (pd && typeof pd === 'object') {
				
				term = this[++ti] = this[typeof pd.name === 'symbol' ? pd.name : Symbol(pd.name)] =
					(term = replacer && (replaces = pd.name in replacer) ? replacer[pd.name] : pd.term) instanceof Term ?
						replaces && clones ? term.clone('esc' in pd ? pd.esc : esc) : term :
							new Term(Terms.createTermValue(term, dict), 'esc' in pd ? pd.esc : esc, pd.isFlat),
				
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
		
		return s;
		
	}
	
	static normalizeConfiguration(configuration, constructor, esc, dict) {
		
		Array.isArray(configuration) && (configuration = { precedence: configuration }),
		(configuration && configuration.constructor === Object) || (configuration = {}),
		
		configuration.precedence ||= constructor[ParseHelper.precedenceDescriptors],
		'esc' in configuration || (configuration.esc = esc || constructor[ParseHelper.esc]),
		configuration.dict = { ...(configuration?.dict ?? {}), ...(dict ||= {}) };
		
		return configuration;
		
	}
	
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
	
	constructor(configuration, constructor = ParseHelper, esc, dict) {
		
		super(ParseHelper.normalizeConfiguration(configuration, constructor, esc, dict));
		
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
					
					//pi = parsed.push(...v) - 1;
					parsed.splice(...v),
					pi = parsed.length - 1;
					
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
	
	// このオブジェクトの静的プロパティ escaped を所定の値に変換するためだけのメソッド。再帰を使うために作成。
	static escape(source) {
		
		const { escape } = Strings;
		
		if (source.constructor === Object) {
			
			let k;
			
			for (k in source) source[k] = escape(source[k]);
			
		} else if (Array.isArray(source)) {
			
			const l = source.length;
			let i;
			
			i = -1;
			while (++i < l) source[i] = escape(source[i]);
			
		} else {return source instanceof RegExp ? source.source : new Pattern(source);}
		
		return source;
		
	}
	
	static createDict(indexOfSymbol, dict = {}, source = Strings.dict) {
		
		let k;
		
		for (k in source) dict[indexOfSymbol[k]] = source[k];
		
		return dict;
		
	}
	
	static {
		
		const escaped = this.escaped = {
			
			squareBracketLeft: '[',
			squareBracketRight: ']',
			parenthesisLeft: '(',
			parenthesisRight: ')',
			lessThanSign: '<',
			greaterThanSign: '>',
			singleQuotationMark: "'",
			graveAccent: '`',
			dollarSign: '$',
			equalsSign: '=',
			colon: ':',
			semicolon: ';',
			exclamationMark: '!',
			comma: ',',
			
			division: '/',
			multiplication: '*',
			subtraction: '-',
			addition: '+',
			
			slash: '/',
			
			nai: [ 'nai', 'null' ],
			hu: [ 'hu', 'undefined' ],
			shin: [ 'shin', 'true' ],
			gi: [ 'gi', 'false' ],
			
		};
		
		this.escape(escaped);
		
		const	dict = this.dict = {
					
					bracketLeft: escaped.squareBracketLeft,
					bracketRight: escaped.squareBracketRight,
					stringLeft: escaped.singleQuotationMark,
					stringRight: escaped.singleQuotationMark,
					groupLeft: escaped.parenthesisLeft,
					groupRight: escaped.parenthesisRight,
					evalLeft: escaped.graveAccent,
					evalRight: escaped.graveAccent,
					referenceSign: escaped.dollarSign,
					referenceRight: escaped.squareBracketRight,
					nestLeft: escaped.lessThanSign,
					nestRight: escaped.greaterThanSign,
					regExpLeft: '/',
					regExpRight: '/',
					
					assign: escaped.equalsSign,
					mute: escaped.semicolon,
					separator: escaped.colon,
					not: escaped.exclamationMark,
					comma: escaped.comma,
					
					division: escaped.division,
					multiplication: escaped.multiplication,
					subtraction: escaped.subtraction,
					addition: escaped.addition,
					
					number: /(-?(\d+(?:\.\d+)?|Infinity)|NaN)/g,
					identifier: /[$A-Za-z_\u0080-\uFFFF][$\w\u0080-\uFFFF]*/g,
					//space: /[\n\s\t]+/g,
					space: '[\\n\\s\\t]',
					
					nai: new RegExp(`(?:${escaped.nai.join('|')})`, 'g'),
					hu: new RegExp(`(?:${escaped.hu.join('|')})`, 'g'),
					shin: new RegExp(`(?:${escaped.shin.join('|')})`, 'g'),
					gi: new RegExp(`(?:${escaped.gi.join('|')})`, 'g')
					
				};
		
		dict.referenceLeft = [ dict.referenceSign, dict.bracketLeft ],
		dict.referenceRight = dict.bracketRight,
		
		dict.blank = [ dict.space, '+' ];
		
		// /(?:^|[:;,\[+\-*])\s*?\/([^\/]+?)\/([dgimsuy]?)\s*?(?:[:;,\]+\-*]|$)/
		//dict.regExpLiteralLeft = [
		//	'(?:^|[',
		//	dict.separator,
		//	dict.mute,
		//	dict.comma,
		//	dict.bracketLeft,
		//	dict.groupLeft,
		//	dict.addition,
		//	'])',
		//	dict.space,
		//	'*?',
		//	dict.regExpLeft
		//],
		//dict.regExpLiteralRight = [
		//	dict.regExpRight,
		//	'([dgimsuy]?)',
		//	dict.space,
		//	'*?',
		//	'(?:[',
		//	dict.comma,
		//	dict.bracketRight,
		//	dict.groupRight,
		//	dict.addition,
		//	']|$)'
		//];
		dict.regExpLiteralLeft = [
			'(?<!',
			'(?:',
			dict.number,
			'|',
			dict.identifier,
			')',
			dict.space,
			'*?)',
			dict.regExpLeft
		],
		dict.regExpLiteralRight = [
			dict.regExpRight,
			'([dgimsuy]*)',
			'(?!',
			dict.space,
			'(?:',
			dict.number,
			'|',
			dict.identifier,
			'))'
		];
		//dict.regExpLiteralLeft = dict.regExpLeft,
		//dict.regExpLiteralRight = [ dict.regExpRight, '([dgimsuy]?)' ];
		
		//dict.regExpLiteralLeft = new RegExp(`(?:^|[${regExpLeftSeparator}])${dict.space}*?${dict.regExpLeft}`, 'g'),
		//dict.regExpLiteralRight = new RegExp(`${dict.regExpRight}([dgimsuy]?)${dict.space}*?(?:[${regExpRightSeparator}|$])`, 'g');
		
	}
	
	constructor(sp, exp, opt, desc, esc = new Sequence('\\\\')) {
		
		const { symbol } = ParseHelper, { createDict, dict } = Strings;
		
		this.sp = sp instanceof StringsParser ?
			sp : new StringsParser(sp, esc, createDict(StringsParser[symbol])),
		
		this.exp = exp instanceof StringsExpression ?
			exp : new StringsExpression(exp, esc, createDict(StringsExpression[symbol])),
		
		this.opt = opt instanceof StringsOption ?
			opt : new StringsOption(opt, esc, createDict(StringsOption[symbol])),
		
		this.desc = desc instanceof StringsDescriptor ? desc : new StringsDescriptor(),
		
		this.boundEvaluate = this.evaluate.bind(this),
		this.assigned = {};
		
	}
	
	get(str, assigned = this.assigned) {
		
		(assigned && typeof assigned === 'object') || (assigned = { [StringsExpression.anonAssignKey]: assigned });
		
		const	parameters = this.sp.get(str, assigned), l = parameters.length,
				esc = this.sp.esc,
				spNests = StringsParser.nests,
				{ assignedIndex, evaluates, refers } = StringsParser,
				{ anonAssignKey, getExecutor, nests } = StringsExpression;
		let i,v, p;
		
		i = -1;
		while (++i < l) {
			
			if (!(p = parameters[i]) || typeof p !== 'object') continue;
			
			if (p instanceof String) {
				
				parameters[i] = {
					v:	p[spNests] ?
							this.get(p, assigned) :
							p[evaluates] ?
									getExecutor(p, 'assigned')?.(assigned) :
									p[refers] ?
										(p += '', p ||= anonAssignKey) in assigned ?
											assigned[p] :
											p in assigned[assignedIndex] ? assigned[assigned[assignedIndex][p]] : '' :
							''+p
				};
				
				continue;
				
			}
			
			(v = p.muted) && (p = v),
			(v = p.options) && this.opt.exec(v, this.boundEvaluate, assigned, p),
			p.args &&= this.evaluate(p.args, assigned),
			p.v = this.desc.get(p, assigned),
			(v = p.label) !== null && (assigned[v || anonAssignKey] = p.v);
			
		}
		
		//hi(parameters);
		
		const composed = Composer.compose(parameters), cl = composed.length, escs = this.sp.fetchEscs();
		
		for (v of escs) {
			if (!(v instanceof Sequence)) continue;
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

export class StringsOption extends ParseHelper {
	
	static arg(mask, masks, input, detail, self) {
		
		return new String(mask.$.trim());
		
	}
	
	static {
		
		this.anon = Symbol('StringsOption.anon'),
		this.bound = Symbol('StringsOption.bound'),
		
		this[ParseHelper.symbolNames] = [ 'arg', 'spc', 'groupLeft', 'groupRight', 'blank' ];
		
		const	s = ParseHelper.setSymbols(this),
				dict = this.dict =	{
												[s.groupLeft]: new Pattern('('),
												[s.groupRight]: new Pattern(')'),
												[s.blank]: /[\s\t]+/g
											};
		
		this[ParseHelper.precedenceDescriptors] = [
			{ name: s.arg, term: [ s.groupLeft, s.groupRight ], callback: StringsOption.arg },
			{ name: s.spc, term: [ s.blank ], callback: Term.deletes }
		];
		
	}
	
	constructor(configuration, esc, dict) {
		
		const s = StringsParser[ParseHelper.symbol];
		
		super(
			configuration,
			StringsOption,
			esc,
			{ ...StringsOption.dict, ...(dict && typeof dict === 'object' ? dict : {}) }
		),
		
		this.registered = {},
		
		this[ParseHelper.escOwners] = [];
		
	}
	
	[ParseHelper.main](block, parsed, plot, plotLength, input, detail, self) {
		
		if (block instanceof String) {
		
			const	{ length } = parsed, l0 = length - 1, prev = l0 > -1 && typeof parsed[l0] === 'string' && parsed[l0];
			
			prev && ((block = [ l0, 1, prev + block ])[ParseHelper.splices] = true);
			
		}
		
		return block;
		
	}
	
	register(handler, handlerValue, binds) {
		
		const { registered } = this, { isArray } = Array, { bound, anon } = StringsOption;
		
		if (isArray((typeof handler === 'object' && handler) || (handler = [ handler ]))) {
			
			const l = handler.length;
			let i;
			
			i = -1, binds && isArray(handlerValue) && (handlerValue[bound] = binds);
			while (++i < l) registered[handler[i] || anon] = handlerValue;
			
		} else {
			
			let k,v;
			
			for (k in handler) v = registered[k] = handler[k], binds && isArray(v) && (v[bound] = binds);
			
		}
		
	}
	removeHandlers(...names) {
		
		const l = names.length, { registered } = this;
		let i;
		
		i = -1;
		while (++i < l) delete registered[names[i]];
		
	}
	//removeMatchedHandlers(value) {
	//	
	//	const { registered } = this;
	//	let k;
	//	
	//	for (k in registered) registered[k] === value && delete registered[k];
	//	
	//}
	
	exec(str, callback, assigned, thisArg = this) {
		
		if (!str || typeof callback !== 'function') return;
		
		const opts = this.get(str, assigned), l = opts.length;
		
		if (!l) return;
		
		const	{ registered } = this, { bound } = StringsOption, assignedHandler = {}, binder = [ null, thisArg ];
		let i,k,v;
		
		for (k in registered) typeof (v = registered[k]) === 'function' && (binder[0] = v, v = binder),
			assignedHandler[k] = v === binder || v?.[bound] ? (v[1] ||= thisArg, v[0].bind(v[1], v[2])) : v;
		
		i = -1, assigned = { ...assigned, ...assignedHandler };
		while (++i < l) (v = opts[i]) && callback(v, assigned);
		
	}
	
}

export class StringsParser extends ParseHelper {
	
	static nest(mask, masks, input, detail, self) {
		
		const v = new String(mask.inners[0]);
		
		v[StringsParser.nests] = true,
		v[StringsParser.maskData] = mask;
		
		return v;
		
	}
	static evl(mask, masks, input, detail, self) {
		
		const v = new String(mask.inners[0]);
		
		v[StringsParser.evaluates] = true,
		v[StringsParser.maskData] = mask;
		
		return v;
		
	}
	static reference(mask, masks, input, detail, self) {
		
		const v = new String(mask.inners[0]);
		
		v[StringsParser.refers] = true,
		v[StringsParser.maskData] = mask;
		
		return v;
		
	}
	static parse(mask, masks, input, detail, self) {
		
		if (!mask.inners[0]) return mask.$;
		
		const pm = this.paramMask.getMasks(mask.inners[0]).masks;
		
		if (!pm.length) return mask.$;
		
		const	{ captor, splitted } = pm[0][0],
				{ maskData, symbol } = StringsParser,
				s = StringsParser[symbol],
				dict = this[Terms.dict];
		
		const	{ optionName, syntaxError } = StringsParser,
				assign = dict[s.assign],
				mute = dict[s.mute],
				header = splitted[1].split(assign),
				descriptor = header[0]?.trim?.(),
				label = header.length > 1 ? header?.[1]?.trim?.() : null,
				mutes = mute instanceof RegExp ? mute.test(splitted[2][0]) : splitted[2][0] === ''+mute;
		let i,l, options,opt, args, v;
		
		switch (captor) {
			
			case this.paramMask[s.sys]:
			args = splitted[3];
			break;
			
			case this.paramMask[s.syl]:
			options = splitted[3].trim(), args = splitted[5];
			break;
			
		}
		
		v = { descriptor, label, options, args, source: mask.$ }, mutes && (v = { muted: v }),
		v[maskData] = mask;
		
		return v;
		
	}
	static {
		
		this.assignedIndex = Symbol('StringsParser.assignedIndex'),
		//this.optionName = Symbol('StringsParser.optionName'),
		this.nests = Symbol('StringsParser.nests'),
		this.evaluates = Symbol('StringsParser.evaluates'),
		this.refers = Symbol('StringsParser.refers'),
		this.maskData = Symbol('StringsParser.maskData'),
		
		// esc = escape
		this[ParseHelper.esc] = new Pattern('\\'),
		
		// str = string, nst = nest, ref = reference, blk = block
		this[ParseHelper.symbolNames] = [
			
			'str', 'nst',
			'ref', 'rex', 'syx', 'sys', 'syl',
			're', 'evl', 'fnc', 'dom', 'amp', 'frk', 'ech', 'clc',
			'backwards', 'every',
			
			'bracketLeft',
			'bracketRight',
			'stringLeft',
			'stringRight',
			'nestLeft',
			'nestRight',
			'evalLeft',
			'evalRight',
			'referenceLeft',
			'referenceRight',
			'commentLeft',
			'commentRight',
			'assign',
			'mute',
			'separator',
			'not',
			'assignment',
			'regExpLeft',
			'regExpRight',
			
		];
		
		const	s = ParseHelper.setSymbols(this),
				dict = this.dict =	{
												[s.bracketLeft]: new Pattern('['),
												[s.bracketRight]: new Pattern(']'),
												[s.stringLeft]: new Pattern("'"),
												[s.stringRight]: new Pattern("'"),
												[s.nestLeft]: new Pattern('<'),
												[s.nestRight]: new Pattern('>'),
												[s.evalLeft]: new Pattern('`'),
												[s.evalRight]: new Pattern('`'),
												[s.assign]: new Pattern('='),
												[s.mute]: new Pattern(';'),
												[s.separator]: new Pattern(':'),
												[s.not]: new Pattern('!'),
												[s.referenceSign]: new Pattern('$'),
												[s.regExpLeft]: new Pattern('/'),
												[s.regExpRight]: new Pattern('/'),
											};
		
		dict[s.referenceLeft] = [ dict[s.referenceSign], dict[s.bracketLeft] ],
		dict[s.referenceRight] = dict[s.bracketRight],
		dict[s.assignment] = [ '(?:', dict[s.mute], '|', dict[s.separator], ')' ],
		
		dict[s.regExpLiteralLeft] = dict[s.regExpLeft],
		dict[s.regExpLiteralRight] = dict[s.regExpRight],
		
		this[ParseHelper.precedenceDescriptors] = [
			{ name: s.str, term: [ s.stringLeft, s.stringRight ], unmasks: true, isFlat: true },
			{ name: s.ref, term: [ s.referenceLeft, s.referenceRight ], callback: StringsParser.reference },
			{ name: s.rex, term: [ s.regExpLiteralLeft, s.regExpLiteralRight ], unmasks: true, isFlat: true },
			{ name: s.syx, term: [ s.bracketLeft, s.bracketRight ], callback: StringsParser.parse },
			{ name: s.nst, term: [ s.nestLeft, s.nestRight ], callback: StringsParser.nest },
			{ name: s.evl, term: [ s.evalLeft, s.evalRight ], callback: StringsParser.evl },
		],
		
		this.parameterPrecedence = [
			{ name: s.str, term: [ s.stringLeft, s.stringRight ], unmasks: true, isFlat: true },
			{ name: s.ref, term: [ s.referenceLeft, s.referenceRight ], esc: null, unmasks: true },
			{ name: s.nst, term: [ s.nestLeft, s.nestRight ], esc: null, unmasks: true },
			{ name: s.evl, term: [ s.evalLeft, s.evalRight ], esc: null, unmasks: true },
			{ name: s.rex, term: [ s.regExpLiteralLeft, s.regExpLiteralRight ], unmasks: true, isFlat: true },
			{ name: s.syx, term: [ s.bracketLeft, s.bracketRight ], esc: null, unmasks: true },
			{ name: s.sys, term: [ /^/g, s.assignment, /$/g ], esc: null },
			{ name: s.syl, term: [ /^/g, s.assignment, s.separator, /$/g ], esc: null },
		];
		
	}
	
	constructor(configuration, esc, dict) {
		
		const s = StringsParser[ParseHelper.symbol];
		
		super(
			configuration,
			StringsParser,
			esc,
			{ ...StringsParser.dict, ...(dict && typeof dict === 'object' ? dict : {}) }
		),
		
		this.not = new Chr(this[Terms.dict][s.not], esc),
		
		this.paramMask =
			new Terms({ precedence: StringsParser.parameterPrecedence, defaultThis: this, dict: this[Terms.dict] }),
		
		this[ParseHelper.escOwners] = [ this.paramMask ];
		
	}
	
	[ParseHelper.before](plot, plotLength, input, detail, self) {
		
		const	indexedNot = this.not.index(input), l = indexedNot.length;
		
		if (l) {
			
			const notIndices = [], { maskData } = StringsParser;
			let i,i0,p;
			
			i = -1;
			while (++i < l) notIndices[i] = indexedNot[i].lastIndex;
			
			i = -1;
			while (++i < plotLength)
				(p = plot[i]) && typeof p === 'object' && maskData in p &&
					((i0 = notIndices.indexOf(p[maskData].lo)) !== -1) &&
						(plot[i - 1] = plot[i - 1].slice(0, -indexedNot[i0][0].length), plot.splice(i--, 1), --plotLength);
			
		}
		
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
		
		let v = +mask.$;
		
		return v < 0 && ((v = [ StringsExpression[ParseHelper.symbol].minus, v ])[Term.splices] = true), v;
		
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
	static regexp(mask, masks, input, detail, self) {
		
		return new RegExp(new Pattern(mask.inners[0]), mask.splitted[2][1]);
		
	}
	
	static minus(v, left, right, idx, ldx, rdx, exp, parsed, parsedLength, plot, plotLength, input, detail, self) {
		
		(
			v = [ idx, 2 ],
			typeof left === 'symbol' ? (v[2] = right) :
												(v[2] = StringsExpression[ParseHelper.symbol].sub, v[3] = right * -1),
			v
		)[StringsExpression.splices] = true;
		
		return v;
		
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
			'rex',
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
			
			'minus',
			
			'bracketLeft',
			'bracketRight',
			'stringLeft',
			'stringRight',
			'evalLeft',
			'evalRight',
			'nestLeft',
			'nestRight',
			'groupLeft',
			'groupRight',
			'regExpLeft',
			'regExpRight',
			'regExpLiteralLeft',
			'regExpLiteralRight',
			'referenceSign',
			'number',
			'nai',
			'hu',
			'shin',
			'gi',
			'identifier',
			'comma',
			'division',
			'multiplication',
			'subtraction',
			'addition',
			'space',
			'blank',
			'referenceLeft',
			'referenceRight',
			
		];
		
		const	s = ParseHelper.setSymbols(this),
				dict = this.dict =	{
												[s.bracketLeft]: new Pattern('['),
												[s.bracketRight]: new Pattern(']'),
												[s.stringLeft]: new Pattern("'"),
												[s.stringRight]: new Pattern("'"),
												[s.evalLeft]: new Pattern('`'),
												[s.evalRight]: new Pattern('`'),
												[s.nestLeft]: new Pattern('<'),
												[s.nestRight]: new Pattern('>'),
												[s.groupLeft]: new Pattern('('),
												[s.groupRight]: new Pattern(')'),
												[s.regExpLeft]: new Pattern('/'),
												[s.regExpRight]: new Pattern('/'),
												[s.referenceSign]: new Pattern('$'),
												[s.number]: /(-?(\d+(?:\.\d+)?|Infinity)|NaN)/g,
												[s.nai]: /(?:nai|null)/g,
												[s.hu]: /(?:hu|undefined)/g,
												[s.shin]: /(?:shin|true)/g,
												[s.gi]: /(?:gi|false)/g,
												[s.identifier]: /[$A-Za-z_\u0080-\uFFFF][$\w\u0080-\uFFFF]*/g,
												[s.comma]: new Pattern(','),
												[s.division]: new Pattern('/'),
												[s.multiplication]: new Pattern('*'),
												[s.subtraction]: new Pattern('-'),
												[s.addition]: new Pattern('+'),
												[s.space]: '[\\n\\s\\t]'
											};
		
		dict[s.blank] = [ dict[s.space], '+' ],
		dict[s.referenceLeft] = [ dict[s.referenceSign], dict[s.bracketLeft] ],
		dict[s.referenceRight] = dict[s.bracketRight],
		
		dict[s.regExpLiteralLeft] = dict[s.regExpLeft],
		dict[s.regExpLiteralRight] = dict[s.regExpRight],
		
		this.opsPrecedence = [
			{ sym: s.minus, callback: StringsExpression.minus },
			{ sym: s.div, callback: StringsExpression.div },
			{ sym: s.mul, callback: StringsExpression.mul },
			{ sym: s.sub, callback: StringsExpression.sub },
			{ sym: s.add, callback: StringsExpression.add }
		],
		
		this[ParseHelper.precedenceDescriptors] = [
			
			{ name: s.str, term: [ s.stringLeft, s.stringRight ], callback: StringsExpression.string },
			{ name: s.evl, term: [ s.evalLeft, s.evalRight ], callback: StringsExpression.eval },
			{ name: s.nst, term: [ s.nestLeft, s.nestRight ], callback: StringsExpression.nest },
			{ name: s.grp, term: [ s.groupLeft, s.groupRight ], callback: StringsExpression.group },
			{ name: s.ref, term: [ s.referenceLeft, s.referenceRight ], callback: StringsExpression.identify },
			{ name: s.rex, term: [ s.regExpLiteralLeft, s.regExpLiteralRight ], isFlat: true, callback: StringsExpression.regexp },
			{ name: s.num, term: [ s.number ], callback: StringsExpression.number },
			{ name: s.nai, term: [ s.nai ], callback: null },
			{ name: s.hu, term: [ s.hu ], callback: undefined },
			{ name: s.shin, term: [ s.shin ], callback: true },
			{ name: s.gi, term: [ s.gi ], callback: false },
			{ name: s.idt, term: [ s.identifier ], callback: StringsExpression.identify },
			{ name: s.cmm, term: [ s.comma ], callback: s.cmm },
			{ name: s.div, term: [ s.division ], callback: s.div },
			{ name: s.mul, term: [ s.multiplication ], callback: s.mul },
			{ name: s.sub, term: [ s.subtraction ], callback: s.sub },
			{ name: s.add, term: [ s.addition ], callback: s.add },
			{ name: s.spc, term: [ s.blank ], callback: Term.deletes }
			
		];
		
	}
	
	constructor(configuration, esc, dict) {
		
		super(
			configuration,
			StringsExpression,
			esc,
			{ ...StringsExpression.dict, ...(dict && typeof dict === 'object' ? dict : {}) }
		);
		
		//const regExpRight = dict[StringsExpression[ParseHelper.symbol].regExpRight];
		//
		//this.regExpLiteralClosure = new Chr(regExpRight?.source ?? regExpRight, esc),
		//hi(this.regExpLiteralClosure.index('/\\//'));
		//for test
		//hi(this[StringsExpression[ParseHelper.symbol].rex],this[StringsExpression[ParseHelper.symbol].rex].plot('1 /a/,/b/gi,/3/,1 /b/2'));
		//hi(this[StringsExpression[ParseHelper.symbol].rex].plot('1 /a/ ,a /b/ b,/3/,/b/2'));
		//hi(this[StringsExpression[ParseHelper.symbol].rex].plot('/\\//'));
		
		this[ParseHelper.escOwners] = []
		
	}
	
	express(exp, args) {
		
		let xl;
		
		xl = exp.length;
		
		if (exp[0]?.[StringsExpression.nests]) return xl === 1 ?
			exp[0] : (console.error(new SyntaxError('Nesting value must be specified alone.')), ParseHelper.syntaxError);
		
		const	{ bound, cursor, isGroup, opsPrecedence, splices } = StringsExpression,
				ol = opsPrecedence.length,
				{ isArray } = Array, { splice } = Array.prototype;
		let i,l,i0, x,x0, xl0, op,v, li,ri, spliceArgsLength, sym,cb,hasCb;
		
		i = xl;
		while (--i > -1) {
			typeof (x = exp[i]) === 'function' ?
				i += 2 :
				isArray(x) && (
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
		
		this.anonDescriptor = Symbol('StringsDescriptor.anonDescriptor'),
		this.deletes = Symbol('StringsDescriptor.deletes'),
		this.reflects = Symbol('StringsDescriptor.reflects'),
		this.variadic = Symbol('StringsDescriptor.variadic');
		
	}
	
	constructor() {
		
		this.descriptor = {},
		
		arguments.length && this.register(...arguments);
		
	}
	
	get(parameter, assigned, property) {
		
		const	{ anonDescriptor, variadic } = StringsDescriptor,
				descriptor = this.descriptor[parameter.descriptor || anonDescriptor];
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
		
		const { anonDescriptor } = StringsDescriptor;
		
		switch (typeof descriptor) {
			
			case 'number':
			descriptor += '';
			case 'string': case 'symbol':
			this.registerCallback(descriptor || anonDescriptor, describe, asValue);
			break;
			
			case 'object':
			if (descriptor) {
				
				if (Array.isArray(descriptor)) {
					
					const l = descriptor.length;
					let i;
					
					i = -1;
					while (++i < l) this.register(descriptor[i], describe, asValue);
					
				} else {
					
					let k;
					for (k in descriptor) this.register(k, descriptor[k], asValue);
					
				}
				
				break;
				
			}
			
			default:
			this.registerCallback(descriptor ? ''+descriptor : anonDescriptor, describe, asValue);
			
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

// Options

class OptionDuplicator {
	
	static dup(numbers, separator) {
		
		this[Composer.repetition] = Number.isNaN(numbers = +numbers|0) ? 1 : Math.max(numbers, 0),
		this[Composer.separator] = separator;
		
	}
	
}
strings.opt.register([ 'dup' ], [ OptionDuplicator.dup ], true);

// Functions

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
strings.register([ '', 'I' ], [ Inline.describe, Inline ]);

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

class Agent {
	
	static describe(urls, type, timeout, interval, dev) {
		
		const	{ $, reflections } = Composer, reflectors = [ [ this.fetch, $, [ ...arguments ] ] ];
		
		reflectors[reflections] = true;
		
		return reflectors;
		
	}
	
	static int(v, defaultValue = 0, min = defaultValue) {
		
		return Math.max(Number.isNaN(v = +v|0) ? defaultValue : v, min);
		
	}
	static fetch(urls, type, timeout, interval, dev) {
		
		if (urls === undefined || urls === null) return '';
		
		Array.isArray(urls) || (urls = [ urls ]);
		
		const	l = urls.length,
				current = location.origin + location.pathname,
				{ request, int, standby } = Agent,
				awaits = (interval = int(interval, 0, -1)) > -1;
		let i;
		
		i = -1;
		while (++i < l) this[i] = awaits && i ?	this[i - 1].then(standby(urls[i], current, type, timeout, interval, dev)) :
																request(urls[i], current, type, timeout, dev);
		
		return Composer.noReturnValue;
		
	}
	static standby(url, current, type, timeout, interval, dev) {
		
		return () =>	new Promise(
								rs => setTimeout(
											() => Agent.request(url, current, type, timeout, dev).catch(error => error).then(v => rs(v)),
											Agent.int(interval, 0)
										)
							);
		
	}
	static request(url, current, type = 'text', timeoutDuration = 30000, dev) {
		
		const { int, timeout, typeRx, types, } = Agent;
		
		if (!((type = typeof type === 'string' ? type.replace(typeRx, '$&').toLowerCase() : 'text') in types)) return '';
		
		const urlObject = new URL(url, current);
		
		type = Agent.types[type],
		timeoutDuration = int(timeoutDuration, 30000, -1),
		
		dev && console.info('[Strings]', 'LOAD', url, urlObject);
		
		return new Promise((rs, rj) => {
				
				const ac = new AbortController();
				
				fetch(urlObject+'', { signal: ac.signal }).then(response => rs(response)).catch(error => rj(error)),
				
				timeoutDuration > -1 && setTimeout(timeout, timeoutDuration, ac, rj);
				
			}).then(response => response[type]()).catch(error => error);
		
	}
	static timeout(abortController, reject) {
		
		abortController.abort(),
		reject(new Error('timeouted'));
		
	}
	
	static {
		
		this.types = {
			arraybuffer: 'arrayBuffer',
			blob: 'blob',
			clone: 'clone',
			error: 'error',
			formData: 'formData',
			json: 'json',
			redirect: 'redirect',
			text: 'text'
		},
		
		this.typeRx = new RegExp(`^${Object.keys(this.types).join('|')}$`, 'i');
		
	}
	
}
strings.register([ 'dl', 'fetch' ], [ Agent.describe, Agent ]);

class Fetch {
	
	static determine(type, ...args) {
		
		switch (type) {
			case 'selector': break;
			default:
			args = [ args[0], null, null, ...args.slice(1) ];
		}
		
		return this.describe(type, ...args);
		
	}
	
	static describe(type, urls, selector = ':root', propertyName = [ 'innerHTML' ], regexp, replacer = '', interval = -1, timeout = 30000) {
		
		const	args = [ ...arguments ],
				{ $, each, reflections, spreads } = Composer,
				reflectors = [ [ Agent.fetch, $, [ urls, 'text', timeout, interval ] ] ];
		let i;
		
		i = 0;
		
		switch (type) {
			case 'selector':
			reflectors[++i] = [ this.reflect, $, [ selector, propertyName ] ],
			reflectors[i][each] = true,
			reflectors[i][spreads] = true;
			break;
			default:
			reflectors[++i] = [ this.fetchedText, $, [] ],
			reflectors[i][each] = true;
		}
		
		(typeof regexp === 'string' || regexp instanceof RegExp) &&
			((reflectors[++i] = [ String.prototype.replace, $, [ regexp, replacer ] ])[each] = true),
		
		reflectors[reflections] = true;
		
		return reflectors;
		
	}
	
	static fetchedText() {
		
		return this || document.documentElement.innerHTML;
		
	}
	static reflect(selector, propertyName) {
		
		return typeof this === 'string' ?	Fetch.load(this, selector, propertyName) :
														Fetch.fetch(document.querySelectorAll(selector), propertyName);
		
	}
	
	static load(srcdoc, selector, propertyName) {
		
		return new Promise(rs => {
				
				const	iframe = document.createElement('iframe'),
						// https://developer.mozilla.org/ja/docs/Web/API/crypto_property
						signature = crypto.getRandomValues(new Uint32Array(1)).join(),
						received = message => message.data?.signature === signature && (
									iframe.contentWindow.removeEventListener('message', received),
									iframe.remove(),
									rs([ ...message.data.values ])
								),
						loaded = event => {
								const { contentWindow } = iframe;
								contentWindow.addEventListener('message', received),
								contentWindow.postMessage(
									{
										signature,
										values: Fetch.fetch(contentWindow.document.querySelectorAll(selector), propertyName)
									},
									location.origin
								)
							};
				
				iframe.srcdoc = srcdoc,
				iframe.addEventListener('load', loaded, { once: true }),
				document.body.appendChild(iframe);
				
			});
		
	}
	static fetch(nodes = [], propertyName = [ 'innerHTML' ], values = [], returnValue) {
		
		const	l = nodes.length,
				requiresAttr = typeof propertyName === 'string',
				pl = propertyName?.length;
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
		
		return returnValue || values;
		
	}
	static {
		
		this.determine[StringsDescriptor.variadic] = true;
		
	}
	
}
strings.register([ 'dlt', 'fetchtext' ], [ Fetch.determine, Fetch, [ 'text' ] ]),
strings.register([ '$', 'dom' ], [ Fetch.determine, Fetch, [ 'selector' ] ]);

export class Composer {
	
	static {
		
		this.$ = Symbol('Composer.$'),
		this.each = Symbol('Composer.each'),
		this.exec = Symbol('Composer.exec'),
		this.reflection = Symbol('Composer.reflection'),
		this.reflections = Symbol('Composer.reflections'),
		this.nope = Symbol('Composer.nope'),
		this.noReturnValue = Symbol('Composer.noReturnValue'),
		
		// 関数の戻り値の要素がイテレーター関数を持っていた場合、スプレッド記法によるその要素の展開結果を、戻り値のその要素の位置に置き換える。
		// 説明は難解だが、処理的には Array.prototype.flat と似ていて、
		// 例えば関数 r の戻り値が [ [ 0, 1, 2 ], [ 3, 4, 5 ] ] で、r[spreads] = true だった場合、
		// 戻り値は、[ 0, 1, 2, 3, 4, 5 ] になる。
		// より高度な使い方として、また本来の想定ケースとして、
		// Promise を返す関数で、その Promise が配列で解決される場合に、関数に [spreads] = true を設定すると、
		// その関数の戻り値はその関数指定内で自己完結的に実際に使用可能な戻り値を生成できる。
		// この説明も非常に直感的ではないが、例えば戻り値が [ Promise, Promise, ... ] で、
		// この Promise が解決された時に [ [ ... ], [ ... ], ... ] となった場合、[spreads] = true であれば、
		// この関数後に、[ Array.prototype.flat, ... ] 的な処理を加えなくても、戻り値は単独で [ ... ] となる。
		// 実際問題、仮に [ Array.prototype.flat, ... ] を加えても、戻り値は [ [ ... ], [ ... ], ... ] のままである。
		// なぜなら Array.prototype.flat の戻り値は配列であるため、仮にその実行スコープを戻り値そのものにしても、
		// ネストを含む配列を一元化された配列が、戻り値の配列内の要素のひとつとして列挙されるためである。
		// こうした処理は、一見するとフラグで指定しなくても自動で行なうようにすればいいかもしれないが、
		// 将来的に、配列を含む戻り値を許容する可能性を想定している。
		this.spreads = Symbol('Composer.spreads'),
		
		this.link = Symbol('Composer.link'),
		
		this.muted = Symbol('Composer.muted'),
		
		this.rejectedPromise = Symbol('Composer.rejectedPromise'),
		
		this.valuesOptions = [
			this.repetition = Symbol('Composer.repetition'),
			this.separator = Symbol('Composer.separator'),
			this.reflections
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
	
	//static compose(parts, promises) {
	//	
	//	const v = Composer.resolveComposition(Composer.getComposer(parts));
	//	
	//	return v instanceof Promise || !promises ? v : Promise.resolve(v);
	//	
	//}
	//static resolveComposition(generator, resolver) {
	//	
	//	const { done, value } = generator.next();
	//	
	//	return done ?
	//				resolver?.(value) ?? value :
	//				value instanceof Promise ?
	//					resolver ?	value.then(v => Composer.resolveComposition(generator, resolver)) :
	//									new Promise(rs => value.then(() => Composer.resolveComposition(generator, rs))) :
	//					resolver?.(generator.next().value) ?? value;
	//	
	//}
	
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
		
		let i,i0,l0, p, v, composed, mutes, source, every,backwards, handler, values, method;
		const	l = (Array.isArray(parts) ? parts : (parts = [ parts ])).length,
				snapshots = [], sources = [],
				{ compose, copySelectedProperties, fulfill, link, reflect, reflections, rejectedPromise, repetition, separator, valuesOptions } = this,
				{ isNaN } = Number, { max } = Math, { isArray } = Array;
		
		i = -1, composed = [];
		while (++i < l) {
			
			values ||= [];
			
			switch (typeof (p = parts[i])) {
				
				case 'object': case 'undefined':
				
				if (!p) continue;
				
				(mutes = 'muted' in p) ?
					values.push(...compose([ p.muted ])) :
					(
						isArray(v = p.v) ? v[reflections] ? reflect(v, values) : values.push(...v) : (values[0] = v),
						copySelectedProperties(values, p, valuesOptions)
					);
				
				break;
				
				case 'number':
				
				isNaN(p = p|0) || (p < 0 ? (p = l - p) < 0 : p >= l) || p === i || (snapshots[i] = sources[i] = p);
				
				continue;
				
				default: values[0] = p;
				
			}
			
			snapshots[i] = mutes ? values : copySelectedProperties([ ...(sources[i] = values) ], values, valuesOptions),
			
			values = mutes = null;
			
		}
		
		(p = fulfill(sources, snapshots)) && (yield p),
		
		i = -1;
		while (++i < l) {
			
			if (!(i in sources)) continue;
			
			typeof (source = sources[i]) === 'number' ? 
				isArray(values = snapshots[(every = (source = source|0) < 0) ? source * -1 : source]) &&
					(every || copySelectedProperties(source = [ ...values ], values, valuesOptions)) :
				parts[i] && typeof parts[i] === 'object' &&
					(backwards = parts[i].backwards, every = parts[i].every),
			
			i0 = -1, l0 = repetition in source ? isNaN(l0 = +source[repetition]|0) ? 1 : max(l0, 0) : 1,
			handler = Composer[backwards ? 'everyReverse' : every ? 'every' : 'mix'];
			while (++i0 < l0) composed = handler(composed, source, i0 ? source?.[separator] ?? '' : '');
			
		}
		
		return composed;
		
	}
	static fulfill(sources, snapshots) {
		
		const l = sources.length;
		let i,i0,l0, s, hasPromise;
		
		i = -1;
		while (++i < l) {
			i0 = -1, l0 = (Array.isArray(s = sources[i]) ? s : (s = [ s ])).length;
			while (++i0 < l0 && !(s[i0] instanceof Promise));
			if (hasPromise = i0 < l0) break;
		}
		
		return hasPromise && new Promise((rs, rj) => {
				
				const promises = [], { isArray } = Array;
				let i,i0,l0, s,p;
				
				i = -1;
				while (++i < l) {
					i0 = -1, l0 = (p = promises[i] = Promise.allSettled(isArray(s = sources[i]) ? s : [ s ])).length;
					while (++i0 < l0) p[i] instanceof Promise || (p[i] = Promise.resolve(p[i]));
				}
				
				Promise.all(promises).then(promised => {
						
						const { insertValue, fulfill, nope, reflect, reflections, spreads } = Composer;
						let i,i0,l0,i1, v,v0, s,ss, spreadsValue;
						
						i = -1;
						while (++i < l) {
							
							if (!isArray(s = sources[i])) continue;
							
							i0 = -1, l0 = (v = promised[i]).length;
							while (++i0 < l0) (v0 = v[i0]).status === 'rejected' ? (v.splice(i0--, 1), --l0) :
								(v0.value === nope ? (i0 = l0) : (v[i0] = v0.value));
							
							// promised に列挙された要素が持つプロパティ value に、Composer.nope を示す値がある場合、
							// その promised 全体の要素の value は、sources に反映されない。
							// この nope は、promised が解決される過程で、sources の参照を用いて、
							// 既に同値に値を設定済みである場合に、そのことを明示するために用いる。
							// この仕様は若干難解なため、より簡素化できるならそれに置き換えるべき。
							
							ss = snapshots[i];
							
							if (i0 <= l0) {
								
								i0 = -1, l0 = v.length, spreadsValue = s[spreads], s.length = ss.length = 0;
								while (++i0 < l0) (i1 = insertValue(v[i0], v, i0, spreadsValue)) && (i0 += i1, l0 += i1);
								s.push(...v);
								
							}
							
							ss.push(...s);
							
						}
						
						i = -1;
						while (++i < l) isArray(ss = (s = sources[i])[reflections]) && reflect(ss, s);
						
						fulfill(sources, snapshots)?.then?.(rs) ?? rs();
						
					});
				
			});
			
	}
	static reflect(reflectors, values) {
		
		const	{ $, each, noReturnValue, insertValue, reflections, replaceValue, spreads } = Composer,
				{ iterator } = Symbol,
				{ apply } = Reflect,
				l = reflectors.length;
		let i,i0,l0, v,r, method,itr, args, spreadsValue;
		
		i = -1;
		while (++i < l) {
			
			spreadsValue = (r = reflectors[i])[spreads];
			
			if (each in r) {
				
				if (r[each]) {
					
					i0 = -1, l0 = values.length;
					while (++i0 < l0)
						v = replaceValue(r, $, values[i0]),
						(v = insertValue(
												apply(typeof v[0] === 'function' ? v[0] : v[1][v[0]], v[1], v[2]),
												values,
												i0,
												spreadsValue
											)) && (i0 += v, l0 += v);
					
				} else if (typeof r?.[1][iterator] === 'function') {
					
					i0 = -1, method = r[0], itr = r[1][iterator](), args = r[2];
					for (v of itr) i0 += insertValue(apply(typeof method === 'function' ? method : v[method], v, args), values, ++i0, spreadsValue);
					
				}
				
			} else	v = apply(typeof (v = replaceValue(r, $, values))[0] === 'function' ? v[0] : v[1][v[0]], v[1], v[2]),
						v === noReturnValue || insertValue(v, values, 0, spreadsValue);
			
			i0 = -1, l0 = values.length;
			while (++i0 < l0 && !(values[i0] instanceof Promise));
			
			if (i0 === l0) continue;
			
			++i === l || (values[spreads] = spreadsValue, values[reflections] = reflectors.slice(i));
			break;
			
		}
		
		return values;
		
	}
	static insertValue(v, values, index = values.length, spreads) {
		
		return spreads && typeof v[Symbol.iterator] === 'function' ?
			values.splice(index, 1, ...v).length : (values[index] = v, 0);
		
	}
	static copySelectedProperties(target, source, names) {
		
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