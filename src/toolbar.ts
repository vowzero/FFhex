import { App } from "./app";
import { FilePage } from "./filepage";
import { newTabButton, newTabContent,tabDestoryCurrent,activeTab } from "./tab";

function openFile() {
  document.getElementById('select-file')!.click();
}

function closeFile() {
  tabDestoryCurrent();
}

function templateLib() {
  console.log('模板库');
}

function search() {
  console.log('搜索');
}

function help() {
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
  document.querySelector<HTMLElement>('.toolbar')!.querySelectorAll('li').forEach((e: HTMLLIElement, k: number) => e.onclick = toolbarClick[k]);
  document.querySelector('input')!.addEventListener('change',inputFileOnClick);
}
