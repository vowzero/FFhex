export function generateOffset(totalSize:number,lineSize:number,start:number=0,end:number=null!):Array<number>{
  const offsets:Array<number> = [];
  let i:number;

  if(end==null||end>totalSize)end=totalSize;

  for(i=start;i<end;i+=lineSize){
    offsets.push(i);
  }

  return offsets;
}

export function generateOffsetAddress(totalSize:number,offsets:Array<number>):Array<string>{
  const addrs:Array<string> = [];
  let addr_length:number;
  let i:number,j:number;
  let str_addr:string;
  // if addr>0xffffffff, then addr length should be greater than 8
  addr_length=totalSize.toString(16).length;
  addr_length=addr_length<8?8:addr_length;

  for(i of offsets){
    str_addr=i.toString(16).toUpperCase();
    if(str_addr.length<addr_length){
      for(j=addr_length-str_addr.length;j>0;j--){
        str_addr='0'+str_addr;
      }
    }
    addrs.push(str_addr);
  }
  return addrs;
}