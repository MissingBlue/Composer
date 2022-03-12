export class Escape {
	
	static _ = '\\';
	static _x = 2;
	
	constructor(_, _x) {
		
		this.set(_, _x);
		
	}
	
	set(_, _x) {
		this.setValue(_),
		this.setTimes(_x);
	}
	setValue(_) {
		this._ = _ && ''+_ || Escape._;
	}
	setTimes(_x) {
		this._x = _x && parseInt(_x) || Escape._x;
	}
	
	// 以下のメソッド内の文字列一致判定は matchAll で行なうべきかもしれないが
	// matchAll は引数の文字列を RegExp に自動変換するため、エスケープ文字が \ を含む時に非常に複雑な対応が必要になる。
	
	// エスケープ判定。エスケープ文字列 _ の後続の繰り返し回数が _x で指定した数で割り切れなかったらエスケープされてると判定。
	// エスケープされている時はその情報を示す Object を、そうでない時は false を返す。
	// 第二引数 wish は、初回のエスケープ文字列との一致判定の結果得たその位置情報が、
	// wish に指定した値と一致していなければ即座に処理を中断して false を返す。
	// 例えば str の先頭がエスケープであるか判定したい場合、wish に 0 を与えれば、
	// 0 文字目が非エスケープ文字で、かつ 0 文字目以降にエスケープ文字が存在しても、戻り値は false になる。
	// この場合、内部的には単に indexOf を一度行なうだけなので、エスケープ文字の望む位置が決まっている場合処理コストが浮く。
	// wish に負の値を指定した場合、str の末尾からの位置として認識される。
	escapes(str, wish, startIndex = 0) {
		
		const _ = this._, idx = str.indexOf(_, startIndex), sl = str.length;
		
		if (idx === -1 || (typeof wish === 'number' && idx !== (wish < 0 ? sl : 0) + wish)) return false;
		
		const _l = _.length, result = {};
		let i,l;
		
		i = idx;
		do if (str.substr(i, _l) !== _) break; while ((i += _l) < sl);
		
		return !!((l = (i - idx)) / _l % this._x) && { times: l / _l, begin: idx, end: i - 1, length: l };
		
	}
	// escapes と同じ判定を指定された文字列の末尾から先頭に向けて遡って行なう。
	rescapes(str, wish, startIndex) {
		
		const _ = this._, idx = str.lastIndexOf(_, startIndex), sl = str.length;
		
		if (idx === -1 || (typeof wish === 'number' && idx !== (wish < 0 ? sl : 0) + wish)) return false;
		
		const _l = _.length, result = {};
		let i,l;
		
		i = idx;
		while ((i -= _l) > -1) if (str.substr(i, _l) !== _) break;
		
		return !!((l = (idx - i)) / _l % this._x) && { times: l / _l, begin: i + 1, end: idx, length: l };
		
	}
	
}

export class Chr extends Escape {
	
	static $ = '#';
	
	constructor($, _, _x) {
		
		super(_, _x),
		
		this.setChr($);
		
	}
	
	setup($, _, _x) {
		
		this.setChr($),
		this.set(_, _x);
		
	}
	setChr($) {
		
		return this.$ = $ && $ !== this._ && ''+$ || Chr.$;
		
	}
	
	// 以下のメソッド match の文字列一致判定を matchAll で行なわない理由は Escape.prototype.escapes の説明を参照。
	
	match(str) {
		
		const $ = this.$;
		let idx;
		
		if ((idx = str.indexOf($)) === -1) return null;
		
		const $l = $.length;
		let i, results, current;
		
		i = -1, current = str;
		do this.rescapes(current.substring(0, idx), -1) || ((results ||= [])[++i] = (results[i - 1] ?? 0) + idx);
		while ((idx = (current = current.substring(idx)).indexOf($, $l)) !== -1);
		
		return i === -1 ? null : results;
		
	}
	
	// 第一引数 str でこのインスタンスのメソッド match を実行した結果から、
	// 第二引数 maskIndices に指定された任意の数の文字列範囲を示す位置情報の外側にあるもののみを絞り込んだ結果を含んだ Object を返す。
	// 絞り込んだ結果は matched、そして maskIndices の内側にあると判定された文字の位置情報は masked に配列の要素として示される。
	// 第二引数に指定する値は、Brackets のメソッド locate の戻り値か、それに準じたものであることが求められる。
	// これはプログラミングにおける文字列の判定を想定していて、maskIndices の中にあるこのインスタンスの文字列は、
	// それ自体は意味を持たない別の文字列として除外することを目的としている。
	// 例えば str が "a{a}" で、このインスタンスの文字列が a、maskIndices が { } の位置を示す時、
	// このインスタンスの文字列位置として記録されるのは、一文字目だけの a になる。
	// コード上では new Chr('a').mask('a{a}', [ { li: 2, r: 3 } ]); と指定する。（ここでは maskIndices は必要最小限の指定）
	// 戻り値は { matched: [ 0 ], masked: [ 2 ] } である。
	mask(str, ...maskIndices) {
		
		const matched = this.match(str) || [], l0 = maskIndices.length, masked = [], result = { matched, masked };
		let l;
		
		if (!(l = matched.length) || !l0) return result;
		
		let i,i0,i1,l1,ei, idx,outer;
		
		i = ei = -1;
		while (++i < l) {
			i0 = -1, idx = matched[i];
			while (++i0 < l0) {
				i1 = -1, l1 = (outer = maskIndices[i0]).length;
				while (++i1 < l1) if (outer[i1].li - 1 < idx && idx < outer[i1].r) break;
			}
			i1 === l1 || (masked[++ei] = matched.splice(i--, 1)[0], --l);
		}
		
		return result;
		
	}
	
}

export class Brackets {
	
	constructor(l,r, rule, escChr, escTimes) {
		
		if (!l || !r || typeof l !== 'string' || typeof r !== 'string')
			return new TypeError('Argument 1 and 2 are required and must be given as a string.');
		
		this.setLR(l,r, escChr, escTimes);
		
	}
	
	setLR(l,r, escChr, escTimes) {
		
		this.l = new Chr(l, escChr, escTimes),
		this.r = new Chr(r, this.l._, this.l._x);
		
	}
	setRule(rule) {
		this.rules = rule;
	}
	
	index(str, ...maskIndices) {
		
		const lr = this.l.mask(str, ...maskIndices).matched;
		let l = lr.length;
		
		if (!l) return null;
		
		const	eq = this.l.$ === this.r.$, rr = eq ? lr : this.r.mask(str, ...maskIndices).matched, rrl = rr.length;
		
		if (!rrl) return null;
		
		const indices = [], ll = this.l.$.length, rl = this.r.$.length, rii = eq ? 2 : 1;
		let i,i0,ri,ii, L,R;
		
		// 右括弧は左端、左括弧は右端から始める。
		// 左右括弧が同じ文字列の時、右括弧の要素は 0 からではなく 1 から始まる。
		// 括弧が同じ文字の時、それぞれの文字の役割は自明だからである。
		// 同じように、対象の右括弧の一致、不一致が確定した時、次に選ばれる右括弧の要素も、その次の要素ではなく、二つ次の要素になる。
		// これはつまり専用に処理すればより低コストで実装できることを意味するが、現状は上記のように既存の実装を流用している。
		i = l, ii = -1, R = rr[ri = eq ? 1 : 0];
		while (--i > -1) {
			
			// 右端から始めた左括弧の位置が左端の右括弧の位置より小さくなった時点で、その左右括弧を一組かつ現在の最左方最内側の括弧と認定。
			if (lr[i] >= R) {
				
				// このブロックを通る時、現在の左括弧は、現在の右括弧よりも右方か同位置にある。
				
				if (!i) {
					
					// このブロックを通る時、現在の右括弧より左方にある左括弧は存在しない。（つまり左括弧配列の先頭）
					// 現在の右括弧は一組の括弧にできないと判定して、右括弧配列の位置を示す ri に 1 を加算し、次の右括弧に対象を移す。
					// その時、現在の右括弧が末尾であれば、残りの左括弧も一組することができないと考えることができるため、ループを終了する。
					if (ri + rii >= rl) break;
					
					// 次の右括弧に移った場合、その右括弧は現在およびこれまでの左括弧より右方にある可能性があるため、
					// 左括弧配列の位置を示す i  を、最右方を示す末尾の位置に戻す。
					i = l;
					
				}
				
				continue;
				
			}
			
			// 現在の右括弧の最も近い左方にある左括弧を特定。左右括弧を一組としてその位置情報を記録。
			
			indices[++ii] = { l: lr[i], lo: lr[i] - 1, li: lr[i] + ll, r: R, ro: R + rl, ri: R - 1 };
			
			// 既に一組にした左右括弧の情報を各配列から取り除き、特定対象の右括弧をひとつ後方へ移し、ループを再開する。
			
			if (ri + rii >= rrl) break;
			
			lr.splice(i, 1), i = --l, R = rr[ri];
			
		}
		
		return ii === -1 ? null : indices;
		
	}
	
}


// 'a[label:0,5,1,"_",5,"_",2]<#id/textContent>(a,b)*label*'
export class Poly {
	
	constructor() {
	}
	
	
	
	
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