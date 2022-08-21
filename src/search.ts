import { App, ByteType } from "./app";
import { FilePage, FileReadResult } from "./filepage";
import { folded } from "./icon";
import { boyerMoore } from "./StringMatch/Boyer-Moore";
import { ByteArray, calcBytesAlign } from "./utils";

const template = `
<div class="search module-container">
  <div class="module-title">
    <i>${folded}</i>
    搜索
  </div>
  <div>
    <div>
      内容：<input name="search" type="text"/>
      <button type="button">查找全部</button>
    </div>
    <fieldset>
      二进制:<input type="radio" name="type" />
      十六进制:<input type="radio" name="type" />
      ASCII:<input type="radio" name="type" />
      UTF-8:<input type="radio" name="type" />
      UTF-16:<input type="radio" name="type" />
      UTF-32:<input type="radio" name="type" />
      Int8<input type="radio" name="type" />
      UInt8:<input type="radio" name="type" />
      Int16:<input type="radio" name="type" />
      UInt16:<input type="radio" name="type" />
      Int32<input type="radio" name="type" />
      UInt32<input type="radio" name="type" />
      Int64<input type="radio" name="type" />
      UInt64<input type="radio" name="type" />
      float16<input type="radio" name="type" />
      float32<input type="radio" name="type" />
      float64<input type="radio" name="type" />
      </fieldset>
  </div>
</div>
`;

interface SearchConfig {
  hightlight: boolean;
  type: ByteType;
};

interface SearchResultItem {
  offset: number;
  length: number;
  type: ByteType;
}

interface SearchFilePage {
  fileID: number;
  filePage: FilePage;
  toSearch: string;
  config?: SearchConfig;
  results: SearchResultItem[];
}

interface ToSearchBytes {
  type: ByteType;
  bytes: ByteArray;
};
interface OffsetArea {
  lower: number;
  upper: number;
};

let searchElement: HTMLElement;
let searchInputElement: HTMLInputElement;
let searchFiles: SearchFilePage[] = [];
let currentSearchFP: SearchFilePage;

function closeHighlight() {
  currentSearchFP.filePage.editorElement.querySelectorAll('span.highlight').forEach(span => span.classList.remove('highlight'));
}

function openHighlight() {
  const { windowOffset, pageBytesCount, editorElement } = currentSearchFP.filePage;
  let hexArea=editorElement.querySelector('.editor-hex-area')!;
  const region: OffsetArea = { lower: windowOffset, upper: windowOffset + pageBytesCount };
  let childOffset: number;
  currentSearchFP.results.forEach(({ offset, length }) => {
    if (region.lower <= offset) {
      for (let i = 0; i < length; ++i) {
        if (offset + i < region.upper) {
          childOffset = offset + i - windowOffset;
          hexArea.children[childOffset].classList.add('highlight');
        }
      }
    }
  });

}

function updateHighlight() {
  closeHighlight();
  if (searchFiles !== null && searchFiles.length > 0) {
    openHighlight();
  }
}

function createEmptyConfig(): SearchConfig {
  return {
    hightlight: true,
    type: ByteType.hex,
  } as SearchConfig;
}

function makeByteArray(bytes: number[]): ByteArray {
  const buffer = new ArrayBuffer(bytes.length);
  const data = new DataView(buffer);
  const byteArray = new ByteArray(buffer);
  bytes.forEach((byte, offset) => data.setUint8(offset, byte));
  return byteArray;
}

function searchValueToBytes(toSeach:string,config:SearchConfig):ToSearchBytes {
  let asType;
  let bytesArray: number[]=[];
  let result: ToSearchBytes;
  switch (config.type) {
    default:
    case ByteType.binary:
      asType = toSeach.slice(0).toLowerCase().replace(' ', '').replace(/[^01]/ig, '');
      asType = asType.padStart(calcBytesAlign(asType.length, 8), '0');
      for (let i = 0; i < asType.length - 1; i += 8) {
        let binStr = asType.slice(i, i + 8);
        bytesArray.push(parseInt(binStr, 2));
      }
      break;
    case ByteType.hex:
      asType = toSeach.slice(0).toLowerCase().replace(' ', '').replace(/[^a-f0-9]/ig, '');
      for (let i = 0; i < asType.length - 1; i += 2) {
        let hexStr = '0x' + asType.slice(i, i + 2);
        bytesArray.push(parseInt(hexStr, 16));
      }
      break;
    case ByteType.ascii:
      asType = toSeach.slice(0);
      let code: number;
      for (let i = 0; i < asType.length; i++) {
        code = asType.charCodeAt(i);
        bytesArray.push(code <= 0xff ? code : 0x00);
      }
      break;
  }

  result = { type: config.type, bytes: makeByteArray(bytesArray) };
  console.log(asType, config, bytesArray);
  return result;
}

let currentProgress: number;
let totalProgress: number;

// init search progress.
function searchInitProgress(total:number){
  currentProgress = 0;
  totalProgress=total;
}

// update search progress
function searchInProgress(){
  ++currentProgress;
  console.log("cur:"+currentProgress+", total:"+totalProgress);
}

// done search progress
function searchDoneProgress(){

}

// complete search
function searchDone(){
  console.log(searchFiles);
  searchDoneProgress();
  openHighlight();
}

function searchAll() {
  if (currentSearchFP === undefined) return;
  const searchRes = currentSearchFP.results;
  let startOffset: number;
  let endOffset: number;
  let byteArray: ByteArray;
  let strMatchRes: Array<number>;

  const filePage: FilePage = currentSearchFP.filePage;

  // create byteArray to search
  const toSearch=searchValueToBytes(searchInputElement.value,createEmptyConfig());
  const pattern: ByteArray = toSearch.bytes;

  // clear current filepage search results
  searchRes.splice(0, searchRes.length);

  // callback for search section
  const saveSearchResult = (frr: FileReadResult) => {
    searchInProgress();
    byteArray = new ByteArray(frr.result as ArrayBuffer);
    strMatchRes = boyerMoore(byteArray, pattern);
    strMatchRes.forEach((offset: number) => searchRes.push({ offset: offset + frr.offset, length: pattern.length, type: ByteType.hex }));
  };

  // init search section's offsets
  const searchList: Array<number> = new Array();
  const bytesEachWindow = filePage.pageBytesCount * 1000; // TODO: the number may not suitable
  const eachLength: number = bytesEachWindow + pattern.length - 1;
  for (startOffset = 0, endOffset = bytesEachWindow - 1; endOffset < filePage.fileTotalBytes; startOffset += bytesEachWindow, endOffset += bytesEachWindow) {
    searchList.push(startOffset);
  }

  // init search progress according to searchList
  searchInitProgress(searchList.length);

  // async promise transform to sync
  // start search
  let prePromise = Promise.resolve();
  searchList.forEach(curOffset => {
    prePromise = prePromise.then(
      () => filePage.readFile(curOffset, eachLength).then(saveSearchResult)
    );
  });

  // end search
  prePromise.then(searchDone);
}

function selectFilePage(file: FilePage) {
  const element: HTMLElement = searchElement.querySelector('button')!
  element.dataset['file'] = file === null ? '0' : file.fileID.toString();
  currentSearchFP = searchFiles.find(sr => sr.fileID === file.fileID)!;
}

function initSearchResult(file: FilePage) {
  searchFiles.push({ fileID: file.fileID, filePage: file, toSearch: '', results: [] });
}

function destorySearchResult(file: FilePage) {
  searchFiles.splice(searchFiles.findIndex(sr => sr.fileID === file.fileID), 1);
}

export function setupSearch() {
  document.querySelector('.minor-sidebar')!.innerHTML = template;
  searchElement = document.querySelector('.search')!;
  searchElement.querySelector('button')!.onclick = searchAll;
  searchInputElement = searchElement.querySelector('[name="search"]')!;
  App.hookRegister('afterWindowSeek', updateHighlight);
  App.hookRegister('afterSwitchPage', selectFilePage);
  App.hookRegister('afterOpenFile', initSearchResult);
  App.hookRegister('beforeCloseFile', destorySearchResult);
}