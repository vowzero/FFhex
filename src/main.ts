import './style.css'
import { App } from "./app";
import { SVG_openFile,SVG_closeFile,SVG_templateLib,SVG_search,SVG_help, folded, unfolded } from './icon';
import {setupFileSelector} from './io'
import { setupToolbar } from './toolbar';
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
    <div class="tabs">
      <ul>
        <li class="active"><a href="javascript:;">Tab1</a><a href="javascript:;">${SVG_closeFile}</a></li>
        <li><a href="javascript:;">Tab2</a></li>
        <li><a href="javascript:;">Tab3</a></li>
        <li><a href="javascript:;">Tab4</a></li>
      </ul>
    </div>
    <div class="hex-editor"></div>
    <div class="hex-template"></div>
  </div>
  <div class="sidebar">
    <div class="data-viewer module-container">
      <div class="module-title">
        <i>${folded}</i>
        数据查看器
      </div>
      <div class="module-content grid">
        <!--<div class="grid-row">-->
          <div class="">类型</div>
          <div class="">值</div>
          <div class="">二进制</div>
          <div class="">00000000</div>
          <div class="">有符号Byte</div>
          <div class="">-1</div>
          <div class="">无符号Byte</div>
          <div class="">255</div>
          <div class="">有符号Word</div>
          <div class="">00000000</div>
          <div class="">无符号Word</div>
          <div class="">00000000</div>
          <div class="">有符号DWord</div>
          <div class="">00000000</div>
          <div class="">无符号DWord</div>
          <div class="">00000000</div>
          <div class="">有符号QWord</div>
          <div class="">00000000</div>
          <div class="">无符号QWord</div>
          <div class="">00000000</div>
          <div class="">16bit浮点</div>
          <div class="">00000000</div>
          <div class="">32bit浮点</div>
          <div class="">00000000</div>
          <div class="">64bit浮点</div>
          <div class="">00000000</div>
        <!--</div>-->
      </div>
    </div>
  </div>
</div>
<div class="context-menu" style="display:none">
  <ul>
    <li>menu item</li>
    <li>123</li>
    <li>123</li>
    <li>123</li>
  </ul>
</div>
<input type="file" hidden/>

`;

App.getInstance();

setupFileSelector(document.querySelector<HTMLInputElement>('input')!)
setupToolbar(document.querySelector<HTMLElement>('.toolbar')!);