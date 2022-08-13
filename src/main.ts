import './style.css'
import { App } from "./app";
import { setupCounter } from './counter'
import {setupFileSelector} from './io'
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <input type="file"/>
    <div class="toolbar">
      <ul>
        <li>打开文件</li>
        <li>关闭文件</li>
        <li>模板库</li>
        <li>搜索</li>
        <li>帮助</li>
      </ul>
    </div>
    <div class="main-area">
      <div class="tabs">
        <a href="javascript:;">Tab1</a>
        <a href="javascript:;">Tab2</a>
        <a href="javascript:;">Tab3</a>
      </div>
      <div class="hex-editor"></div>
      <div class="hex-template"></div>
    </div>
    <div class="sidebar">
      <div class="data-viewer"></div>
    </div>
    </div>
    <div class="context-menu">
      <ul>
        <li>menu item</li>
        <li>123</li>
        <li>123</li>
        <li>123</li>
      </ul>
    </div>
  </div>
`

App.getInstance();

setupFileSelector(document.querySelector<HTMLInputElement>('input')!)
