import { App } from "@/app";
import { FilePage } from "@/components/FilePage";
import { SVG_openFile, SVG_closeFile, SVG_templateLib, SVG_search, SVG_help } from "./Icon";
import { newTabButton, newTabContent, tabDestoryCurrent, activeTab } from "./Tab";
import "../assets/css/ToolBar.less";
import { MessageTip } from "./MessageTip";

const template = `
<ul>
  <li><i>${SVG_openFile}</i>打开文件</li>
  <li><i>${SVG_closeFile}</i>关闭文件</li>
  <li><i>${SVG_templateLib}</i>模板库</li>
  <li><i>${SVG_search}</i>搜索</li>
  <li><i>${SVG_help}</i>帮助</li>
</ul>
`;

async function openFile() {
  document.getElementById("select-file")!.click();
  // TODO: fileHandle support save file
  // const [fileHandle] = (await window.showOpenFilePicker({ multiple: true })) as FileSystemHandle[];
  // console.log(fileHandle);
  // console.log(await fileHandle.getFile());
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

function addFileTab(file: File, filePath?: string) {
  let filePage: FilePage = App.openFile(file, filePath)!;
  if (filePage) {
    newTabButton(filePage.fileID, file.name, true);
    newTabContent(filePage.fileID, filePage.editorElement);
    activeTab(filePage.fileID);
  }
}

function inputFileOnClick({ target }: Event) {
  const files: FileList = (target as HTMLInputElement).files!;
  if (files.length == 0) {
    console.log("Error:No files selected");
  } else if (files.length > 1) {
    console.log("Error:More than one file selected");
  } else {
    addFileTab(files[0], (target as HTMLInputElement).value);
    (target as HTMLInputElement).value = "";
  }
}

const toolbarClick: any = [openFile, closeFile, templateLib, search, help];

export function setupToolbar() {
  const toolbar = document.querySelector<HTMLElement>(".toolbar")!;
  toolbar.innerHTML = template;
  toolbar.querySelectorAll("li").forEach((e: HTMLLIElement, k: number) => (e.onclick = toolbarClick[k]));
  document.querySelector('input[type="file"]')!.addEventListener("change", inputFileOnClick);
}
