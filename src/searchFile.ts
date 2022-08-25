import { FileReadResult } from "@/components/FilePage";
import { boyerMoore } from "@/modules/Boyer-Moore";
import { ByteArray } from "@/utils";

addEventListener("message",(ev)=>{
  if(ev.data.command=='search'){
    readFile(ev.data.file,ev.data.offset,ev.data.length).then(
      (frr:FileReadResult)=>{
        const byteArray = new ByteArray(frr.result as ArrayBuffer);
        const pattern=new ByteArray(ev.data.patternBuffer as ArrayBuffer);
        const strMatchRes = boyerMoore<ByteArray>(byteArray, pattern);
        postMessage({
          type:'searchResult',
          offset:frr.offset,
          results:strMatchRes,
          id:ev.data.id,
        });
      }
    );
  }
})

function readFile(file:Blob,offset: number, length: number): Promise<FileReadResult> {
  return new Promise<FileReadResult>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve({ offset, length, result: fr.result });
    fr.onerror = reject;
    fr.readAsArrayBuffer(file.slice(offset, offset + length));
  });
}

