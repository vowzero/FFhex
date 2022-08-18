import { updateDataViewer } from "./dataviewer";

enum AppStatus {
  LOADED_FILE,
  LOADING_FILE,
  READ_FILE,
  WRITE_FILE,
  CLOSE_FILE,
};

export class App {
  static pool:App[]=[];
  static pageCount: number;
  static pageIndex: number = 1;
  static currentPage:App;

  static switchFile(pageID:number){
    for(let app of App.pool){
      if(app.pageID==pageID){
        App.currentPage=app;
        break;
      }
    }
  }

  static openFile(file:File):App|null{
    let app:App;
    if(App.isReopenFile(file)){
      console.log('Reopen file');
      return null;
    }else{
      app=new App(file);
      App.pool.push(app);
      return app;
    }
  }

  static closeFile(pageID:number){
    for(let app of App.pool){
      if(app.pageID==pageID){
        app.destory();
        break;
      }
    }
  }

  private static isReopenFile(file:File):boolean{
    return false||file===null;
  }

  public pageID: number;
  public cursorOffset: number | null = null; // The offset of the current cursor relative to the file header
  public windowOffset: number = 0;         // The offset of the first line of the view window relative to the file header
  public dirty: boolean = false;           // Whether it has been modified
  public pageBytesCount: number = 0;
  public eachLineBytes: number = 16;
  public pageMaxLine: number = 30;
  public fileTotalBytes: number = 0;
  public offsetAddressMaxLength: number = 8;
  public scrollRatio: number = 0;
  private status: AppStatus = AppStatus.CLOSE_FILE;
  private _inputFile!: File;
  private _fileReader!: FileReader;
  private _fileArrayBuffer!: ArrayBuffer;
  private _pageElement!: HTMLDivElement;
  private _LineNumber!: HTMLDivElement;
  private _HexArea!: HTMLDivElement;
  private _TextArea!: HTMLDivElement;
  private _Scroll!: HTMLDivElement;
  private _lastLineAddress: number = 0;
  private _readPromise!:Promise<FileReader>;

  constructor(file:File) {
    App.pageCount++;
    this.pageID = App.pageIndex++;
    this.pageBytesCount=this.eachLineBytes*this.pageMaxLine;

    this._fileReader = new FileReader();
    this.initEditorPage();

    this._inputFile = file;
    this.status = AppStatus.LOADING_FILE;
    this.fileTotalBytes = file.size;
    this.offsetAddressMaxLength = Math.max(8, Math.ceil(Math.log(file.size) / Math.log(16)));
    this._lastLineAddress=calcBytesAlign(this.fileTotalBytes,this.eachLineBytes);
    this.adjustEditorPage();
    this.seekWindowOffset(0);
    console.log(this.status);
  }

  get editorElement(){return this._pageElement;}

  public readFile(offset:number,length:number):Promise<FileReader>{
    let slice:Blob=this._inputFile.slice(offset, offset + length)
    this._readPromise= new Promise<FileReader>((resolve, reject) => {
      this._fileReader.onload=()=>resolve(this._fileReader);
      this._fileReader.onerror=reject;
      this._fileReader.readAsArrayBuffer(slice);
    });
    return this._readPromise;
  }

  // it will slice the file [windowOffset, windowOffset+bytesCount]
  private seekWindowOffset(windowOffset: number) {
    if (windowOffset > this._lastLineAddress-this.pageBytesCount) {
      windowOffset =  this._lastLineAddress-this.pageBytesCount;
    }
    windowOffset=windowOffset>0?windowOffset:0;
    this.windowOffset = windowOffset;
    this.readFile(windowOffset,this.pageBytesCount).then(()=>{
      this._fileArrayBuffer = this._fileReader.result as ArrayBuffer;
      this.updateEditorPage();
      this.updateScrollPosition(windowOffset/this.fileTotalBytes);
    });

  }

  private initEditorPage() {
    const page: HTMLDivElement = document.createElement('div');
    page.classList.add('editor-page');
    page.dataset['pageId'] = this.pageID.toString();
    page.innerHTML = `
      <div class="editor-line-number"></div>
      <div class="editor-hex-area"></div>
      <div class="editor-text-area"></div>
      <div class="editor-scroll">
        <div class="scroll-up"></div>
        <div class="scroll-bar" style="top:15px;"></div>
        <div class="scroll-down"></div>
      </div>
    `;
    document.querySelector<HTMLDivElement>('.tab-contents')?.appendChild(page);
    this._LineNumber = page.querySelector('.editor-line-number')!;
    this._HexArea = page.querySelector('.editor-hex-area')!;
    this._TextArea = page.querySelector('.editor-text-area')!;
    this._Scroll = page.querySelector('.editor-scroll')!;
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
      let delta = event.deltaY>0?1:-1;
      // Scroll a quarter of a page at once
      this.seekWindowOffset(this.windowOffset + delta*this.eachLineBytes* Math.floor(this.pageMaxLine*0.25));
    };

    this._Scroll.querySelector<HTMLDivElement>('.scroll-up')!.onclick = () => this.seekWindowOffset(this.windowOffset - this.eachLineBytes);
    this._Scroll.querySelector<HTMLDivElement>('.scroll-down')!.onclick = () => this.seekWindowOffset(this.windowOffset + this.eachLineBytes);
    this._Scroll.querySelector<HTMLDivElement>('.scroll-bar')!.onmousedown = () => {
      document.onmousemove = throttle((event: MouseEvent) => {
        let height: number = this._Scroll.offsetHeight;
        let clipTop = event.pageY - this._Scroll.getBoundingClientRect().top;
        if (clipTop < 15) clipTop = 15;
        if (clipTop > height - 30) clipTop = height - 30;
        this.updateScrollPosition((clipTop - 15) / (height - 45))

        this.seekWindowOffset(calcBytesAlign(this.fileTotalBytes * this.scrollRatio,this.eachLineBytes));
      }, 10);
      document.onmouseup = () => document.onmousemove = document.onmouseup = null;
    };

  }

  private byteOnclick(event: MouseEvent){
    let offset = parseInt((event.target as HTMLSpanElement).dataset['offset']!);
    this.removeByteSpanClass('cursor');
    this.addByteSpanClass(offset, 'cursor');
    this.cursorOffset = this.windowOffset + offset;
    updateDataViewer(offset,this._fileArrayBuffer);
  };

  /**
   * adjust editor page viewer elements, clear base element and regenerate them
   */
  private adjustEditorPage() {
    this._LineNumber.innerHTML = '';
    this._HexArea.innerHTML = '';
    this._TextArea.innerHTML = '';
    // this._Scroll.innerHTML=''; // Scroll needn't adjust

    // calc max line number
    this.pageMaxLine=Math.floor(this._HexArea.getBoundingClientRect().height/26)
    this.pageBytesCount=this.pageMaxLine*this.eachLineBytes;

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

  private updateScrollPosition(ratio:number){
    let maxRatio = 1 - (this.pageMaxLine * this.eachLineBytes) / this.fileTotalBytes;
    if (ratio > maxRatio) {
      this.scrollRatio = maxRatio;
    }else{
      this.scrollRatio=ratio;
    }
    this._Scroll.querySelector<HTMLDivElement>('.scroll-bar')!.style.top=(755*this.scrollRatio+15).toString()+'px';

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

  public save(){}
  public destory() {
    if(this.dirty){this.save();}
    this._fileArrayBuffer = null!;
    this._fileReader = null!;
    this._inputFile = null!;
    this._pageElement.remove();
  }
}


/**
 * quickly to throttle even in event
 */
function throttle(this: any, func: any, timeout: number) {
  let timer: number | null = null;
  return (...args: any) => {
    if (timer) return;
    timer = setTimeout(() => {
      func.apply(this, args);
      timer = null;
    }, timeout);
  }
}

function calcBytesAlign(bytes:number,radix:number):number{
  return Math.floor((Math.floor(bytes) + radix - 1) / radix) * radix;
}

