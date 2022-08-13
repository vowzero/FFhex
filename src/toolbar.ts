import { app } from "./app";

function openFile() {
  document.getElementById('select-file')!.click();
}

function closeFile() {
  console.log('关闭文件');
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

function inputFileOnClick(event:Event){
  const files:FileList=(event.target as HTMLInputElement).files!;
  if(files.length==0){
    console.log('Error:No files selected');
  }else if(files.length>1){
    console.log('Error:More than one file selected');
  }else{
    console.log('Info:Ok, the file \"'+files[0].name+'\" is selected');
    app.inputFile = files[0];
  }
};

const toolbarClick: any = [openFile, closeFile, templateLib, search, help];

export function setupToolbar(element: HTMLElement) {
  element.querySelectorAll('li').forEach((e: HTMLLIElement, k: number) => e.onclick = toolbarClick[k]);
  document.querySelector('input')!.addEventListener('change',inputFileOnClick);
}
