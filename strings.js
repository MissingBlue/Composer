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
	// すべての要素にはプロパティ input があり、、これは一致検索の文字列全体を示す。
	// つまり各要素の input は重複しており、仮にその文字列が非常に巨大だった場合、リソースに負荷を与えることが予想される。
	// このプロパティ input は、現状では（多分）使用していないため、削除するか、別に一元化してプロパティとして保存しても恐らく問題はないと思われる。
	// ただし、単純に削除した場合、出力から入力を復元することができなくなる点に留意が必要。
	setCache(matched, handler) {
		
		const cache = this.cache, input = matched[0]?.input;
		
		if (!(input in cache)) {
			
			const	indices = [], lastIndices = [], cacheData = cache[input] = { indices, lastIndices, matched },
					l = matched.length, handles = typeof handler === 'function';
			let i,i0, m;
			
			i = i0 = -1;
			while (++i < l) ((m = matched[i]).captor = this, !handles || handler(m, i,l, cacheData)) &&
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
		
		this.masked instanceof Indexer ? this.masked.clearCache() : (this.masked = new Indexer());
		
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
	static copyChr(a, esc) {
		
		return a instanceof Chr ? a.duplicate() : new Chr(a, undefined, esc);
		
	}
	static sortLocales(a, b) {
		return a.lo - b.lo;
	}
	static plot(str, ...data) {
		
		if (!(str += '')) return [ '' ];
		
		const dl = data.length;
		
		if (!dl) return [ str ];
		
		const locs = [];
		let i,i0,l0,li, datum;
		
		i = li = -1;
		while (++i < dl) {
			i0 = -1, l0 = (datum = data[i]).length;
			while (++i0 < l0) locs[++li] = datum[i0];
		}
		
		if (li === -1) return [ str ];
		
		const sl = str.length - 1, result = [], max = Math.max, min = Math.min;
		let loc,sub,cursor;
		
		i = i0 = -1, cursor = 0, ++li, locs.sort(Brackets.sortLocales);
		while (++i < li) {
			(sub = str.substring(cursor, max((loc = locs[i]).lo, 0))) && (result[++i0] = sub);
			if (min(cursor = (result[++i0] = loc).ro, sl) === sl) break;;
		}
		cursor < sl && (result[++i0] = str.substring(cursor));
		
		return result;
		
	}
	
	constructor(l, r, esc) {
		
		this.setLR(l, r, esc);
		
	}
	
	setLR(l,r, esc) {
		
		this.setL(l, esc), this.setR(r, esc);
		
		return this;
		
	}
	setL(l, esc) {
		
		return this.setChr('l', 'r', l, esc);
		
	}
	setR(r, esc) {
		
		return this.setChr('r', 'l', r, esc);
		
	}
	setChr(k, dk, chr = Brackets.chr, esc) {
		
		//return this[k] = chr instanceof Chr ? chr : Brackets.copyChr(chr || this[dk], esc);
		return this[k] =	chr instanceof Chr ? chr :
									chr ? new Chr(chr, undefined, esc) :
										this[dk] instanceof Chr ? this[dk] : new Chr(this[dk] || Brackets.chr, undefined, esc);
		
	}
	
	mask(str, ...masks) {
		
		return { l: this.l.mask(str, ...masks), r: this.r.mask(str, ...masks) };
		
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
			while (--i0 > -1 && ((L = lI[i0]).index + L[0].length > RI || localedL.indexOf(i0) !== -1));
			if (i0 > -1) {
				localedL[++mi] = i0,
				locale = locales[mi] = { l: L, lo: L.index, li: L.index + L[0].length, r: R, ri: RI, ro: RI + R[0].length },
				locale.inner = str.substring(locale.li, locale.ri),
				locale.outer = str.substring(locale.lo, locale.ro),
				locale.captor = this;
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

// todo:
// 	<...> で、属性やstyle、dataset へのアクセス方法など。
// 	(...) の再帰をほぼ検証していないため動作確認。
// 	構文の繰り返し。（正規表現の {n} のような）
// 	dom で外部 HTML を読み込み。（これは無理？）
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
// <...>
// 	スクリプトの実行スコープが属するドキュメントから、セレクターに一致するすべての要素の、指定したプロパティの値で文字列を生成する。
// 	<'セレクター', '属性名'> で実行する。属性名を省略した場合、選択要素の textContent に置き換わる。
// (...)
// 	括弧内のコンマで区切られた値で分岐させる。値間は | で区切る。
// 	この中の値は、Strings.get を再帰して処理される。
// 	そのため、文字列の指定は ' で囲わずに行なう必要がある。
// 	そして再帰されるため、任意の構文を必要に応じて使用することができる。
// 	再帰前にラベル付けした値も再帰先から参照できる。（ただし再帰先で同名のラベルを付けた場合、再帰前の同名ラベルはそのラベルの値で上書きされる）
// :, ;
// 	[labeled: ...] のように、各括弧内の行頭から : ないし ; までの間はラベルとして認識される。
// 	ラベルを : で閉じた場合、その括弧の値はその場で展開されると同時にラベル付けされて記録もされる。
// 	ラベルを ; で閉じた場合、その括弧の値はラベル付けされて後方参照が可能になるが、その場での展開はされない。
// 	ラベル付けされた値を再利用するには、それより後方で下記構文 *...* を使う。
// 	なお、実際には、すべての構文にラベルが暗黙に割り当てられる。
// 	明示的にラベルを指定していない構文に対しては、ただの文字列も含め、全体の左から数えたその構文の位置が便宜的なラベルになる。
// 	例えば "a(b|c)d*1**2*"の場合、生成される文字列は [ 'abdbd', 'abdcd', 'acdbd', 'acdcd' ] である。
// 	この出力は、明示的にラベル付けした "a(1:b|c)(2:d)*1**2*" の出力と等価である。
// *...*
// 	ラベル名をアスタリスクで囲んだものは、そのラベルの値で代替される。
// 	この構文を使用する時、ラベル名の先頭に / を付けると、ラベル付けされた値の適用方法を切り替える。
// 	/ なしの場合、値は それ以前に生成されたすべての文字列 * ラベル付けされた値が持つ文字列の数 分生成される。
// 	/ を付けた場合、ラベル付けされた値は単純にそれまで生成された文字列に結合され、ラベル付けされた値の数 < それまでに生成された文字列の数 だった場合、
// 	ラベル付けされた値は不足に達した時点でラベル付けされた値内を周回して不足分を補う。
// 	以下は動作モードの違いによる出力の例。
// 	labeled = [ 0, 1, 2 ], strings = [ 'a', 'b', 'c', 'd', 'e' ]
// 	Strings.get("[labeled;0,2,1]['a','e',1]*labeled*");
// 		// [ 'a0', 'a1, 'a2', 'b0', 'b1', 'b2', 'c0', 'c1, 'c2', 'd0', 'd1, 'd2', 'e0', 'e1, 'e2' ]
//		Strings.get("[labeled;0,2,1]['a','e',1]*/labeled*");
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
// 	ただし、この場合、指定するラベルは JavaScript の識別子が定める命名規則に従っていなければならない。
// 	https://developer.mozilla.org/ja/docs/Glossary/Identifier
//
// エスケープも含め、上記の構文文字は任意の文字に変更しようと思えばできなくはないが、一切動作検証していないので強く推奨しない。

// 使用例:
// 	Strings.get("a`return '0'+1;`[label:0,5,1,5,'_',2,'_']<'#id[id=\"sample\"]', 'textContent'>(a|b)*label*");
export class Strings {
	
	static {
		
		// esc = escape, str = string
		const	esc = this.esc = new Sequence('\\'),
				str = this.str = new Brackets("'","'", esc),
				evl = this.evl = new Brackets('`','`', esc);
		
		// fnc = function, dom = document object model, amp = amplifier, frk = fork, lbl = label, re = recycle
		this.fnc = new Brackets('{','}', esc),
		this.fnc = new Brackets('{','}', esc),
		this.dom = new Brackets('<','>', esc),
		this.amp = new Brackets('[',']', esc),
		this.frk = new Brackets('(',')', esc),
		//this.lbl = /^(.*?):/;
		this.lbl = new Chr(/^(.*?)(;|:)/g, undefined, esc),
		this.dup = new Chr(/\^\s*?(\d+)\s*(?:,((?:.|\s)*?))?$/g, undefined, esc),
		this.re = new Brackets('*','*', esc),
		this.reFlag = '/',
		
		// dot, cmm = comma, or, num = number, stx = regeXp for STring, evx = regexp for eval,
		// idt = identify (= labeled value)
		this.dot = new Chr('.', undefined, esc),
		this.cmm = new Chr(',', undefined, esc),
		this.or = new Chr('|', undefined, esc),
		this.num = /^\s*(-?\d+(?:\.\d+)?)\s*$/,
		this.stx = new RegExp(`^\\s*${str.l.unit.source}(.*)${str.r.unit.source}\\s*$`),
		this.evx = new RegExp(`^\\s*${evl.l.unit.source}(.*)${evl.r.unit.source}\\s*$`),
		this.idt = /^\s*([$A-Za-z_\u0080-\uFFFF][$\w\u0080-\uFFFF]*)\s*$/g,
		
		// 実際に使用される主な構文を優先順で列挙したリスト。
		// 一切検証していないが、使用する構文の可否をこの値の変更だけで任意に行なえるかもしれない。
		// 例えばセキュアであることが求められる場合、以下の this.evl を消すことで簡易に対応できる。
		this.hierarchy = [
			str,
			this.re,
			this.evl,
			this.dom,
			[ this.amp, this.frk ]
		],
		
		this.cache = {};
		
	}
	
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
	// named は、hierarchy の Brackets が Object のプロパティとして指定された場合、その OBject のプロパティ name をプロパティ名にして、
	// named の中にプロパティとして設定される。
	// Strings.locate(str, [ brk0, { target: brk1, name: 'stuff' } ]);
	// 	// = { data: [ locale0, locale1 ], named: { stuff: locale1 } }
	// named も、hierarchy のネストを考慮しない。name の重複は後続の結果で上書きされる。
	// 基本的にはこの関数は内部処理以外で使うことを想定しておらず、
	// さらに言えばコードの平易化以外を目的としていないが、入力が適切であれば（この関数が持つ目的に対して）汎用的に動作すると思われる。
	// 当初はネスト後、さらにネストした先の Brackets.locate の結果は、後続の Brackets.locate の引数に含ませないようにするつもりだったが（直系ではないため）、
	// 非常に複雑な仕組みが必要になりそうなわりに、現状ではそうしたケースに対応する必要がないため、現状のような簡易なものにしている。
	// 今の仕様でこうした状況に対応する場合、異なる hierarchy を作成し、個別に実行することで対応が期待できるかもしれない。
	// 同じように、現状では存在しないが、Brackets.locate 相当のメソッドを持つ Brackets 以外のオブジェクトに対応する必要もあるかもしれない。
	// 仕組みが仕様と密接に結びついており、コードだけ見ても存在理由が理解し難いため、比較的詳細な説明を記しているが、
	// 目的そのものは上記の通り単なる可読性の向上のため以上のものではなく、重要性の低い処理を担っている。
	// 例えば Strings.get 内にある "Brackets.plot(v, ...Strings.locate(v).data.slice(1))" で
	// 第二引数以下に渡す引数を直接指定することができるのであれば、この関数はまったく必要ない。
	static locate(str, hierarchy = Strings.hierarchy, result = { data: [], named: {} }) {
		
		let i;
		
		if (Array.isArray(hierarchy)) {
			
			let l0, data = result.data;
			const l = hierarchy.length, stored = data, current = [], locate = Strings.locate;
			
			i = -1, l0 = stored.length;
			while (++i < l)	Array.isArray(hierarchy[i]) && (result.data = data = [ ...stored ]),
									locate(str, hierarchy[i], result),
									data === stored ?	(l0 = stored.length) :
															(current.push(...data.slice(l0)), result.data = data = stored);
			current.length && stored.push(...current);
			
		} else if (hierarchy && typeof hierarchy === 'object') {
			
			const { data, named } = result;
			
			hierarchy = data[data.length] =
				(hierarchy instanceof Brackets ? hierarchy : (i = hierarchy?.name, hierarchy.target)).locate(str, ...data),
			i && (named[i] = hierarchy);
			
		}
		
		return result;
		
	}
	
	static get(v, labeled = {}) {
		
		if (v in this.cache) return this.cache[v];
		
		const locs = [ ...Strings.locate(v).data ],
				plot = Brackets.plot(v, ...(locs.splice(Strings.hierarchy.indexOf(Strings.str), 1), locs)),
				l = plot.length, values = [];
		let i;
		
		//hi(plot);
		
		i = -1;
		while (++i < l) values[i] = Strings.parseBlock(plot[i], labeled);
		
		//hi(...values, labeled);
		
		const composed = Composer.compose(values), cl = composed.length;
		
		i = -1;
		while (++i < cl) composed[i] = Strings.esc.replace(composed[i]);
		
		return this.cache[v] = composed;
		
	};
	static parseBlock(block, labeled = {}) {
		
		let l;
		
		labeled.v ||= {}, l = (labeled.addr ||= []).length;
		
		if (typeof block === 'string') {
			labeled.addr[l] = ''+l;
			return block;
		}
		
		const masks = [ Strings.re, Strings.str, Strings.evl ],
				{ label, registers, inner } = Strings.parseInner(block.inner, block.captor === Strings.evl);
		let i,i0,l0, args, v,vi, arg;
		//hi(Strings.dup.mask(block.l.input.substring(0,block.l.index), ...Strings.locate(block.l.input, masks).data).unmasked?.[0]);
		
		labeled.addr[l] = label || ''+l;
		
		switch (block.captor) {
			
			case Strings.evl:
			v = (new Function('labeled', inner))(labeled.v);
			break;
			
			case Strings.fnc:
			
			args = Strings.getArgs(inner, labeled, ...Strings.locate(inner, masks).data),
			
			v = {
				methods: [
					{ value: args[0], name: args[1], args: args.slice(2) }
				]
			};
			
			break;
			
			case Strings.amp:
			
			args = Strings.getArgs(inner, labeled, ...Strings.locate(inner, masks).data),
			
			v = { from: args[0], to: args[1], value: args[2] },
			args.length > 3 && (
				v.methods = [
					{
						name: (args[3] = args?.[3] ?? 0) > 0 ? 'padStart' : 'padEnd',
						args: [ Math.abs(args[3]), args?.[4] ?? undefined ]
					}
				]
			);
			
			break;
			
			case Strings.frk:
			i = vi = -1, masks[masks.length] = Strings.frk,
			l = (args = Strings.or.split(inner, ...Strings.locate(inner, masks).data)).length, v = [];
			while (++i < l) {
				i0 = -1, l0 = (arg = Strings.get(args[i], labeled))?.length ?? 0;
				while (++i0 < l0) v[++vi] = arg[i0];
			}
			break;
			
			case Strings.re:
			v = (v = labeled.addr.indexOf(inner)) === -1 ? '' : inner[0] === this.reFlag ? -v|0 : v;
			break;
			
			case Strings.dom:
			args = Strings.getArgs(inner, labeled, ...Strings.locate(inner, masks).data),
			v = {
				selector: args?.[0],
				propertyName: args?.[1]
			};
			break;
			
			default:
			v = inner;
			
		}
		
		label && (labeled.v[label] = v);
		
		return registers ? { neglect: v } : v;
		
	}
	static parseInner(inner, unlabels) {
		
		const	{ str, evl } = Strings,
				sLocs = str.locate(inner),
				eLocs = evl.locate(inner),
				label = unlabels || Strings.lbl.mask(inner, sLocs, eLocs).unmasked?.[0],
				labeled = label && !unlabels;
		
		return {
				label: label && label[1],
				registers: label?.[2] === ';',
				strLocs: labeled ? str.locate(inner = inner.substring(label.index + label[0].length)) : sLocs,
				evlLocs: labeled ? evl.locate(inner) : eLocs,
				inner
			};
		
	}
	static getArgs(str, labeled, ...locs) {
		
		const args = Strings.cmm.split(str, ...locs), l = args.length;
		let i;
		
		i = -1;
		while (++i < l) args[i] = Strings.settle(args[i], labeled);
		
		return args;
		
	}
	static settle(str, labeled) {
		
		let matched;
		
		return	(matched = str.match(Strings.num)) ? +matched[1] :
						(matched = str.match(Strings.stx)) ? matched[1] :
							(matched = str.match(Strings.evx)) ? (new Function('labeled', matched[1]))(labeled) :
								(labeled && typeof labeled === 'object' && (matched = str.match(Strings.idt))) ?
									labeled?.[matched[1]] ?? undefined : undefined;
		
	}
	
}

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
	static compose(parts) {
		
		const	l = (Array.isArray(parts) ? parts : (parts = [ parts ])).length, URLs = [], values = [], snapshots = [];
		let i,i0,l0, p, nodes,propertyName, composed = [], neglects;
		
		i = -1;
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
					
					Composer.select(p.selector, p.propertyName, values);
					
				} else if ('from' in p || 'to' in p || 'value' in p)
					Composer.increase(p?.from ?? 0, p?.to ?? 1, p?.value ?? 1, values);
				
				Array.isArray(p.methods) && Composer.applyAll(p.methods, values);
				
				break;
				
				case 'number':
				
				if (!Array.isArray(p = snapshots[(i0 = (p = p|0) < 0) ? p * -1 : p])) continue;
				
				if (i0) {
					
					Composer.every(composed, p);
					continue;
					
				}
				
				values.push(...p);
				
				break;;
				
				default: values[0] = p;
				
			}
			
			snapshots[i] = [ ...values ],
			
			neglects || (composed = Composer.mix(composed, values)), values.length = 0, neglects = null;
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