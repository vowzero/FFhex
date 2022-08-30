import { App, ByteType } from "@/app";
import { VirtualList } from "@/components/VirtualList";
import { FilePage } from "@/components/FilePage";
import { folded } from "@/components/Icon";
import { ByteArray, calcBytesAlign } from "@/utils";
import { ScrollBar } from "@/components/ScrollBar";
import "@/assets/css/Search.less";
import WorkerPool from "@/modules/WorkerPool";
import { MessageTip } from "./MessageTip";

const template = `
<div class="search module-container">
  <div class="module-title">
    <i>${folded}</i>
    搜索
  </div>
  <div class="module-content">
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
    <div class="search-progress" style="display:none;"><div class="search-progress-inner"></div></div>
    <div class="search-results"><div>搜索结果：</div><ul></ul></div>
  </div>
</div>
`;

interface SearchConfig {
  hightlight: boolean;
  type: ByteType;
}

interface SearchFilePage {
  fileID: number;
  filePage: FilePage;
  toSearch: string;
  config?: SearchConfig;
  results: number[];
  offsetResult: number;
  length: number;
}

interface ToSearchBytes {
  type: ByteType;
  origin: string;
  buffer: ArrayBuffer;
}

interface OffsetArea {
  lower: number;
  upper: number;
}

const workerPool = new WorkerPool(new URL("../searchFile.ts", import.meta.url));
let searchElement: HTMLElement;
let searchInputElement: HTMLInputElement;
let searchResultsElement: HTMLInputElement;
let searchFiles: SearchFilePage[] = [];
let currentSearchFP: SearchFilePage | null;

function closeHighlight() {
  if (!currentSearchFP) return;
  currentSearchFP.filePage.editorElement.querySelectorAll("span.highlight").forEach((span) => span.classList.remove("highlight"));
}

function openHighlight() {
  if (!currentSearchFP) return;
  const { windowOffset, pageBytesCount, editorElement } = currentSearchFP.filePage;
  let hexArea = editorElement.querySelector(".editor-hex-area")!;
  let textArea = editorElement.querySelector(".editor-text-area")!;
  const region: OffsetArea = {
    lower: windowOffset,
    upper: windowOffset + pageBytesCount,
  };
  let childOffset: number;
  currentSearchFP.results.forEach((offset) => {
    if (region.lower <= offset) {
      for (let i = 0; i < currentSearchFP!.length; ++i) {
        if (offset + i < region.upper) {
          childOffset = offset + i - windowOffset;
          hexArea.children[childOffset].classList.add("highlight");
          textArea.children[childOffset].classList.add("highlight");
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

function makeArrayBuffer(bytes: number[]): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.length);
  const data = new DataView(buffer);
  bytes.forEach((byte, offset) => data.setUint8(offset, byte));
  return buffer;
}

function searchValueToBytes(toSeach: string, config: SearchConfig): ToSearchBytes {
  let asType;
  let bytesArray: number[] = [];
  let result: ToSearchBytes;
  switch (config.type) {
    case ByteType.hex:
      asType = toSeach
        .slice(0)
        .toLowerCase()
        .replace(" ", "")
        .replace(/[^a-f0-9]/gi, "");
      for (let i = 0; i < asType.length - 1; i += 2) {
        let hexStr = "0x" + asType.slice(i, i + 2);
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
      asType = toSeach.slice(0).toLowerCase().replace(" ", "").replace(/[^01]/gi, "");
      asType = asType.padStart(calcBytesAlign(asType.length, 8), "0");
      for (let i = 0; i < asType.length - 1; i += 8) {
        let binStr = asType.slice(i, i + 8);
        bytesArray.push(parseInt(binStr, 2));
      }
      break;
  }

  result = {
    type: config.type,
    origin: asType,
    buffer: makeArrayBuffer(bytesArray),
  };
  return result;
}

let currentProgress: number;
let totalProgress: number;

// init search progress.
function searchInitProgress(total: number) {
  currentProgress = -1;
  totalProgress = total;
  searchInProgress();
}

// update search progress
function searchInProgress() {
  if (!currentSearchFP) return;
  ++currentProgress;
  (searchElement.querySelector(".search-progress") as HTMLElement).style.display = "block";
  searchResultsElement.children[0].textContent = `${currentSearchFP.results.length} results have been found.`;
  (searchElement.querySelector(".search-progress-inner")! as HTMLElement).style.width = `${(currentProgress / totalProgress) * 100}%`;
  if (currentProgress == totalProgress) {
    searchDoneProgress();
  }
}

// done search progress
function searchDoneProgress() {
  if (!currentSearchFP) return;
  searchResultsElement.children[0].textContent = `${currentSearchFP.results.length} results have been found.`;
  (searchElement.querySelector(".search-results") as HTMLElement).style.display = "block";
  currentSearchFP.results.sort((a, b) => a - b);
  resultListSeek(0);
  updateHighlight();
}

function searchAll() {
  if (!currentSearchFP) {
    MessageTip.show({ text: "Please valid file page." });
    return;
  }
  const searchRes = currentSearchFP.results;
  let startOffset: number;

  const filePage: FilePage = currentSearchFP.filePage;

  // create byteArray to search
  const toSearch = searchValueToBytes(searchInputElement.value, createEmptyConfig());
  const pattern: ByteArray = new ByteArray(toSearch.buffer);
  currentSearchFP.length = pattern.length;
  if (currentSearchFP.length === 0) {
    MessageTip.show({ text: "Please input text to search." });
    return;
  }

  // clear current filepage search results
  searchRes.splice(0, searchRes.length);

  // init search section's offsets
  const searchList: Array<number> = new Array();
  const bytesEachWindow = 1024 * 1024 * 64; // TODO: the number may not suitable
  const eachLength: number = bytesEachWindow + pattern.length - 1;
  for (startOffset = 0; startOffset <= filePage.fileTotalBytes; startOffset += bytesEachWindow) {
    searchList.push(startOffset);
  }
  if (searchList.length == 0) searchList.push(0);
  // init search progress according to searchList
  searchInitProgress(searchList.length);
  console.log(searchList);
  // start search
  searchList.forEach((curOffset) => {
    if (!currentSearchFP) return;

    workerPool.execute("search", [currentSearchFP.filePage.currentFile, curOffset, eachLength, toSearch.buffer]).then((data) => {
      (data.results as number[]).forEach((offset: number) => searchRes.push(offset + (data.offset as number)));
      searchInProgress();
    });
  });
}

function selectFilePage(file: FilePage) {
  if (!file) {
    currentSearchFP = null;
    return;
  }
  const element: HTMLElement = searchElement.querySelector("button")!;
  element.dataset["file"] = file === null ? "0" : file.fileID.toString();
  currentSearchFP = searchFiles.find((sr) => sr.fileID === file.fileID)!;
}

function initSearchResult(file: FilePage) {
  searchFiles.push({
    fileID: file.fileID,
    filePage: file,
    toSearch: "",
    results: [],
    offsetResult: 0,
    length: 0,
  });
}

function destorySearchResult(file: FilePage) {
  searchFiles.splice(
    searchFiles.findIndex((sr) => sr.fileID === file.fileID),
    1
  );
}

function resultListSeek(offset: number) {
  if (!currentSearchFP) return;
  const listChildren: HTMLCollection = searchResultsElement.getElementsByTagName("ul")[0].children;
  const resultsLength: number = currentSearchFP.results.length;
  let i: number;
  let item: HTMLElement;

  currentSearchFP.offsetResult = offset;
  for (i = 0; i < listChildren.length && i + offset < resultsLength; i++) {
    item = listChildren.item(i) as HTMLElement;
    item.textContent =
      "0x" + currentSearchFP.results[i + offset].toString(16).toUpperCase().padStart(currentSearchFP.filePage.offsetAddressMaxLength, "0");
  }

  for (; i < listChildren.length; i++) {
    item = listChildren.item(i) as HTMLElement;
    item.textContent = "";
  }
}

function onResultScroll(type: number, ratio: number, newRatio?: Function) {
  if (!currentSearchFP) return;
  let childrenNum = currentSearchFP.results.length - searchResultsElement.getElementsByTagName("ul")[0].children.length;
  let offset: number;

  if (type === ScrollBar.DRAG) {
    offset = childrenNum * ratio;
  } else {
    if (type === ScrollBar.UP) {
      offset = childrenNum * ratio - 10;
    } else if (type === ScrollBar.DOWN) {
      offset = childrenNum * ratio + 10;
    }
    if (offset! < 0) offset = 0;
    if (offset! > childrenNum) offset = childrenNum;
    newRatio!(offset! / childrenNum);
  }
  offset = Math.floor(offset!);

  resultListSeek(offset);
}

export function setupSearch() {
  document.querySelector(".sidebar")!.innerHTML += template;

  searchElement = document.querySelector(".search")!;
  searchElement.querySelector("button")!.onclick = searchAll;
  searchInputElement = searchElement.querySelector('[name="search-value"]')!;
  searchResultsElement = searchElement.querySelector(".search-results")!;
  App.hookRegister("afterWindowSeek", updateHighlight);
  App.hookRegister("afterSwitchPage", selectFilePage);
  App.hookRegister("afterOpenFile", initSearchResult);
  App.hookRegister("beforeCloseFile", destorySearchResult);
  let ul = searchResultsElement.getElementsByTagName("ul")[0];

  ul.addEventListener("click", (ev: MouseEvent) => {
    const li = ev.composedPath().find((e) => (e as HTMLElement).tagName === "LI") as HTMLElement;
    if (!li.textContent || li.textContent.length === 0) return;
    const address = parseInt(li.textContent);
    if (isNaN(address)) return;
    if (!currentSearchFP) return;
    currentSearchFP.filePage.seekAddress(address);
    currentSearchFP.filePage.setCursor(address);
  });
  const virtualList: VirtualList = new VirtualList(ul!, onResultScroll);
  for (let i = 0; i < 10; i++) {
    let li = document.createElement("li");
    li.dataset["offset"] = i.toString();
    ul?.appendChild(li);
  }
  virtualList.displayHeight = 240;
}
