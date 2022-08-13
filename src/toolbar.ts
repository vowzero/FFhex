function openFile() {
  console.log('打开文件');
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

const toolbarClick: any = [openFile, closeFile, templateLib, search, help];

export function setupToolbar(element: HTMLElement) {
  element.querySelectorAll('li').forEach((e: HTMLLIElement, k: number) => e.onclick = toolbarClick[k]);
}