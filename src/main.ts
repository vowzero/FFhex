import './style.css'
import { SVG_openFile,SVG_closeFile,SVG_templateLib,SVG_search,SVG_help, folded, unfolded } from './icon';
import { setupToolbar } from './toolbar';
import { setupTab } from './tab';
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
      <div class="tab-page" data-index="0">welcome</div>
      </div>
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
          <div class="" data-type="binary">二进制</div>
          <div class="" data-type="v-binary">00000000</div>
          <div class="" data-type="uint8">有符号Byte</div>
          <div class="" data-type="v-uint8">-1</div>
          <div class="" data-type="int8">无符号Byte</div>
          <div class="" data-type="v-int8">255</div>
          <div class="" data-type="uint16">有符号Word</div>
          <div class="" data-type="v-uint16">00000000</div>
          <div class="" data-type="int16">无符号Word</div>
          <div class="" data-type="v-int16">00000000</div>
          <div class="" data-type="uint32">有符号DWord</div>
          <div class="" data-type="v-uint32">00000000</div>
          <div class="" data-type="int32">无符号DWord</div>
          <div class="" data-type="v-int32">00000000</div>
          <div class="" data-type="uint64">有符号QWord</div>
          <div class="" data-type="v-uint64">00000000</div>
          <div class="" data-type="int64">无符号QWord</div>
          <div class="" data-type="v-int64">00000000</div>
          <div class="" data-type="float16">16bit浮点</div>
          <div class="" data-type="v-float16">00000000</div>
          <div class="" data-type="float32">32bit浮点</div>
          <div class="" data-type="v-float32">00000000</div>
          <div class="" data-type="float64">64bit浮点</div>
          <div class="" data-type="v-float64">00000000</div>
          <div class="" data-type="ascii">ASCII</div>
          <div class="" data-type="v-ascii">00000000</div>
          <div class="" data-type="utf8">UTF-8</div>
          <div class="" data-type="v-utf8">00000000</div>
          <div class="" data-type="utf16">UTF-16</div>
          <div class="" data-type="v-utf16">00000000</div>
          <div class="" data-type="utf32">UTF-32</div>
          <div class="" data-type="v-utf32">00000000</div>
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
<input id="select-file" name="select-file" type="file" hidden/>
`;


setupToolbar();
setupTab();