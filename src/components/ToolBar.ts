import { MenuItemStatus, PopupMenu } from "./PopupMenu";
import { App } from "@/app";
import { EditorPage } from "@/components/EditorPage";
import { SVG_openFile, SVG_closeFile, SVG_templateLib, SVG_search, SVG_help, SVG_saveFile } from "./Icon";
import { newTabButton, newTabContent, tabDestoryCurrent, activeTab } from "./Tab";
import "../assets/css/ToolBar.less";
import { MessageTip } from "./MessageTip";

const template = `
<ul>
  <li><i>${SVG_openFile}</i>打开文件</li>
  <li><i>${SVG_saveFile}</i>保存文件</li>
  <li><i>${SVG_closeFile}</i>关闭文件</li>
  <li><i>${SVG_templateLib}</i>模板库</li>
  <li><i>${SVG_search}</i>搜索</li>
  <li><i>${SVG_help}</i>帮助</li>
  <li class="more"><i>${SVG_help}</i>更多</li>
</ul>
`;

function openFile() {
  document.getElementById("select-file")!.click();
  // TODO: fileHandle support save file
  // const [fileHandle] = (await window.showOpenFilePicker({ multiple: true })) as FileSystemHandle[];
  // console.log(fileHandle);
  // console.log(await fileHandle.getFile());
}

function saveFile(){
  App.currentPage?.save();
}

function closeFile() {
  tabDestoryCurrent();
}

function templateLib() {
  MessageTip.show({ text: "Template matching in future plans" });
}

function search() {
  MessageTip.show({ text: "Search Window in future plans" });
}

function help() {
  MessageTip.show({ text: "Help Window in future plans" });
}

function more() {
  // const moreElement=document.querySelector<HTMLElement>(".toolbar .more")!;
  // const rect=moreElement.getBoundingClientRect();
  // PopupMenu.show([
  //   { key: "Delete", label: "删除", handler: () => 1, status: MenuItemStatus.NORMAL }
  // ],rect.x,rect.y+rect.height);
  // App.currentPage?.insert(0,[0]);
  App.currentPage?.delete(16,16);
  App.currentPage?.update(true);
}

function addFileTab(file: File, filePath?: string) {
  let filePage: EditorPage = App.openFile(file, filePath)!;
  if (filePage) {
    newTabButton(filePage.editorID, file.name, true);
    newTabContent(filePage.editorID, filePage.editorElement);
    activeTab(filePage.editorID);
  }
}

function inputFileOnClick({ target }: Event) {
  const files: FileList = (target as HTMLInputElement).files!;
  addFileTab(files[0], (target as HTMLInputElement).value);
  (target as HTMLInputElement).value = "";
}

const toolbarClick: any = [openFile, saveFile,closeFile, templateLib, search, help, more];

export function setupToolbar() {
  const toolbar = document.querySelector<HTMLElement>(".toolbar")!;
  toolbar.innerHTML = template;
  toolbar.querySelectorAll("li").forEach((e: HTMLLIElement, k: number) => (e.onclick = toolbarClick[k]));
  document.querySelector('input[type="file"]')!.addEventListener("change", inputFileOnClick);
}
