import { FilePage } from "@/components/FilePage";

export enum ByteType {
  binary,
  hex,
  uint8,
  uint16,
  uint32,
  uint64,
  int8,
  int16,
  int32,
  int64,
  float16,
  float32,
  float64,
  ascii,
  utf8,
  utf16,
  utf32,
}

export class App {
  static pool: FilePage[] = [];
  static pageCount: number;
  static pageIndex: number = 1;
  static currentPage: FilePage | null = null;

  private static hooks: Object = {};

  static init() {
    this.hookCall("init");

    // close webpage carefully, but it's too annoying...
    addEventListener(
      "beforeunload",
      (e) => {
        e.returnValue = false;
        e.stopPropagation();
        e.preventDefault();
        return false;
      },
      true
    );
  }

  static openFile(file: File): FilePage | null {
    let filePage: FilePage;
    if (this.isReopenFile(file)) {
      console.error("Reopen file");
      return null;
    } else {
      filePage = new FilePage(this.pageIndex, file);
      this.pool.push(filePage);
      this.pageCount++;
      this.pageIndex++;
      this.hookCall("afterOpenFile", filePage);
      return filePage;
    }
  }

  static closeFile(fileID: number) {
    const filePage: FilePage = this.pool.find((file) => file.fileID == fileID)!;
    this.hookCall("beforeCloseFile", filePage);
    filePage.destory();
    this.pageCount--;
    this.currentPage = null;
  }

  static switchFile(fileID: number) {
    const file = this.pool.filter((file) => file.fileID == fileID);
    this.currentPage = file.length > 0 ? file[0] : null;
    this.hookCall("afterSwitchPage", this.currentPage);
  }

  private static isReopenFile(file: File): boolean {
    return this.pool.filter((page) => page.currentFile === file).length > 0;
  }

  static hookRegister(hookName: string, hookFn: any) {
    let hooks_array: Array<Function>;
    if (!this.hooks.hasOwnProperty(hookName)) {
      Object.defineProperty(this.hooks, hookName, { value: new Array<Function>() });
    }
    hooks_array = Object.getOwnPropertyDescriptor(this.hooks, hookName)?.value;
    hooks_array.push(hookFn);
  }

  static hookCall(hookName: string, ...args: any[]) {
    let hooks_array: Array<Function>;
    if (this.hooks.hasOwnProperty(hookName)) {
      hooks_array = Object.getOwnPropertyDescriptor(this.hooks, hookName)?.value;
      hooks_array.forEach((fn) => fn(...args));
    }
  }
}
