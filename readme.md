# 使用例
## 導入
```javascript
import strings from './strings.js';
```
## Hello, world
```javascript
addEventListener('DOMContentLoaded', () => document.body.append(strings("Hello, world!")[0]), { once: true });
```
## 0 と 1 の 8 次元座標
```javascript
console.log(...strings("[^:8,',',<[+:0,1,1]>]")); // その1
console.log(...strings("[+:echo(8,','):0,1,1]")); // その2
```