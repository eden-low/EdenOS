# I Ching data sources

The runtime data in `ichingTrigrams.ts` and `ichingHexagrams.ts` is local. EdenOS makes no network request for an I Ching reading.

## Primary local reference

- [`godcong/yi`](https://github.com/godcong/yi), commit `517293838bd49a7ad22edf47422074c6bf9cd656`
- Source file: `data/gua.json`
- Used fields: King Wen number, Chinese name, upper/lower trigram, Unicode symbol, and the short Chinese `xiang_text` reference.
- License: MIT, copyright © 2018 godcong. The repository `LICENSE` applies to the data file.

## Independent structural cross-check

- [`jesshewitt/i-ching`](https://github.com/jesshewitt/i-ching), commit `d3a32e1070153f929de53076bd20f7196927a0bd`
- Source files: `site/data/hexagrams.json` and `site/data/trigrams.json`
- Used to verify all 64 King Wen numbers, line patterns, upper/lower trigram combinations, and English names.
- Data license: CC0 1.0 Universal (`LICENSE-translation`). Application code is separately MIT licensed and was not imported.

An automated comparison performed during Phase 2B found zero mapping differences across all 64 entries after normalizing both sources to bottom-to-top line order. Long translations and generated divinatory commentary were intentionally excluded. EdenOS displays the short classical Image reference as source text and labels its own synthesis as a local reflection prompt.

## MIT license notice for `godcong/yi`

Copyright (c) 2018 godcong

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
