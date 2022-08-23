import { App, ByteType } from "./app";
import { VirtualList } from "./components/VirtualList";
import { FilePage, FileReadResult } from "./filepage";
import { folded } from "./icon";
import { boyerMoore } from "./StringMatch/Boyer-Moore";
import { ByteArray, calcBytesAlign } from "./utils";
import "./components/ScrollBar"
const template = `
<div class="search module-container">
  <div class="module-title">
    <i>${folded}</i>
    搜索
  </div>
  <div>
    <div>
      <select name="search-type">
        <option value="${ByteType.binary}">Binary</option>
        <option value="${ByteType.hex}" selected>Hex</option>
        <option value="${ByteType.ascii}">ASCII</option>
        <option value="${ByteType.utf8}">UTF-8</option>
        <option value="${ByteType.utf16}">UTF-16</option>
        <option value="${ByteType.utf32}">UTF-32</option>
        <option value="${ByteType.uint8}">UInt8</option>
        <option value="${ByteType.uint16}">UInt16</option>
        <option value="${ByteType.uint32}">UInt32</option>
        <option value="${ByteType.uint64}">UInt64</option>
        <option value="${ByteType.int8}">Int8</option>
        <option value="${ByteType.int16}">Int16</option>
        <option value="${ByteType.int32}">Int32</option>
        <option value="${ByteType.int64}">Int64</option>
        <option value="${ByteType.float16}">Float16</option>
        <option value="${ByteType.float32}">Float32</option>
        <option value="${ByteType.float64}">Float64</option>
      </select>
      内容：<input name="search-value" type="text"/>
      <button type="button">查找全部</button>
    </div>
    <div>
      <ul>
      </ul>
    </div>
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
    type: parseInt((document.querySelector("[name=search-type]")! as HTMLSelectElement).value) as unknown as ByteType,
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
    default:
      case ByteType.binary:
        asType = toSeach.slice(0).toLowerCase().replace(' ', '').replace(/[^01]/ig, '');
        asType = asType.padStart(calcBytesAlign(asType.length, 8), '0');
        for (let i = 0; i < asType.length - 1; i += 8) {
          let binStr = asType.slice(i, i + 8);
          bytesArray.push(parseInt(binStr, 2));
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
  updateHighlight();
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
  searchInputElement = searchElement.querySelector('[name="search-value"]')!;
  App.hookRegister('afterWindowSeek', updateHighlight);
  App.hookRegister('afterSwitchPage', selectFilePage);
  App.hookRegister('afterOpenFile', initSearchResult);
  App.hookRegister('beforeCloseFile', destorySearchResult);
  let ul=searchElement.querySelector('ul');
  for(let i=0; i<20; i++) {
    let li=document.createElement('li');
    li.innerHTML=i.toString();
    ul?.appendChild(li);
  }
  const uf=(offset:number)=>{
    for(let i=0;i<20;i++){
      ul!.children[i].innerHTML=(i+offset).toString();
    }
  };
  const vl:VirtualList=new VirtualList(ul!,uf);
  vl.childrenNum=200;
  vl.childHeight=24;
  vl.displayHeight=480;
}