import { downloadFile } from "./../utils";
import { FileReaderIO, FileReadResult } from "../modules/IO";
import { App } from "@/app";
import { ScrollBar } from "@/components/ScrollBar";
import { BytesFormat, calcBytesAlign, throttle } from "@/utils";
import { MenuItem, MenuItemStatus, PopupMenu } from "./PopupMenu";
import { MessageTip } from "./MessageTip";
import { PieceTable } from "@/modules/DataSource";
import "@/assets/css/EditorPage.less";

const template = `
<div class="editor-line-number"></div>
<div class="editor-hex-area"></div>
<div class="editor-text-area"></div>
<div class="editor-scrollbar"></div>
`;

export interface SelectionStyle {
  className: string;
}

export interface UserSelection {
  viaible: boolean;
  style: string;
  beginAddress: number;
  endAddress: number;
}

export enum CustomSelectionType {
  SCATTER,
  BLOCK,
  GROUP,
}

export interface CustomSelection {
  label: string;
  visible: boolean;
  style: string;
  type: CustomSelectionType;
  meta: number | number[];
  length?: number;
}

export interface HighightCharOption {
  label: string;
  value: any[];
  style: string;
  enabled: boolean;
}

export class EditorPage {
  // file
  public editorID: number;
  private originFile!: File; // Which file is opened
  private originFilePath?: string; // input file path
  public originFileSize: number = 0; // File bytes size
  public dataSource: PieceTable;
  // ui elements
  private uiPage!: HTMLDivElement; // The top layer container element
  private uiLine!: HTMLDivElement; // Left address line number
  private uiHex!: HTMLDivElement; // Major window to show hex bytes
  private uiText!: HTMLDivElement; // Minor window to show text for hex
  private uiScroll!: HTMLDivElement; // Right scroll bar
  // window page
  public windowSize: number = 0; // Clac by eachLineBytes and pageMaxLine
  public windowOffset: number = 0; // The offset of the first line of the view window relative to the file header
  public windowCursor: number | null = null; // The address of the current cursor
  public windowHover: number | null = null; // The offset of the hover cursor relative to the window
  public lineMax: number = 30; // The number of lines show in window
  public lineSize: number = 16; // Each line shows the bytes count
  public linePadLength: number = 8; // Each address pads max length
  private windowDataView!: DataView; // Window display bytes ArrayBuffer
  // ui interaction
  private scrollBar!: ScrollBar;
  private mouseLeftDown: boolean = false;
  private singleByteEditMode: { enabled: boolean; value: number; address: number } = {
    enabled: false,
    value: 0,
    address: 0,
  };
  public dirty: boolean = false; // Whether it has been modified
  private _userSelection: UserSelection;
  private _highlightCharOption: HighightCharOption[] = [
    { label: "Space", value: [32], style: "space", enabled: false },
    { label: "CR/LF", value: [10, 13], style: "crlf", enabled: false },
    { label: "Display ASCII", value: [[32, 126]], style: "display", enabled: false },
    { label: "Number ASCII", value: [[48, 57]], style: "number", enabled: false },
    {
      label: "Alhabet ASCII",
      value: [
        [65, 90],
        [97, 122],
      ],
      style: "alphabet",
      enabled: false,
    },
    { label: "Control ASCII", value: [[0, 31], 127], style: "control", enabled: false },
    { label: "Non-ASCII", value: [[128, 255]], style: "non-ascii", enabled: false },
  ];
  // 零散选区，块选区，组合选区
  private _customSelection: CustomSelection[] = [];
  private _cursorSelectionIndex: number = -1;

  get editorElement() {
    return this.uiPage;
  }

  get hexAreaElement() {
    return this.uiHex;
  }

  get currentFile(): File {
    return this.originFile;
  }

  get isDirty() {
    return this.dirty;
  }

  get filePath() {
    return this.originFilePath;
  }

  get lastLineAddress() {
    return calcBytesAlign(this.dataSource.size, this.lineSize);
  }

  constructor(id: number, file: File, filePath?: string) {
    this.editorID = id;
    this.windowSize = this.lineSize * this.lineMax;
    this.originFile = file;
    this.originFilePath = filePath;
    this.originFileSize = file.size;
    this.linePadLength = Math.max(8, Math.ceil(Math.log(file.size) / Math.log(16)));
    this._userSelection = { viaible: false, style: "selected", beginAddress: -1, endAddress: -1 };
    this.dataSource = new PieceTable(new FileReaderIO(file));
    this._initEditorPage();
  }

  public readFile(offset: number, length: number): Promise<FileReadResult> {
    return this.dataSource.slice(offset, length);
  }

  public insert(offset: number, data: ArrayLike<number>) {
    this.dataSource.insert(offset, data);
  }

  public delete(offset: number, length: number) {
    this.dataSource.delete(offset, length);
    console.log(this.dataSource);
  }

  // it will slice the file [windowOffset, windowOffset+bytesCount]
  private seekWindowOffset(windowOffset: number) {
    if (windowOffset > this.lastLineAddress - this.windowSize) {
      windowOffset = this.lastLineAddress - this.windowSize;
    }
    windowOffset = windowOffset > 0 ? windowOffset : 0;
    this.windowOffset = windowOffset;
    this.readFile(windowOffset, this.windowSize).then((res: FileReadResult) => {
      this.windowDataView = new DataView(res.result as ArrayBuffer);
      this._updateEditorPage();
      this.scrollBar.updateScrollDisplayRatio(windowOffset / (this.dataSource.size - this.windowSize));
      App.hookCall("afterWindowSeek", this.windowDataView);
    });
  }

  public storeSingleByteEdit() {
    if (this.singleByteEditMode.enabled) {
      this.singleByteEditMode.enabled = false;
      if (this.singleByteEditMode.address !== this.dataSource.size) {
        this.dataSource.delete(this.singleByteEditMode.address, 1);
      }
      this.dataSource.insert(this.singleByteEditMode.address, [this.singleByteEditMode.value]);
      this._updateDataOffsetClass(null, "editing");
    }
  }

  /**
   * Seek an address in window
   * @param address the offset will be seek in window
   * @param forceFirstLine force the offset address to the first line
   */
  public seekAddress(address: number, forceFirstLine: boolean = false) {
    let offset: number = Math.floor(address / this.lineSize) * this.lineSize;
    if (!forceFirstLine && this.windowOffset <= offset && offset < this.windowOffset + this.windowSize) return;
    this.seekWindowOffset(offset);
  }

  /**
   * set the cursor address
   * @param address the address of cursor
   */
  public setCursor(address: number) {
    this._updatePageOffsetClass(address - this.windowOffset, "cursor");
    this.windowCursor = address;
    this.storeSingleByteEdit();
  }

  public setAndSeekCursor(address: number) {
    if (!(address >= 0 && address < this.dataSource.size)) return;
    this.setCursor(address);
    this.seekAddress(address, false);
  }

  public setDisplayByte(offset: number, byte: number) {
    let aSpan: HTMLElement, ascii: string;
    aSpan = this.uiHex.children.item(offset) as HTMLSpanElement;
    aSpan.textContent = byte.toString(16).toUpperCase().padStart(2, "0");

    aSpan = this.uiText.children.item(offset) as HTMLSpanElement;
    ascii = String.fromCharCode(byte);
    aSpan.textContent = byte >= 32 && byte <= 126 ? ascii : ".";
  }

  public updateSelection(selection: UserSelection) {
    const { style } = selection;
    const clearClass = (classname: string) => {
      const elements = this.uiPage.getElementsByClassName(classname);
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
      } else if (beginAddress >= this.windowOffset + this.windowSize) {
        return;
      } else {
        childOffset = beginAddress - this.windowOffset;
        this.uiHex.children[childOffset].classList.add(style + "-begin");
        this.uiText.children[childOffset].classList.add(style + "-begin");
      }
      if (this.windowOffset <= endAddress && endAddress < this.windowOffset + this.windowSize) {
        stopOffset = endAddress - this.windowOffset;
        this.uiHex.children[stopOffset].classList.add(style + "-end");
        this.uiText.children[stopOffset].classList.add(style + "-end");
      } else if (endAddress < this.windowOffset) {
        return;
      } else {
        stopOffset = this.windowSize - 1;
      }

      for (let i = childOffset; i <= stopOffset; i++) {
        this.uiHex.children[i].classList.add(style);
        this.uiText.children[i].classList.add(style);
      }
    }
  }

  public setUserSelection(address: number) {
    if (address > this.dataSource.size) return; // ".." can't be selected
    this._userSelection.beginAddress = this._userSelection.endAddress = address;
    this._userSelection.viaible = true;
  }

  public getSelectionBytes(selection: UserSelection) {
    const { beginAddress, endAddress } = selection;
    if (beginAddress < 0 || endAddress >= this.dataSource.size) {
      throw new Error("Invalid selection.");
    }
    return this.readFile(beginAddress, endAddress - beginAddress + 1);
  }

  public copyUserSelection() {
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

  public addCustomSelection(selection: CustomSelection) {
    this._customSelection.push(selection);
  }

  public update(reSeek = false) {
    if (reSeek) this.seekWindowOffset(this.windowOffset);
    this._updateEditorPage();
  }

  public save() {
    console.log("saving");
    this.dataSource.slice(0, this.dataSource.size).then((frr) => {
      downloadFile(new Blob([frr.result],{type:"application/octet-stream"}), this.originFile.name);
    });
  }

  public destory() {
    if (this.dirty) {
      this.save();
    }
    this.windowDataView = null!;
    this.originFile = null!;
    this.uiPage.remove();
  }

  private _initEditorPage() {
    const page: HTMLDivElement = document.createElement("div");
    page.classList.add("editor-page");
    page.dataset["pageId"] = this.editorID.toString();
    page.innerHTML = template;
    document.querySelector<HTMLDivElement>(".tab-contents")?.appendChild(page);
    this.uiLine = page.querySelector(".editor-line-number")!;
    this.uiHex = page.querySelector(".editor-hex-area")!;
    this.uiText = page.querySelector(".editor-text-area")!;
    this.uiScroll = page.querySelector(".editor-scrollbar")!;
    this.uiPage = page;

    page.setAttribute("tabindex", "0");
    this.uiHex.setAttribute("tabindex", "0");
    this.uiText.setAttribute("tabindex", "0");

    let observer = new ResizeObserver(
      throttle(([e]: ResizeObserverEntry[]) => {
        if (!this.originFile) {
          observer.disconnect();
          observer = null!;
        } else if ((e.target as HTMLElement).style.display !== "none") {
          this._adjustEditorPage();
          this.seekWindowOffset(this.windowOffset);
        }
      }, 10)
    );
    observer.observe(page);

    this.scrollBar = new ScrollBar(this.uiPage, this.uiScroll, this._onScroll.bind(this));

    this._initKeyControl();
  }

  /**
   * adjust editor page viewer elements, clear base element and regenerate them
   */
  private _adjustEditorPage() {
    // calc max line number
    this.lineMax = Math.floor(this.uiHex.getBoundingClientRect().height / 26);
    this.windowSize = this.lineMax * this.lineSize;

    let i: number;
    let length: number = this.windowSize;

    // add line number
    for (i = this.uiLine.children.length; i < this.lineMax; i++) {
      const unit = document.createElement("div");
      unit.dataset["lineOffset"] = i.toString();
      this.uiLine.appendChild(unit);
    }

    for (i = this.uiLine.children.length - 1; i >= length; i--) this.uiLine.children[i].remove();

    // add byte span
    for (i = this.uiHex.children.length; i < length; i++) {
      const unit = document.createElement("span");
      unit.dataset["offset"] = i.toString();
      this.uiHex.appendChild(unit);
    }
    for (i = this.uiHex.children.length - 1; i >= length; i--) this.uiHex.children[i].remove();

    for (i = this.uiText.children.length; i < length; i++) {
      const unit = document.createElement("span");
      unit.dataset["offset"] = i.toString();
      this.uiText.appendChild(unit);
    }
    for (i = this.uiText.children.length - 1; i >= length; i--) this.uiText.children[i].remove();
  }

  private _updateEditorPage() {
    let aSpan: HTMLSpanElement;
    let end: number, i: number;
    let offset: number;
    for (i = 0, end = this.uiLine.childElementCount; i < end; i++) {
      aSpan = this.uiLine.children.item(i) as HTMLSpanElement;
      offset = parseInt(aSpan.dataset["lineOffset"]!) * this.lineSize;
      aSpan.textContent = (this.windowOffset + offset).toString(16).toUpperCase().padStart(this.linePadLength, "0") + ":";
    }
    const bytesCount: number = this.lineMax * this.lineSize;
    let ascii_code: number, ascii: string;

    // show hex bytes and their text and don't need consider the bytesCount in line
    for (i = 0; i < this.windowDataView.byteLength; i++) {
      let className = "";
      let ubyte = this.windowDataView.getUint8(i);
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
      aSpan = this.uiHex.children.item(i) as HTMLSpanElement;
      aSpan.textContent = ubyte.toString(16).toUpperCase().padStart(2, "0");
      aSpan.className = className;

      aSpan = this.uiText.children.item(i) as HTMLSpanElement;
      ascii_code = ubyte;
      ascii = String.fromCharCode(ascii_code);
      aSpan.textContent = ascii_code >= 32 && ascii_code <= 126 ? ascii : ".";
      aSpan.className = className;
    }

    // when there is any null bytes
    if (this.windowDataView.byteLength < bytesCount) {
      for (i = this.windowDataView.byteLength; i < bytesCount; i++) {
        aSpan = this.uiHex.children.item(i) as HTMLSpanElement;
        aSpan.textContent = "..";
        aSpan = this.uiText.children.item(i) as HTMLSpanElement;
        aSpan.textContent = ".";
      }
    }

    // make the cursor visible if it is in window
    let cursorOffsetInWindow = this.windowCursor ? this.windowCursor - this.windowOffset : null;
    this._updatePageOffsetClass(cursorOffsetInWindow, "cursor");

    this._updateCustomSelection();

    this.updateSelection(this._userSelection);

    if (this.singleByteEditMode.enabled) {
      let offset = this.singleByteEditMode.address - this.windowOffset;
      this.setDisplayByte(offset, this.singleByteEditMode.value);
      this._updateDataOffsetClass(this.windowCursor, "editing");
    }
  }

  private _updateDataOffsetClass(offset: number | null, classname: string) {
    let cursorElements = Array.from(this.uiPage.getElementsByClassName(classname));
    for (let element of cursorElements) element.classList.remove(classname);
    if (offset !== null) {
      offset = offset - this.windowOffset;
      cursorElements = Array.from(this.uiPage.querySelectorAll(`[data-offset="${offset}"]`));
      for (let element of cursorElements) element.classList.add(classname);
    }
  }

  private _updatePageOffsetClass(offset: number | null | boolean, classname: string) {
    // old elements with className
    let cursorElements = Array.from(this.uiPage.getElementsByClassName(classname));
    // if old offset is equal to new offset, then do nothing
    if (cursorElements.length > 0 && (cursorElements[0] as HTMLElement).dataset["offset"] === offset?.toString()) return;
    for (let element of cursorElements) element.classList.remove(classname);
    if (offset !== null && offset !== false && offset >= 0) {
      cursorElements = Array.from(this.uiPage.querySelectorAll(`[data-offset="${offset}"]`));
      for (let element of cursorElements) element.classList.add(classname);
    }
  }

  private _updateCustomSelection() {
    let length: number;
    for (let selection of this._customSelection) {
      if (!selection.visible) continue;
      if (selection.type === CustomSelectionType.SCATTER) {
        length = selection.length || 1;
        (selection.meta as number[]).forEach((offset) => {
          let childOffset: number;
          if (this.windowOffset <= offset) {
            for (let i = 0; i < length; ++i) {
              let beginAddress = offset + i;
              let endAddress = beginAddress + length - 1;
              let stopOffset: number;
              if (beginAddress < this.windowOffset) {
                childOffset = 0;
              } else if (beginAddress >= this.windowOffset + this.windowSize) {
                continue;
              } else {
                childOffset = beginAddress - this.windowOffset;
                this.uiHex.children[childOffset].classList.add(selection.style + "-begin");
                this.uiText.children[childOffset].classList.add(selection.style + "-begin");
              }
              if (this.windowOffset <= endAddress && endAddress < this.windowOffset + this.windowSize) {
                stopOffset = endAddress - this.windowOffset;
                this.uiHex.children[stopOffset].classList.add(selection.style + "-end");
                this.uiText.children[stopOffset].classList.add(selection.style + "-end");
              } else if (endAddress < this.windowOffset) {
                return;
              } else {
                stopOffset = this.windowSize - 1;
              }

              for (let i = childOffset; i <= stopOffset; i++) {
                this.uiHex.children[i].classList.add(selection.style);
                this.uiText.children[i].classList.add(selection.style);
              }
            }
          }
        });
      }
    }
  }

  private _generateContextMenu() {
    const menuList: MenuItem[] = [
      { key: "Cut", label: "剪切", handler: this.copyUserSelection.bind(this), status: MenuItemStatus.INVISIBLE },
      {
        key: "Copy",
        label: "复制",
        handler: this.copyUserSelection.bind(this),
        status: () => {
          if (0 <= this._userSelection.beginAddress && this._userSelection.endAddress < this.dataSource.size) return MenuItemStatus.NORMAL;
          else return MenuItemStatus.INVISIBLE;
        },
      },
      { key: "Paste", label: "粘贴", handler: this.copyUserSelection.bind(this), status: MenuItemStatus.INVISIBLE },
      { key: "Delete", label: "删除", handler: this.copyUserSelection.bind(this), status: MenuItemStatus.INVISIBLE },
    ];
    return menuList;
  }

  private _initKeyControl() {
    this.uiPage.addEventListener("click", this._onPageClick.bind(this));
    this.uiPage.addEventListener("mousemove", throttle(this._onPageMouseMove.bind(this), 10));
    this.uiPage.addEventListener("mousedown", this._onPageMouseDown.bind(this));
    this.uiPage.addEventListener("contextmenu", this._onPageContextMenu.bind(this));

    this.uiHex.addEventListener("keydown", this._onHexAreaKeyDown.bind(this));
    this.uiText.addEventListener("keydown", this._onTextAreaKeyDown.bind(this));
  }

  private _onPageClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (this.__isHexOrTextUnit(target)) {
      let address = this.windowOffset + parseInt(target.dataset["offset"]!);
      this.setCursor(address);
      App.hookCall("afterByteClick", this, address, this.windowDataView);
    }
  }

  private _onPageMouseMove(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (this.__isHexOrTextUnit(target)) {
      let offset = parseInt(target.dataset["offset"]!);
      this._updatePageOffsetClass(offset, "hover");
      if (this.mouseLeftDown) {
        let newSelectionEndAddress = this.windowOffset + offset;
        if (newSelectionEndAddress !== this._userSelection.endAddress) {
          if (!(newSelectionEndAddress < this.dataSource.size)) newSelectionEndAddress = this.dataSource.size - 1;
          this._userSelection.endAddress = newSelectionEndAddress;
          this.updateSelection(this._userSelection);
        }
      }
    } else {
      this._updatePageOffsetClass(null, "hover");
    }
  }

  private _onPageMouseMoveUserSelection({ y }: MouseEvent) {
    const { top, bottom } = this.uiPage.getBoundingClientRect();
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

      this.seekWindowOffset(calcBytesAlign(Math.floor(((dealt ^ 2) / 8000) * this.lastLineAddress), this.lineSize) + this.windowOffset);
    }
  }

  private _onPageMouseDown(event: MouseEvent) {
    // left button of mouse
    if (event.button === 0) {
      const target = event.target as HTMLElement;
      if (this.__isHexOrTextUnit(target)) {
        this.setUserSelection(this.windowOffset + parseInt(target.dataset["offset"]!));
        const onMove = throttle(this._onPageMouseMoveUserSelection.bind(this), 10);
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", () => {
          window.removeEventListener("mousemove", onMove);
          this.mouseLeftDown = false;
        });
        this.updateSelection(this._userSelection);
      }
      this.mouseLeftDown = true;
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
    return target.tagName === "SPAN" && (target.parentElement === this.uiHex || target.parentElement === this.uiText);
  }

  private _onHexAreaKeyDown(event: KeyboardEvent) {
    this.__handleArrows(event);
    this.__handleEdit(event);
  }

  private _onTextAreaKeyDown(event: KeyboardEvent) {
    this.__handleArrows(event);
  }

  private __handleArrows(event: KeyboardEvent) {
    switch (event.key) {
      case "ArrowUp":
        this.setAndSeekCursor(this.windowCursor! - this.lineSize);
        break;
      case "ArrowDown":
        this.setAndSeekCursor(this.windowCursor! + this.lineSize);
        break;
      case "ArrowLeft":
        this.setAndSeekCursor(this.windowCursor! - 1);
        break;
      case "ArrowRight":
        this.setAndSeekCursor(this.windowCursor! + 1);
        break;
    }
  }

  private __handleEdit(event: KeyboardEvent) {
    if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) return;
    const ascii = event.key.charCodeAt(0);
    if (!((97 <= ascii && ascii <= 102) || (48 <= ascii && ascii <= 57))) return;
    let value = ascii;
    let originValue: number;
    value = ascii >= 97 ? value - 97 + 10 : value - 48;
    if (this.windowCursor && this.windowCursor > this.dataSource.size) return;

    if (this.singleByteEditMode.enabled) {
      originValue = this.singleByteEditMode.value;
      value = value + (originValue & 0xf0);

      if (this.singleByteEditMode.address !== this.dataSource.size) {
        this.dataSource.delete(this.singleByteEditMode.address, 1);
      }
      this.dataSource.insert(this.singleByteEditMode.address, [value]);

      this.singleByteEditMode.enabled = false;

      this.setCursor(this.windowCursor! + 1);
      this.setUserSelection(this.windowCursor!);
      this.update(true);
      console.log(this.dataSource);
    } else {
      if (this.windowCursor == this.dataSource.size) originValue = 0;
      else originValue = this.windowDataView.getUint8(this.windowCursor! - this.windowOffset)!;

      value = (value << 4) + (originValue & 0x0f);

      this.singleByteEditMode.value = value;
      this.singleByteEditMode.enabled = true;
      this.singleByteEditMode.address = this.windowCursor!;

      this.update(false);
    }
  }

  private _onScroll(type: number, value: number) {
    switch (type) {
      case ScrollBar.UP:
        this.seekWindowOffset(this.windowOffset - this.lineSize);
        break;
      case ScrollBar.DOWN:
        this.seekWindowOffset(this.windowOffset + this.lineSize);
        break;
      case ScrollBar.DRAG:
        this.seekWindowOffset(calcBytesAlign(this.dataSource.size * value!, this.lineSize));
    }
  }
}
