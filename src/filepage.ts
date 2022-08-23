import { App } from "./app";
import { ScrollBar } from "./components/ScrollBar";
import { VirtualList } from "./components/VirtualList";
import { calcBytesAlign, throttle } from "./utils";

const template=`
<div class="editor-line-number"></div>
<div class="editor-hex-area"></div>
<div class="editor-text-area"></div>
<div class="virtual-scrollbar"></div>
`;

export interface FileReadResult {
  offset: number;
  length: number;
  result: any;
}

export class FilePage {
  public fileID: number;
  public cursorOffset: number | null = null;  // The offset of the current cursor relative to the file header
  public windowOffset: number = 0;            // The offset of the first line of the view window relative to the file header
  public dirty: boolean = false;              // Whether it has been modified
  public pageMaxLine: number = 30;            // The number of lines show in window
  public eachLineBytes: number = 16;          // Each line shows the bytes count
  public pageBytesCount: number = 0;          // Clac by eachLineBytes and pageMaxLine
  public fileTotalBytes: number = 0;          // File bytes size
  public offsetAddressMaxLength: number = 8;  // Each address pads max length
  private _inputFile!: File;                  // Which file is opened
  private _fileArrayBuffer!: ArrayBuffer;     // Window bytes ArrayBuffer
  private _pageElement!: HTMLDivElement;      // The top layer container element
  private _LineNumber!: HTMLDivElement;       // Left address line number
  private _HexArea!: HTMLDivElement;          // Major window to show hex bytes
  private _TextArea!: HTMLDivElement;         // Minor window to show text for hex
  private _Scroll!: HTMLDivElement;           // Right scroll bar
  private _lastLineAddress: number = 0;       // Last address line number
  private _ScrollBar!: ScrollBar;

  constructor(id:number,file: File) {
    this.fileID = id;
    this.pageBytesCount = this.eachLineBytes * this.pageMaxLine;

    this.initEditorPage();

    this._inputFile = file;
    this.fileTotalBytes = file.size;
    this.offsetAddressMaxLength = Math.max(8, Math.ceil(Math.log(file.size) / Math.log(16)));
    this._lastLineAddress = calcBytesAlign(this.fileTotalBytes, this.eachLineBytes);
    this.adjustEditorPage();
    this.seekWindowOffset(0);
  }

  get editorElement() { return this._pageElement; }
  get hexAreaElement() { return this._HexArea; }

  public readFile(offset: number, length: number): Promise<FileReadResult> {
    return new Promise<FileReadResult>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve({ offset, length, result: fr.result });
      fr.onerror = reject;
      fr.readAsArrayBuffer(this._inputFile.slice(offset, offset + length));
    });
  }

  get currentFile():File{
    return this._inputFile;
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
      this.updateEditorPage();
      this._ScrollBar.updateScrollDisplayRatio(windowOffset / (this.fileTotalBytes-this.pageBytesCount));
      App.hookCall('afterWindowSeek',this._fileArrayBuffer);
    });

  }
  private onScroll(type:number,value:number){
    switch(type){
      case ScrollBar.UP:
        this.seekWindowOffset(this.windowOffset - this.eachLineBytes);
        break;
      case ScrollBar.DOWN:
        this.seekWindowOffset(this.windowOffset + this.eachLineBytes);
        break;
      case ScrollBar.DRAG:
        this.seekWindowOffset(calcBytesAlign(this.fileTotalBytes * value, this.eachLineBytes));
    }
  }

  private initEditorPage() {
    const page: HTMLDivElement = document.createElement('div');
    page.classList.add('editor-page');
    page.dataset['pageId'] = this.fileID.toString();
    page.innerHTML = template;
    document.querySelector<HTMLDivElement>('.tab-contents')?.appendChild(page);
    this._LineNumber = page.querySelector('.editor-line-number')!;
    this._HexArea = page.querySelector('.editor-hex-area')!;
    this._TextArea = page.querySelector('.editor-text-area')!;
    this._Scroll = page.querySelector('.virtual-scrollbar')!;
    this._pageElement = page;

    page.oncontextmenu = (event: MouseEvent) => {
      const menu = document.querySelector<HTMLDivElement>('.context-menu')!;
      menu.style.left = event.pageX + 'px';
      menu.style.top = event.pageY + 'px';
      menu.style.display = 'block';
      return false;
    };

    page.onclick = () => {
      const menu = document.querySelector<HTMLDivElement>('.context-menu')!;
      menu.style.display = 'none';
    };

    page.onwheel = (event: WheelEvent) => {
      let delta = event.deltaY > 0 ? 1 : -1;
      // Scroll a quarter of a page at once
      this.seekWindowOffset(this.windowOffset + delta * this.eachLineBytes * Math.floor(this.pageMaxLine * 0.25));
    };
    this._ScrollBar=new ScrollBar(this._Scroll,this.onScroll.bind(this));
  }

  private byteOnclick(event: MouseEvent) {
    let offset = parseInt((event.target as HTMLSpanElement).dataset['offset']!);
    this.removeByteSpanClass('cursor');
    this.addByteSpanClass(offset, 'cursor');
    this.cursorOffset = this.windowOffset + offset;
    App.hookCall('afterByteClick',this,offset,this._fileArrayBuffer);
  };

  /**
   * adjust editor page viewer elements, clear base element and regenerate them
   */
  private adjustEditorPage() {
    this._LineNumber.innerHTML = '';
    this._HexArea.innerHTML = '';
    this._TextArea.innerHTML = '';

    // calc max line number
    this.pageMaxLine = Math.floor(this._HexArea.getBoundingClientRect().height / 26)
    this.pageBytesCount = this.pageMaxLine * this.eachLineBytes;

    let aDiv: HTMLDivElement;
    let aSpan: HTMLSpanElement;
    let i: number;
    let end_addr: number = this.pageBytesCount;
    let offset: number;

    // add line number
    for (i = this.windowOffset; i < end_addr; i += this.eachLineBytes) {
      aDiv = document.createElement('div');
      aDiv.dataset['offset'] = i.toString();
      aDiv.textContent = '';
      this._LineNumber?.appendChild(aDiv);
    }

    // MouseEvent: hover byte, selected byte
    const onSpanMouseEnter = (event: MouseEvent) => {
      offset = parseInt((event.target as HTMLSpanElement).dataset['offset']!);
      this.addByteSpanClass(offset, 'hover');
    };
    const onSpanMouseLeave = () => {
      this.removeByteSpanClass('hover');
    };

    // add byte span
    for (i = this.windowOffset; i < end_addr; i++) {
      aSpan = document.createElement('span');
      aSpan.dataset['offset'] = i.toString();
      aSpan.textContent = '';
      aSpan.onclick = this.byteOnclick.bind(this);
      aSpan.onmouseenter = onSpanMouseEnter;
      aSpan.onmouseleave = onSpanMouseLeave;
      this._HexArea?.appendChild(aSpan);
    }

    for (i = this.windowOffset; i < end_addr; i++) {
      aSpan = document.createElement('span');
      aSpan.dataset['offset'] = i.toString();
      aSpan.textContent = '';
      aSpan.onclick = this.byteOnclick.bind(this);
      aSpan.onmouseenter = onSpanMouseEnter;
      aSpan.onmouseleave = onSpanMouseLeave;
      this._TextArea?.appendChild(aSpan);
    }
  }

  private updateEditorPage() {
    let aSpan: HTMLSpanElement;
    let end: number, i: number;
    let offset: number;
    this.removeByteSpanClass('cursor');
    for (i = 0, end = this._LineNumber.childElementCount; i < end; i++) {
      aSpan = this._LineNumber.children.item(i) as HTMLSpanElement;
      offset = parseInt(aSpan.dataset['offset']!);
      aSpan.textContent = (this.windowOffset + offset).toString(16).toUpperCase().padStart(this.offsetAddressMaxLength, '0');
    }
    const bytesCount: number = this.pageMaxLine * this.eachLineBytes;
    const dataview: DataView = new DataView(this._fileArrayBuffer);

    // show hex bytes and don't need consider the bytesCount in line
    for (i = 0; i < dataview.byteLength; i++) {
      aSpan = this._HexArea.children.item(i) as HTMLSpanElement;
      offset = parseInt(aSpan.dataset['offset']!);
      aSpan.textContent = dataview.getUint8(i).toString(16).toUpperCase().padStart(2, '0');
    }

    // when there is any null bytes
    if (dataview.byteLength < bytesCount) {
      for (i = dataview.byteLength; i < bytesCount; i++) {
        aSpan = this._HexArea.children.item(i) as HTMLSpanElement;
        aSpan.textContent = '..';
      }
    }

    // now,it has implemented display of ascii
    // TODO: utf-8 and any other encoding
    let ascii_code: number, ascii: string;
    for (i = 0; i < dataview.byteLength; i++) {
      aSpan = this._TextArea.children.item(i) as HTMLSpanElement;
      offset = parseInt(aSpan.dataset['offset']!);
      ascii_code = dataview.getUint8(i);
      ascii = String.fromCharCode(ascii_code);
      aSpan.textContent = ascii_code >= 32 && ascii_code <= 126 ? ascii : '.';
    }

    // when there is any null characters
    if (dataview.byteLength < bytesCount) {
      for (i = dataview.byteLength; i < bytesCount; i++) {
        aSpan = this._TextArea.children.item(i) as HTMLSpanElement;
        aSpan.textContent = '.';
      }
    }

    // make the cursor visible if it is in window
    if (this.cursorOffset !== null) {
      let cursorOffsetInWindow = this.cursorOffset - this.windowOffset
      if (this.cursorOffset - this.windowOffset >= 0 && this.cursorOffset - this.windowOffset <= dataview.byteLength) {
        this.addByteSpanClass(cursorOffsetInWindow, 'cursor');
      }
    }
  }


  private removeByteSpanClass(classname: string) {
    let cursorElements = this._pageElement.querySelectorAll(`span.${classname}`);
    cursorElements.forEach((aSpan: Element) => {
      aSpan.classList.remove(classname);
    })
  }

  private addByteSpanClass(offset: number, classname: string) {
    let byteElements = this._pageElement.querySelectorAll(`[data-offset="${offset}"]`);
    byteElements.forEach((aSpan: Element) => {
      if (aSpan.parentElement !== this._LineNumber) aSpan.classList.add(classname);
    })
  }

  public save() { }
  public destory() {
    if (this.dirty) { this.save(); }
    this._fileArrayBuffer = null!;
    this._inputFile = null!;
    this._pageElement.remove();
  }
}