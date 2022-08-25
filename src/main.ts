import './assets/css/style.less'
import { SVG_openFile,SVG_closeFile,SVG_templateLib,SVG_search,SVG_help } from './icon';
import { setupToolbar } from './toolbar';
import { setupTab } from './tab';
import { setupDataViewer } from './dataviewer';
import { setupSearch } from './search';
import { App } from './app';
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<div class="editor-container">
  <div class="main-area">
    <div class="toolbar">
      <ul>
        <li><i>${SVG_openFile}</i>打开文件</li>
        <li><i>${SVG_closeFile}</i>关闭文件</li>
        <li><i>${SVG_templateLib}</i>模板库</li>
        <li><i>${SVG_search}</i>搜索</li>
        <li><i>${SVG_help}</i>帮助</li>
      </ul>
    </div>
    <div class="tabs"><ul></ul></div>
    <div class="hex-editor">
      <div class="tab-contents">
        <div class="tab-page" data-index="0">welcome</div>
      </div>
      <div class="minor-sidebar">123</div>
    </div>
    <div class="hex-template"></div>
  </div>
  <div class="sidebar"></div>
</div>
<div class="context-menu" style="display:none">
  <ul>
    <li>menu item</li>
    <li>123</li>
    <li>123</li>
    <li>123</li>
  </ul>
</div>
<input id="select-file" name="select-file" type="file" hidden/>
`;

App.hookRegister('init',()=>{
  console.log("====debug:init====");
  setupToolbar();
  setupTab();
  setupDataViewer();
  setupSearch();
})

App.init();