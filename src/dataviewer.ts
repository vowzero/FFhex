import { folded } from "./icon";
import { BytesFormat } from "./utils";

const dataViewerList: string[] = ['binary', 'uint8', 'int8', 'uint16', 'int16', 'uint32', 'int32', 'uint64', 'int64', 'float16', 'float32', 'float64', 'ascii', 'utf8', 'utf16', 'utf32'];
const template = `
<div class="data-viewer module-container">
  <div class="module-title">
    <i>${folded}</i>
    数据查看器
    <div class="endian-select">
      <input class="endian-radio" name="dataviewer-endian" type="radio" value="be" checked />
      <label>大端序</label>
      <input class="endian-radio" name="dataviewer-endian" type="radio" value="le" />
      <label>小端序</label>
    </div>
  </div>
  <div class="module-content grid">
    <!--<div class="grid-row">-->
      <div class="">类型</div>
      <div class="">值</div>
      <div class="" data-type="binary">二进制</div>
      <div class="" data-type="v-binary">[Please select Bytes]</div>
      <div class="" data-type="uint8">有符号Byte</div>
      <div class="" data-type="v-uint8">[Please select Bytes]</div>
      <div class="" data-type="int8">无符号Byte</div>
      <div class="" data-type="v-int8">[Please select Bytes]</div>
      <div class="" data-type="uint16">有符号Word</div>
      <div class="" data-type="v-uint16">[Please select Bytes]</div>
      <div class="" data-type="int16">无符号Word</div>
      <div class="" data-type="v-int16">[Please select Bytes]</div>
      <div class="" data-type="uint32">有符号DWord</div>
      <div class="" data-type="v-uint32">[Please select Bytes]</div>
      <div class="" data-type="int32">无符号DWord</div>
      <div class="" data-type="v-int32">[Please select Bytes]</div>
      <div class="" data-type="uint64">有符号QWord</div>
      <div class="" data-type="v-uint64">[Please select Bytes]</div>
      <div class="" data-type="int64">无符号QWord</div>
      <div class="" data-type="v-int64">[Please select Bytes]</div>
      <div class="" data-type="float16">16bit浮点</div>
      <div class="" data-type="v-float16">[Please select Bytes]</div>
      <div class="" data-type="float32">32bit浮点</div>
      <div class="" data-type="v-float32">[Please select Bytes]</div>
      <div class="" data-type="float64">64bit浮点</div>
      <div class="" data-type="v-float64">[Please select Bytes]</div>
      <div class="" data-type="ascii">ASCII</div>
      <div class="" data-type="v-ascii">[Please select Bytes]</div>
      <div class="" data-type="utf8">UTF-8</div>
      <div class="" data-type="v-utf8">[Please select Bytes]</div>
      <div class="" data-type="utf16">UTF-16</div>
      <div class="" data-type="v-utf16">[Please select Bytes]</div>
      <div class="" data-type="utf32">UTF-32</div>
      <div class="" data-type="v-utf32">[Please select Bytes]</div>
    <!--</div>-->
  </div>
</div>
`;

let littleEndian: boolean;
let dataViewerElement: HTMLElement;
let lastOffset: number|null=null;
let lastBuffer:ArrayBuffer|null;

export function updateDataViewer(offset: number, buffer: ArrayBuffer) {
  let bytesFormat: BytesFormat = new BytesFormat(new DataView(buffer));
  bytesFormat.offset = offset;
  bytesFormat.littleEndian = littleEndian;

  const dataViewerContainer: HTMLElement = document.querySelector<HTMLElement>('.data-viewer .module-content')!;
  let valueContainer: HTMLElement;
  for (let type of dataViewerList) {
    valueContainer = dataViewerContainer.querySelector(`[data-type="v-${type}"]`)!;
    try {
      valueContainer.textContent = bytesFormat[type];
    } catch (e) {
      if (e instanceof RangeError) {
        valueContainer.textContent = '[end of file]'
      }
    }
  }
  lastOffset=offset;
  lastBuffer=buffer;
}

export function setupDataViewer() {
  document.querySelector('.sidebar')!.innerHTML += template;
  littleEndian = false;
  dataViewerElement = document.querySelector('.sidebar .data-viewer')!;
  // endian radio onclick listener
  dataViewerElement.querySelectorAll('[name="dataviewer-endian"]').forEach((e) => (e as HTMLInputElement).onclick = () => {
    littleEndian = (e as HTMLInputElement).value == 'be' ? false : true;
    if(lastOffset!==null){
      updateDataViewer(lastOffset, lastBuffer!);
    }
  });

}

