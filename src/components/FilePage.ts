import { App } from "@/app";
import { ScrollBar } from "@/components/ScrollBar";
import { BytesFormat, calcBytesAlign, FileReadResult, readFileSlice, throttle } from "@/utils";
import "@/assets/css/FilePage.less";
import { MenuItem, MenuItemStatus, PopupMenu } from "./PopupMenu";
import { MessageTip } from "./MessageTip";

const template = `
<div class="editor-line-number"></div>
<div class="editor-hex-area"></div>
<div class="editor-text-area"></div>
<div class="editor-scrollbar"></div>
`;

export interface SelectionStyle {
  className: string;
}

export interface Selection {
  viaible: boolean;
  style: string;
  beginAddress: number;
  endAddress: number;
}

export interface HighightCharOption {
  label: string;
  value: any[];
  style: string;
  enabled: boolean;
}

export class FilePage {
  public fileID: number;
  public hoverOffset: number | null = null; // The offset of the hover cursor relative to the window
  public cursorAddress: number | null = null; // The address of the current cursor
  public windowOffset: number = 0; // The offset of the first line of the view window relative to the file header
  public dirty: boolean = false; // Whether it has been modified
  public pageMaxLine: number = 30; // The number of lines show in window
  public eachLineBytes: number = 16; // Each line shows the bytes count
  public pageBytesCount: number = 0; // Clac by eachLineBytes and pageMaxLine
  public fileTotalBytes: number = 0; // File bytes size
  public offsetAddressMaxLength: number = 8; // Each address pads max length
  private _inputFile!: File; // Which file is opened
  private _filePath?: string; // input file path
  private _fileArrayBuffer!: ArrayBuffer; // Window bytes ArrayBuffer
  private _pageElement!: HTMLDivElement; // The top layer container element
  private _LineNumber!: HTMLDivElement; // Left address line number
  private _HexArea!: HTMLDivElement; // Major window to show hex bytes
  private _TextArea!: HTMLDivElement; // Minor window to show text for hex
  private _Scroll!: HTMLDivElement; // Right scroll bar
  private _ScrollBar!: ScrollBar;
  private _lastLineAddress: number = 0; // Last address line number
  private _mouseLeftDown: boolean = false;
  private _userSelection: Selection;
  private _highlightCharOption: HighightCharOption[] = [
    { label: "Space", value: [32], style: "space", enabled: true },
    { label: "CR/LF", value: [10, 13], style: "crlf", enabled: true },
    { label: "Display ASCII", value: [[32, 126]], style: "display", enabled: true },
    { label: "Number ASCII", value: [[48, 57]], style: "number", enabled: true },
    {
      label: "Alhabet ASCII",
      value: [
        [65, 90],
        [97, 122],
      ],
      style: "alphabet",
      enabled: true,
    },
    { label: "Control ASCII", value: [[0, 31], 127], style: "control", enabled: true },
    { label: "Non-ASCII", value: [[128, 255]], style: "non-ascii", enabled: false },
  ];

  get editorElement() {
    return this._pageElement;
  }

  get hexAreaElement() {
    return this._HexArea;
  }

  get currentFile(): File {
    return this._inputFile;
  }

  get filePath() {
    return this._filePath;
  }

  constructor(id: number, file: File, filePath?: string) {
    this.fileID = id;
    this.pageBytesCount = this.eachLineBytes * this.pageMaxLine;
    this._inputFile = file;
    this._filePath = filePath;
    this.fileTotalBytes = file.size;
    this.offsetAddressMaxLength = Math.max(8, Math.ceil(Math.log(file.size) / Math.log(16)));
    this._lastLineAddress = calcBytesAlign(this.fileTotalBytes, this.eachLineBytes);
    this._userSelection = { viaible: false, style: "selected", beginAddress: -1, endAddress: -1 };
    this._initEditorPage();
  }

  public readFile(offset: number, length: number): Promise<FileReadResult> {
    return readFileSlice(this._inputFile, offset, length);
  }

  // it will slice the file [windowOffset, windowOffset+bytesCount]
  private seekWindowOffset(windowOffset: number) {
    if (windowOffset > this._lastLineAddress - this.pageBytesCount) {
      windowOffset = this._lastLineAddress - this.pageBytesCount;
    }
    windowOffset = windowOffset > 0 ? windowOffset : 0;
    this.windowOffset = windowOffset;
    this.readFile(windowOffset, this.pageBytesCount).then((res: FileReadResult) => {
      this._fileArrayBuffer = res.result as ArrayBuffer;
      this._updateEditorPage();
      this._ScrollBar.updateScrollDisplayRatio(windowOffset / (this.fileTotalBytes - this.pageBytesCount));
      App.hookCall("afterWindowSeek", this._fileArrayBuffer);
    });
  }

  /**
   * Seek an address in window
   * @param address the offset will be seek in window
   * @param forceFirstLine force the offset address to the first line
   */
  public seekAddress(address: number, forceFirstLine: boolean = false) {
    let offset: number = Math.floor(address / this.eachLineBytes) * this.eachLineBytes;
    if (!forceFirstLine && this.windowOffset <= offset && offset < this.windowOffset + this.pageBytesCount) return;
    this.seekWindowOffset(offset);
  }

  /**
   * set the cursor address
   * @param address the address of cursor
   */
  public setCursor(address: number) {
    this._updateOffsetClass(address - this.windowOffset, "cursor");
    this.cursorAddress = address;
  }

  public setAndSeekCursor(address: number) {
    if (!(address >= 0 && address < this.fileTotalBytes)) return;
    this.setCursor(address);
    this.seekAddress(address, false);
  }

  public updateSelection(selection: Selection) {
    const { style } = selection;
    const clearClass = (classname: string) => {
      const elements = this._pageElement.getElementsByClassName(classname);
      while (elements.length > 0) elements[0].classList.remove(classname);
    };
    clearClass(style);
    clearClass(`${style}-begin`);
    clearClass(`${style}-end`);
    if (selection.viaible) {
      let { beginAddress, endAddress } = selection;
      if (beginAddress > endAddress) [beginAddress, endAddress] = [endAddress, beginAddress];
      let childOffset: number;
      let stopOffset: number;
      if (beginAddress < this.windowOffset) {
        childOffset = 0;
      } else if (beginAddress >= this.windowOffset + this.pageBytesCount) {
        return;
      } else {
        childOffset = beginAddress - this.windowOffset;
        this._HexArea.children[childOffset].classList.add(style + "-begin");
        this._TextArea.children[childOffset].classList.add(style + "-begin");
      }
      if (this.windowOffset <= endAddress && endAddress < this.windowOffset + this.pageBytesCount) {
        stopOffset = endAddress - this.windowOffset;
        this._HexArea.children[stopOffset].classList.add(style + "-end");
        this._TextArea.children[stopOffset].classList.add(style + "-end");
      } else if (endAddress < this.windowOffset) {
        return;
      } else {
        stopOffset = this.pageBytesCount - 1;
      }

      for (let i = childOffset; i <= stopOffset; i++) {
        this._HexArea.children[i].classList.add(style);
        this._TextArea.children[i].classList.add(style);
      }
    }
  }

  public getSelectionBytes(selection: Selection) {
    const { beginAddress, endAddress } = selection;
    if (beginAddress < 0 || endAddress >= this.fileTotalBytes) {
      throw new Error("Invalid selection.");
    }
    return this.readFile(beginAddress, endAddress - beginAddress + 1);
  }

  public userSelectionCopy() {
    const { beginAddress, endAddress } = this._userSelection;
    if (endAddress - beginAddress + 1 > 1024) {
      MessageTip.show({ text: "The Selection is too large." });
    } else {
      this.readFile(beginAddress, endAddress - beginAddress + 1).then((frr) => {
        const bytes = new BytesFormat(frr.result);
        let data = "";
        for (let i = 0; i < frr.length - 1; i++) {
          bytes.offset = i;
          data += bytes.hex + " ";
        }
        bytes.offset = frr.length - 1;
        data += bytes.hex;
        navigator.clipboard.writeText(data).then(
          () => MessageTip.show({ text: "Copy succeed." }),
          () => MessageTip.show({ text: "Copy failed." })
        );
      });
    }
  }

  public save() {}

  public destory() {
    if (this.dirty) {
      this.save();
    }
    this._fileArrayBuffer = null!;
    this._inputFile = null!;
    this._pageElement.remove();
  }

  private _initEditorPage() {
    const page: HTMLDivElement = document.createElement("div");
    page.classList.add("editor-page");
    page.dataset["pageId"] = this.fileID.toString();
    page.innerHTML = template;
    document.querySelector<HTMLDivElement>(".tab-contents")?.appendChild(page);
    this._LineNumber = page.querySelector(".editor-line-number")!;
    this._HexArea = page.querySelector(".editor-hex-area")!;
    this._TextArea = page.querySelector(".editor-text-area")!;
    this._Scroll = page.querySelector(".editor-scrollbar")!;
    this._pageElement = page;

    page.setAttribute("tabindex", "0");
    this._HexArea.setAttribute("tabindex", "0");
    this._TextArea.setAttribute("tabindex", "0");

    let observer = new ResizeObserver(
      throttle(([e]: ResizeObserverEntry[]) => {
        if (!this._inputFile) {
          observer.disconnect();
          observer = null!;
        } else if ((e.target as HTMLElement).style.display !== "none") {
          this._adjustEditorPage();
          this.seekWindowOffset(this.windowOffset);
        }
      }, 10)
    );
    observer.observe(page);

    this._ScrollBar = new ScrollBar(this._pageElement, this._Scroll, this._onScroll.bind(this));

    this._initKeyControl();
  }

  /**
   * adjust editor page viewer elements, clear base element and regenerate them
   */
  private _adjustEditorPage() {
    // calc max line number
    this.pageMaxLine = Math.floor(this._HexArea.getBoundingClientRect().height / 26);
    this.pageBytesCount = this.pageMaxLine * this.eachLineBytes;

    let i: number;
    let length: number = this.pageBytesCount;

    // add line number
    for (i = this._LineNumber.children.length; i < this.pageMaxLine; i++) {
      const unit = document.createElement("div");
      unit.dataset["offset"] = i.toString();
      this._LineNumber.appendChild(unit);
    }

    for (i = this._LineNumber.children.length - 1; i >= length; i--) this._LineNumber.children[i].remove();

    // add byte span
    for (i = this._HexArea.children.length; i < length; i++) {
      const unit = document.createElement("span");
      unit.dataset["offset"] = i.toString();
      this._HexArea.appendChild(unit);
    }
    for (i = this._HexArea.children.length - 1; i >= length; i--) this._HexArea.children[i].remove();

    for (i = this._TextArea.children.length; i < length; i++) {
      const unit = document.createElement("span");
      unit.dataset["offset"] = i.toString();
      this._TextArea.appendChild(unit);
    }
    for (i = this._TextArea.children.length - 1; i >= length; i--) this._TextArea.children[i].remove();
  }

  private _updateEditorPage() {
    let aSpan: HTMLSpanElement;
    let end: number, i: number;
    let offset: number;
    for (i = 0, end = this._LineNumber.childElementCount; i < end; i++) {
      aSpan = this._LineNumber.children.item(i) as HTMLSpanElement;
      offset = parseInt(aSpan.dataset["offset"]!);
      aSpan.textContent = (this.windowOffset + offset).toString(16).toUpperCase().padStart(this.offsetAddressMaxLength, "0") + ":";
    }
    const bytesCount: number = this.pageMaxLine * this.eachLineBytes;
    const dataview: DataView = new DataView(this._fileArrayBuffer);
    let ascii_code: number, ascii: string;

    // show hex bytes and their text and don't need consider the bytesCount in line
    for (i = 0; i < dataview.byteLength; i++) {
      let className = "";
      let ubyte = dataview.getUint8(i);
      for (let option of this._highlightCharOption) {
        if (option.enabled) {
          for (let chars of option.value) {
            if (chars instanceof Array) {
              if (chars[0] <= ubyte && ubyte <= chars[1]) className += " highlight-char-" + option.style;
            } else {
              if (chars === ubyte) className += " highlight-char-" + option.style;
            }
          }
        }
      }
      aSpan = this._HexArea.children.item(i) as HTMLSpanElement;
      offset = parseInt(aSpan.dataset["offset"]!);
      aSpan.textContent = ubyte.toString(16).toUpperCase().padStart(2, "0");
      aSpan.className = className;

      aSpan = this._TextArea.children.item(i) as HTMLSpanElement;
      offset = parseInt(aSpan.dataset["offset"]!);
      ascii_code = ubyte;
      ascii = String.fromCharCode(ascii_code);
      aSpan.textContent = ascii_code >= 32 && ascii_code <= 126 ? ascii : ".";
      aSpan.className = className;
    }

    // when there is any null bytes
    if (dataview.byteLength < bytesCount) {
      for (i = dataview.byteLength; i < bytesCount; i++) {
        aSpan = this._HexArea.children.item(i) as HTMLSpanElement;
        aSpan.textContent = "..";
        aSpan = this._TextArea.children.item(i) as HTMLSpanElement;
        aSpan.textContent = ".";
      }
    }

    // make the cursor visible if it is in window
    let cursorOffsetInWindow = this.cursorAddress ? this.cursorAddress - this.windowOffset : null;
    this._updateOffsetClass(cursorOffsetInWindow, "cursor");

    this.updateSelection(this._userSelection);
  }

  private _updateOffsetClass(offset: number | null | boolean, classname: string) {
    // old elements with className
    let cursorElements = Array.from(this._pageElement.getElementsByClassName(classname));
    // if old offset is equal to new offset, then do nothing
    if (cursorElements.length > 0 && (cursorElements[0] as HTMLElement).dataset["offset"] === offset?.toString()) return;
    for (let element of cursorElements) element.classList.remove(classname);
    if (offset !== null && offset !== false && offset >= 0) {
      cursorElements = Array.from(this._pageElement.querySelectorAll(`[data-offset="${offset}"]`));
      for (let element of cursorElements) element.classList.add(classname);
    }
  }

  private _generateContextMenu() {
    const menuList: MenuItem[] = [
      { key: "Cut", label: "剪切", handler: this.userSelectionCopy.bind(this), status: MenuItemStatus.INVISIBLE },
      {
        key: "Copy",
        label: "复制",
        handler: this.userSelectionCopy.bind(this),
        status: () => {
          if (0 <= this._userSelection.beginAddress && this._userSelection.endAddress < this.fileTotalBytes) return MenuItemStatus.NORMAL;
          else return MenuItemStatus.INVISIBLE;
        },
      },
      { key: "Paste", label: "粘贴", handler: this.userSelectionCopy.bind(this), status: MenuItemStatus.INVISIBLE },
      { key: "Delete", label: "删除", handler: this.userSelectionCopy.bind(this), status: MenuItemStatus.INVISIBLE },
    ];
    return menuList;
  }

  private _initKeyControl() {
    this._pageElement.addEventListener("click", this._onPageClick.bind(this));
    this._pageElement.addEventListener("mousemove", throttle(this._onPageMouseMove.bind(this), 10));
    this._pageElement.addEventListener("mousedown", this._onPageMouseDown.bind(this));
    this._pageElement.addEventListener("contextmenu", this._onPageContextMenu.bind(this));

    this._HexArea.addEventListener("keydown", this._onHexAreaKeyDown.bind(this));
    this._TextArea.addEventListener("keydown", this._onTextAreaKeyDown.bind(this));
  }

  private _onPageClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (this.__isHexOrTextUnit(target)) {
      let address = this.windowOffset + parseInt(target.dataset["offset"]!);
      this.setCursor(address);
      App.hookCall("afterByteClick", this, address, this._fileArrayBuffer);
    }
    PopupMenu.hidden();
  }

  private _onPageMouseMove(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (this.__isHexOrTextUnit(target)) {
      let offset = parseInt(target.dataset["offset"]!);
      this._updateOffsetClass(offset, "hover");
      if (this._mouseLeftDown) {
        let newSelectionEndAddress = this.windowOffset + offset;
        if (newSelectionEndAddress !== this._userSelection.endAddress) {
          if (!(newSelectionEndAddress < this.fileTotalBytes)) newSelectionEndAddress = this.fileTotalBytes - 1;
          this._userSelection.endAddress = newSelectionEndAddress;
          this.updateSelection(this._userSelection);
        }
      }
    } else {
      this._updateOffsetClass(null, "hover");
    }
  }

  private _onPageMouseMoveUserSelection({ y }: MouseEvent) {
    const { top, bottom } = this._pageElement.getBoundingClientRect();
    let dealt;
    if (top + 20 < y && y < bottom - 20) {
      return;
    } else {
      if (y <= top + 20) {
        dealt = -(top + 20 - y);
      } else {
        dealt = y - bottom + 20;
      }
      if (dealt < -20) dealt = -20;
      if (dealt > 20) dealt = 20;

      this.seekWindowOffset(calcBytesAlign(Math.floor(((dealt ^ 2) / 8000) * this._lastLineAddress), this.eachLineBytes) + this.windowOffset);
    }
  }

  private _onPageMouseDown(event: MouseEvent) {
    // left button of mouse
    if (event.button === 0) {
      const target = event.target as HTMLElement;
      if (this.__isHexOrTextUnit(target)) {
        let address = this.windowOffset + parseInt(target.dataset["offset"]!);
        if (address > this.fileTotalBytes) return; // ".." can't be selected
        this._userSelection.beginAddress = this._userSelection.endAddress = address;
        this._userSelection.viaible = true;
        const onMove = throttle(this._onPageMouseMoveUserSelection.bind(this), 10);
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", () => {
          window.removeEventListener("mousemove", onMove);
          this._mouseLeftDown = false;
        });
        this.updateSelection(this._userSelection);
      }
      this._mouseLeftDown = true;
      document.addEventListener("mouseup", throttle(this._onPageMouseUp.bind(this), 10), { once: true });
    }
  }

  private _onPageMouseUp(_event: MouseEvent) {}

  private _onPageContextMenu(event: MouseEvent) {
    PopupMenu.show(this._generateContextMenu(), event.pageX, event.pageY);
    event.preventDefault();
    return false;
  }

  private __isHexOrTextUnit(target: HTMLElement): boolean {
    return target.tagName === "SPAN" && (target.parentElement === this._HexArea || target.parentElement === this._TextArea);
  }

  private _onHexAreaKeyDown(event: KeyboardEvent) {
    this.__checkArrows(event);
  }

  private _onTextAreaKeyDown(event: KeyboardEvent) {
    this.__checkArrows(event);
  }

  private __checkArrows(event: KeyboardEvent) {
    switch (event.key) {
      case "ArrowUp":
        this.setAndSeekCursor(this.cursorAddress! - this.eachLineBytes);
        break;
      case "ArrowDown":
        this.setAndSeekCursor(this.cursorAddress! + this.eachLineBytes);
        break;
      case "ArrowLeft":
        this.setAndSeekCursor(this.cursorAddress! - 1);
        break;
      case "ArrowRight":
        this.setAndSeekCursor(this.cursorAddress! + 1);
        break;
    }
  }

  private _onScroll(type: number, value: number) {
    switch (type) {
      case ScrollBar.UP:
        this.seekWindowOffset(this.windowOffset - this.eachLineBytes);
        break;
      case ScrollBar.DOWN:
        this.seekWindowOffset(this.windowOffset + this.eachLineBytes);
        break;
      case ScrollBar.DRAG:
        this.seekWindowOffset(calcBytesAlign(this.fileTotalBytes * value!, this.eachLineBytes));
    }
  }
}
