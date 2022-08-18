import { App } from "./app";
import { folded } from "./icon";
import { boyerMoore } from "./StringMatch/Boyer-Moore";
import { ByteArray } from "./utils";

const template=`
<div class="search module-container">
  <div class="module-title">
    <i>${folded}</i>
    搜索
  </div>
  <div>
    <div>
      内容：<input name="search" type="text"/>
      <button type="button">上一个</button>
      <button type="button">下一个</button>
    </div>
    <fieldset>
      二进制:<input type="checkbox" name="type" />
      十六进制:<input type="checkbox" name="type" />
      ASCII:<input type="checkbox" name="type" />
      UTF-8:<input type="checkbox" name="type" />
      UTF-16:<input type="checkbox" name="type" />
      UTF-32:<input type="checkbox" name="type" />
      Int8<input type="checkbox" name="type" />
      UInt8:<input type="checkbox" name="type" />
      Int16:<input type="checkbox" name="type" />
      UInt16:<input type="checkbox" name="type" />
      Int32<input type="checkbox" name="type" />
      UInt32<input type="checkbox" name="type" />
      Int64<input type="checkbox" name="type" />
      UInt64<input type="checkbox" name="type" />
      float16<input type="checkbox" name="type" />
      float32<input type="checkbox" name="type" />
      float64<input type="checkbox" name="type" />
      </fieldset>
  </div>
</div>
`;

interface searchResultItem{
  offset:number;
  length:number;
  type:string;
}

let searchElement: HTMLElement;
let searchResults=[];

function searchNext(){
  let startOffset: number = 0;
  let endOffset: number = 500;
  let byteArray:ByteArray;
  let res:Array<number>;
  // 4a 46 49 46
  App.currentPage.readFile(startOffset,endOffset).then((fr:FileReader)=>{
    byteArray=new ByteArray(fr.result as ArrayBuffer);
    let x=new ArrayBuffer(4);
    let a=new DataView(x);
    let b=new ByteArray(x);
    a.setUint8(0,0x00);
    a.setUint8(1,0x00);
    a.setUint8(2,0x00);
    a.setUint8(3,0x00);
    res=boyerMoore(byteArray,b);
    console.log(b.at(0),byteArray.at(24));
    console.log(res);
  });
}

export function setupSearch(){
  // let a=boyerMoore([1,1,1,1,1],[1,1,1]);
  // let a=boyerMoore([2,2,3,0,1,2,1,2,3,4,1,2,4,3,4,1,2,0,1,2,3,4,1,2,3,4,1,2,4,5],[1,2,3,4,1,2,4]);
  // console.log(a);
  document.querySelector('.minor-sidebar')!.innerHTML=template;
  searchElement=document.querySelector('.search')!;
  searchElement.querySelector('button')!.onclick=searchNext;
}