import { App } from "@/app";
import { FilePage } from "@/components/FilePage";
import { SVG_openFile, SVG_closeFile, SVG_templateLib, SVG_search, SVG_help } from "./Icon";
import { newTabButton, newTabContent,tabDestoryCurrent,activeTab } from "./Tab";
import "../assets/css/ToolBar.less";

const template=`
<ul>
  <li><i>${SVG_openFile}</i>打开文件</li>
  <li><i>${SVG_closeFile}</i>关闭文件</li>
  <li><i>${SVG_templateLib}</i>模板库</li>
  <li><i>${SVG_search}</i>搜索</li>
  <li><i>${SVG_help}</i>帮助</li>
</ul>
`;

function openFile() {
  document.getElementById('select-file')!.click();
}

function closeFile() {
  tabDestoryCurrent();
}

function templateLib() {
  alert("制作中……");
  console.log('模板库');
}

function search() {
  alert("制作中……");
  console.log('搜索');
}

function help() {
  alert("制作中……");
  console.log('帮助');
}

function addFileTab(file:File){
  let app:FilePage=App.openFile(file)!;
  newTabButton(app.fileID,file.name,true);
  newTabContent(app.fileID,app.editorElement);
  activeTab(app.fileID);
}

function inputFileOnClick(event:Event){
  const files:FileList=(event.target as HTMLInputElement).files!;
  if(files.length==0){
    console.log('Error:No files selected');
  }else if(files.length>1){
    console.log('Error:More than one file selected');
  }else{
    console.log('Info:Ok, the file \"'+files[0].name+'\" is selected');
    addFileTab(files[0]);
  }
};

const toolbarClick: any = [openFile, closeFile, templateLib, search, help];

export function setupToolbar() {
  const toolbar=document.querySelector<HTMLElement>('.toolbar')!;
  toolbar.innerHTML=template;
  toolbar.querySelectorAll('li').forEach((e: HTMLLIElement, k: number) => e.onclick = toolbarClick[k]);
  document.querySelector('input[type="file"]')!.addEventListener('change',inputFileOnClick);
}
