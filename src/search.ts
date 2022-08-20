import { App } from "./app";
import { FilePage, FileReadResult } from "./filepage";
import { folded } from "./icon";
import { boyerMoore } from "./StringMatch/Boyer-Moore";
import { ByteArray } from "./utils";

const template = `
<div class="search module-container">
  <div class="module-title">
    <i>${folded}</i>
    搜索
  </div>
  <div>
    <div>
      内容：<input name="search" type="text"/>
      <button type="button">上一个</button>
      <button type="button">下一个</button>
    </div>
    <fieldset>
      二进制:<input type="checkbox" name="type" />
      十六进制:<input type="checkbox" name="type" />
      ASCII:<input type="checkbox" name="type" />
      UTF-8:<input type="checkbox" name="type" />
      UTF-16:<input type="checkbox" name="type" />
      UTF-32:<input type="checkbox" name="type" />
      Int8<input type="checkbox" name="type" />
      UInt8:<input type="checkbox" name="type" />
      Int16:<input type="checkbox" name="type" />
      UInt16:<input type="checkbox" name="type" />
      Int32<input type="checkbox" name="type" />
      UInt32<input type="checkbox" name="type" />
      Int64<input type="checkbox" name="type" />
      UInt64<input type="checkbox" name="type" />
      float16<input type="checkbox" name="type" />
      float32<input type="checkbox" name="type" />
      float64<input type="checkbox" name="type" />
      </fieldset>
  </div>
</div>
`;

interface SearchConfig {
  hightlight: boolean;
};

interface SearchResultItem {
  offset: number;
  length: number;
  type: string;
}

interface OffsetArea {
  lower: number;
  upper: number;
};

let searchElement: HTMLElement;
let searchValue: HTMLInputElement;
let searchResults: Array<SearchResultItem> = new Array();
let searchConfig: SearchConfig;

function closeHighlight() {
  document.querySelectorAll('span.highlight').forEach(span => span.classList.remove('highlight'));
}

function openHighlight() {
  const hexArea: HTMLElement = document.querySelector('.editor-hex-area')!;
  const region: OffsetArea = { lower: App.currentPage!.windowOffset, upper: App.currentPage!.windowOffset + App.currentPage!.pageBytesCount };
  let windowOffset: number;
  searchResults.forEach(({ offset, length }) => {
    if (region.lower <= offset) {
      for (let i = 0; i < length; ++i) {
        if (offset + i < region.upper) {
          windowOffset = offset + i - App.currentPage!.windowOffset;
          hexArea.children[windowOffset].classList.add('highlight');
        }
      }
    }
  });

}

export function scrollHighlight() {
  closeHighlight();
  console.log(1);
  if (searchResults !== null && searchResults.length > 0) {
    openHighlight();
  }
}
function searchToggleHightlight() {
  if (searchConfig.hightlight === true) closeHighlight(); else openHighlight();
}

function searchNext() {
  let startOffset: number;
  let endOffset: number;
  let byteArray: ByteArray;
  let res: Array<number>;
  let searchContent = searchValue.value;
  let currentProgress:number;
  let totalProgress:number;
  let x = new ArrayBuffer(4);
  let a = new DataView(x);
  let b = new ByteArray(x);
  const app:FilePage=App.currentPage!;
  a.setUint8(0, 0x44);
  a.setUint8(1, 0x44);
  a.setUint8(2, 0x44);
  a.setUint8(3, 0x44);

  let pattern: ByteArray = b;
  searchResults = new Array<SearchResultItem>();

  const saveSearchResult = (frr:FileReadResult) => {
    console.log("cur:"+(++currentProgress)+", total:"+totalProgress);
    byteArray = new ByteArray(frr.result as ArrayBuffer);
    res = boyerMoore(byteArray, b);
    res.forEach((offset: number) => searchResults.push({ offset: offset+frr.offset, length: pattern.length, type: 'uint8' }));
  };

  const searchList:Array<number>=new Array();
  const bytesEachWindow = app.pageBytesCount*1000;
  const eachLength:number=bytesEachWindow+pattern.length-1;
  for (startOffset = 0, endOffset = bytesEachWindow - 1; endOffset < app.fileTotalBytes; startOffset += bytesEachWindow, endOffset += bytesEachWindow) {
    searchList.push(startOffset);
  }
  currentProgress=0;
  totalProgress=searchList.length;
  let pre=Promise.resolve();
  searchList.forEach((curOffset,index)=>{
    pre= pre.then(()=>app.readFile(curOffset, eachLength).then(saveSearchResult));
  });
  pre.then(()=>{
    console.log(searchResults);
    openHighlight();
  });
}

export function setupSearch() {
  document.querySelector('.minor-sidebar')!.innerHTML = template;
  searchElement = document.querySelector('.search')!;
  searchElement.querySelector('button')!.onclick = searchNext;
  searchValue = searchElement.querySelector('[name="search"]')!;
}