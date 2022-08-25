
// class Queue{
  
// }

export class WorkerPool{
  static fns:Map<string,Function> = new Map<string,Function>();

  // private _minPoolSize:number=10;
  // private _maxPoolSize:number=10;
  // private _runningPool:Queue=new Queue();

  static register(obj:Object|string,fn?:Function){
    if(WorkerPool.fns.size==0){
      window.addEventListener("message",(ev)=>{
        const fn=WorkerPool.fns.get(ev.data.fn);
        if(fn!==undefined)fn(...ev.data.params);
      });
    }

    if(typeof obj === "string" && fn!==undefined){
      WorkerPool.fns.set(obj,fn);
    }else if(typeof obj === "object"){
      Reflect.ownKeys(obj).forEach(function(key){
        WorkerPool.fns.set(key as string,Object.getOwnPropertyDescriptor(obj,key) as Function);
      });
    }
  }
  
  constructor(scriptURL:string|URL,options?:object){
    new Worker(scriptURL,options);
  }
}

