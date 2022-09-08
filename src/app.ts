import { EditorPage } from "@/components/EditorPage";
import { MessageTip } from "./components/MessageTip";

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
  static pool: EditorPage[] = [];
  static pageCount: number;
  static pageIndex: number = 1;
  static currentPage: EditorPage | null = null;

  private static hooks: Object = {};

  static init() {
    this.hookCall("init");
    // close webpage carefully, but it's too annoying...
    // addEventListener(
    //   "beforeunload",
    //   (e) => {
    //     e.returnValue = false;
    //     e.stopPropagation();
    //     e.preventDefault();
    //     return false;
    //   },
    //   true
    // );
  }

  static openFile(file: File, filePath?: string): EditorPage | null {
    let filePage: EditorPage;
    if (this.isReopenFile(file, filePath)) {
      MessageTip.show({ text: "Reopen file." });
      return null;
    } else {
      filePage = new EditorPage(this.pageIndex, file, filePath);
      this.pool.push(filePage);
      this.pageCount++;
      this.pageIndex++;
      this.hookCall("afterOpenFile", filePage);
      return filePage;
    }
  }

  static closeFile(fileID: number) {
    const index = this.pool.findIndex((file) => file.editorID == fileID)!;
    this.hookCall("beforeCloseFile", this.pool[index]);
    this.pool[index].destory();
    this.pageCount--;
    this.pool.splice(index, 1);
    this.currentPage = null;
  }

  static switchFile(fileID: number) {
    const file = this.pool.filter((file) => file.editorID == fileID);
    this.currentPage = file.length > 0 ? file[0] : null;
    this.hookCall("afterSwitchPage", this.currentPage);
  }

  private static isReopenFile(file: File, filePath?: string): boolean {
    return (
      this.pool.find(
        (page) => page.filePath === filePath && file.size === page.currentFile.size && file.lastModified === page.currentFile.lastModified
      ) !== undefined
    );
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
