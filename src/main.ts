import { setupToolbar } from '@/components/ToolBar';
import { setupTab } from '@/components/Tab';
import { setupDataViewer } from '@/components/DataViewer';
import { setupSearch } from '@/components/Search';
import { App } from '@/app';
import { WelcomePage } from '@/components/WelcomePage';
import 'default-passive-events';
import { PieceTable } from './modules/DataSource';

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

<input id="select-file" name="select-file" type="file" hidden/>
`;

App.hookRegister('init',()=>{
  console.log("welcome, the more infomation and usages are in github:https://github.com/vowzero/FFhex");
  setupToolbar();
  setupTab();
  setupDataViewer();
  setupSearch();
})

App.init();

// let pt=new PieceTable();
// pt.insert(0,[1,2,5,6]);
// pt.insert(2,[3,4]);
// pt.insert(0,[0]);
// pt.insert(7,[7,8]);
// pt.delete(0,9);

// pt.test();
// for(let i=0;i<9;i++){
//   console.log(pt.index(i));
// }

// pt.slice(3,6).then(x=>console.log(x));

// let a=[];
// let slice=pt.sliceGenerator(3,6);
// (async()=>{
//   for await(const x of slice) a.push(x);
//   console.log(a);
// })();
