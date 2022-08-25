
export interface BoyerMooreBytes {
  length: number;
  at:Function;
}

// Boyer Moore String Matching Algorithm (Bytes Version)
export function boyerMoore<T extends BoyerMooreBytes>(_src: T, pattern: T): Array<number> {
  let bc: Array<number> = makeBadCharacter(pattern);
  let gs: Array<number> = makeGoodSuffix(pattern);
  let i:number = 0,j:number;
  let result:Array<number> = new Array<number>();
  while (i <= _src.length-pattern.length){
    j = pattern.length-1;
    while (j >= 0 && _src.at(i+j) == pattern.at(j))
      --j;
    if (j < 0){ // find
      result.push(i);
      ++i;
    }else{
      let a=bc[_src.at(i+j)!];
      i += Math.max(a-pattern.length+1+j, gs[j]);
    }
  }
  return result;
}

/**
  bad character rule
  each unique char in pattern maps the pos counting from the last
*/
function makeBadCharacter<T extends BoyerMooreBytes>(pattern: T): Array<number> {
  let badTable: Array<number> = new Array<number>(256).fill(pattern.length);
  for (let i = 0; i < pattern.length; i++)
    badTable[pattern.at(i)!] = pattern.length-1-i;
  return badTable;
}

/**
 * good suffix rule
 */
function makeGoodSuffix<T extends BoyerMooreBytes>(pattern: T): Array<number> {
  let goodTable: Array<number> = new Array<number>(pattern.length).fill(pattern.length);
  let suffix: Array<number> = new Array<number>(pattern.length).fill(0);
  let i:number,j:number;
  let len:number;

  for(let x=0;x<pattern.length;x++) {
    len=0;
    for(i=x,j=pattern.length-1;i>=0 && pattern.at(i)==pattern.at(j);--i,--j)++len;
    suffix[x]=len;
  }

  for(i=pattern.length-1;i>=0;i--){
    if (suffix[i]==i+1){
      for(let j=0;j<pattern.length-1-i;++j){
        if(goodTable[j]==pattern.length){
          goodTable[j]=pattern.length-1-i;
        }
      }
    }
  }
  for(i=0;i<pattern.length-1;++i){
    goodTable[pattern.length-1-suffix[i]]=pattern.length-1-i;
  }

  return goodTable
}
