import { setupToolbar } from '@/components/ToolBar';
import { setupTab } from '@/components/Tab';
import { setupDataViewer } from '@/components/DataViewer';
import { setupSearch } from '@/components/Search';
import { App } from '@/app';
import { WelcomePage } from '@/components/WelcomePage';
import 'default-passive-events';
import '@/assets/css/style.less'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<div class="editor-container">
  <div class="main-area">
    <div class="toolbar"></div>
    <div class="tabs"><ul></ul></div>
    <div class="hex-editor">
      <div class="tab-contents">
        <div class="tab-page" data-index="0">${WelcomePage}</div>
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
  console.log("welcome, the more infomation and usages are in github:https://github.com/vowzero/hexeditor");
  setupToolbar();
  setupTab();
  setupDataViewer();
  setupSearch();
})

App.init();