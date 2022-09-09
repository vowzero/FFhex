import { App, ByteType } from "@/app";
import { VirtualList } from "@/components/VirtualList";
import { CustomSelection, CustomSelectionType, EditorPage } from "@/components/EditorPage";
import { folded } from "@/components/Icon";
import { ByteArray, calcBytesAlign } from "@/utils";
import { ScrollBar } from "@/components/ScrollBar";
import WorkerPool from "@/modules/WorkerPool";
import { MessageTip } from "./MessageTip";
import "@/assets/css/Search.less";

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

interface ToSearchBytes {
  type: ByteType;
  originText: string;
  typeText: string;
  buffer: ArrayBuffer;
}

const workerPool = new WorkerPool(new URL("../searchFile.ts", import.meta.url));
let searchElement: HTMLElement;
let searchInputElement: HTMLInputElement;
let searchResultsElement: HTMLInputElement;
let currentProgress: number;
let totalProgress: number;

const searches: Search[] = [];
let currentSearchFP: Search | null;

class Search {
  private _editorPage: EditorPage;
  private toSearch!: ToSearchBytes;
  private results: number[] = [];
  private offsetResult: number = 0;
  private highlight: boolean = true;
  private length: number = -1;
  get editorID() {
    return this.editorPage.editorID;
  }
  get editorPage() {
    return this._editorPage;
  }

  constructor(editorPage: EditorPage) {
    this._editorPage = editorPage;
  }

  // init search progress.
  public searchInitProgress(total: number) {
    currentProgress = -1;
    totalProgress = total;
    this.searchInProgress();
  }

  // update search progress
  public searchInProgress() {
    ++currentProgress;
    (searchElement.querySelector(".search-progress") as HTMLElement).style.display = "block";
    searchResultsElement.children[0].textContent = `${this.results.length} results have been found.`;
    (searchElement.querySelector(".search-progress-inner")! as HTMLElement).style.width = `${(currentProgress / totalProgress) * 100}%`;
    if (currentProgress == totalProgress) {
      this.searchDoneProgress();
    }
  }

  // done search progress
  public searchDoneProgress() {
    searchResultsElement.children[0].textContent = `${this.results.length} results have been found.`;
    (searchElement.querySelector(".search-results") as HTMLElement).style.display = "block";
    this.results.sort((a, b) => a - b);
    this._editorPage.addCustomSelection({
      label: "Search",
      type: CustomSelectionType.SCATTER,
      visible: this.highlight,
      style: "highlight-search",
      meta: this.results,
      length: this.toSearch.buffer.byteLength,
    } as CustomSelection);

    this.resultListSeek(0);
    this._editorPage.update();
  }

  public searchAll() {
    if (!currentSearchFP) {
      MessageTip.show({ text: "Please valid file page." });
      return;
    }

    const searchRes = currentSearchFP.results;
    let startOffset: number;

    const editorPage: EditorPage = currentSearchFP.editorPage;

    // create byteArray to search
    this.toSearch = searchValueToBytes(
      searchInputElement.value,
      parseInt((document.querySelector("[name=search-type]")! as HTMLSelectElement).value) as unknown as ByteType
    );
    const pattern: ByteArray = new ByteArray(this.toSearch.buffer);
    currentSearchFP.length = pattern.length;

    if (currentSearchFP.length === 0) {
      MessageTip.show({ text: "Please input text to search." });
      return;
    }

    // clear current editorPage search results
    searchRes.splice(0, searchRes.length);

    // init search section's offsets
    const searchList: Array<number> = new Array();
    const bytesEachWindow = 1024 * 1024 * 64; // TODO: the number may not suitable
    const eachLength: number = bytesEachWindow + pattern.length - 1;
    for (startOffset = 0; startOffset <= editorPage.originFileSize; startOffset += bytesEachWindow) {
      searchList.push(startOffset);
    }
    if (searchList.length == 0) searchList.push(0);
    // init search progress according to searchList
    this.searchInitProgress(searchList.length);
    console.log(searchList);
    // start search
    searchList.forEach((curOffset) => {
      if (!currentSearchFP) return;

      workerPool.execute("search", [currentSearchFP.editorPage.dataSource, curOffset, eachLength, this.toSearch.buffer]).then((data) => {
        (data.results as number[]).forEach((offset: number) => searchRes.push(offset + (data.offset as number)));
        this.searchInProgress();
      });
    });
  }

  public resultListSeek(offset?: number) {
    const listChildren: HTMLCollection = searchResultsElement.getElementsByTagName("ul")[0].children;
    const resultsLength: number = this.results.length;
    let i: number;
    let item: HTMLElement;
    searchResultsElement.children[0].textContent = `${this.results.length} results have been found.`;
    this.offsetResult = offset || this.offsetResult;
    for (i = 0; i < listChildren.length && i + this.offsetResult < resultsLength; i++) {
      item = listChildren.item(i) as HTMLElement;
      item.textContent = "0x" + this.results[i + this.offsetResult].toString(16).toUpperCase().padStart(this._editorPage.linePadLength, "0");
    }

    for (; i < listChildren.length; i++) {
      item = listChildren.item(i) as HTMLElement;
      item.textContent = "";
    }
  }

  public onResultScroll(type: number, ratio: number, newRatio?: Function) {
    let childrenNum = this.results.length - searchResultsElement.getElementsByTagName("ul")[0].children.length;
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
}

function makeArrayBuffer(bytes: number[]): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.length);
  const data = new DataView(buffer);
  bytes.forEach((byte, offset) => data.setUint8(offset, byte));
  return buffer;
}

function searchValueToBytes(toSeach: string, type: ByteType): ToSearchBytes {
  let asType;
  let bytesArray: number[] = [];
  let result: ToSearchBytes;
  switch (type) {
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
    type: type,
    originText: toSeach,
    typeText: asType,
    buffer: makeArrayBuffer(bytesArray),
  };
  return result;
}

function selectFilePage(file: EditorPage) {
  if (!file) {
    currentSearchFP = null;
    return;
  }
  currentSearchFP = searches.find((sr) => sr.editorID === file.editorID)!;
  currentSearchFP.resultListSeek();
}

function initSearchResult(editorPage: EditorPage) {
  searches.push(new Search(editorPage));
}

function destorySearchResult(file: EditorPage) {
  searches.splice(
    searches.findIndex((sr) => sr.editorID === file.editorID),
    1
  );
}

function resultListSeek(offset: number) {
  currentSearchFP?.resultListSeek(offset);
}

function onResultScroll(type: number, ratio: number, newRatio?: Function) {
  currentSearchFP?.onResultScroll(type, ratio, newRatio);
}

export function setupSearch() {
  document.querySelector(".sidebar")!.innerHTML += template;

  searchElement = document.querySelector(".search")!;
  searchElement.querySelector("button")!.onclick = () => currentSearchFP?.searchAll();
  searchInputElement = searchElement.querySelector('[name="search-value"]')!;
  searchResultsElement = searchElement.querySelector(".search-results")!;
  App.hookRegister("afterSwitchPage", selectFilePage);
  App.hookRegister("afterOpenFile", initSearchResult);
  App.hookRegister("beforeCloseFile", destorySearchResult);
  let ul = searchResultsElement.getElementsByTagName("ul")[0];

  ul.addEventListener("click", (ev: MouseEvent) => {
    const li = ev.composedPath().find((e) => (e as HTMLElement).tagName === "LI") as HTMLElement;
    if (!li || !li.textContent || li.textContent.length === 0) return;
    const address = parseInt(li.textContent);
    if (isNaN(address)) return;
    currentSearchFP?.editorPage.seekAddress(address);
    currentSearchFP?.editorPage.setCursor(address);
  });
  const virtualList: VirtualList = new VirtualList(ul!, onResultScroll);
  for (let i = 0; i < 10; i++) {
    let li = document.createElement("li");
    li.dataset["offset"] = i.toString();
    ul?.appendChild(li);
  }
  virtualList.displayHeight = 240;
}
