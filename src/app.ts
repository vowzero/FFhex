import { FilePage } from "./filepage";

export class App {
  static pool: FilePage[] = [];
  static pageCount: number;
  static pageIndex: number = 1;
  static currentPage: FilePage | null = null;

  private static hooks:Object={
    init:[]
  };
  static switchFile(fileID: number) {
    const file = App.pool.filter(file => file.fileID == fileID);
    App.currentPage = file.length > 0 ? file[0] : null;
  }
  
  static openFile(file: File): FilePage | null {
    let filePage: FilePage;
    if (App.isReopenFile(file)) {
      console.error('Reopen file');
      return null;
    } else {
      filePage = new FilePage(App.pageIndex, file);
      App.pool.push(filePage);
      this.pageCount++;
      this.pageIndex++;
      this.currentPage = filePage;
      return filePage;
    }
  }

  static closeFile(fileID: number) {
    App.pool.filter(file => file.fileID == fileID)[0].destory();
    this.pageCount--;
    this.currentPage = null;
  }

  private static isReopenFile(file: File): boolean {
    return false || file === null;
  }

  static hookRegister(hookName:string,hookFn:any){
    if(App.hooks.hasOwnProperty(hookName)){
      let a=Object.getOwnPropertyDescriptor(App.hooks,hookName);
      console.log(a);
    }
  }
}




