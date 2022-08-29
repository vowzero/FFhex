interface WorkerPoolOptions {
  corePoolSize?: number;
  maxPoolSize?: number;
}

export default class WorkerPool {
  private static fns: Map<string, Function> = new Map<string, Function>();

  private poolSize: number = 0;
  private corePoolSize: number = 1;
  private maxPoolSize: number = 3;
  private keepAliveTime: number = 60 * 1000;
  private taskQueue: Array<any> = [];
  private idlePool: Array<Worker> = [];
  private runningPool: Array<Worker> = [];
  private scriptURL: string | URL;

  static register(obj: Object | string, fn?: Function) {
    if (WorkerPool.fns.size == 0) {
      addEventListener("message", (event) => {
        const fn = WorkerPool.fns.get(event.data.fn);
        if (fn !== undefined) fn(...event.data.params);
      });
    }

    if (typeof obj === "string" && fn !== undefined) {
      WorkerPool.fns.set(obj, fn);
    } else if (typeof obj === "object") {
      Reflect.ownKeys(obj).forEach(function (key) {
        WorkerPool.fns.set(key as string, Object.getOwnPropertyDescriptor(obj, key) as Function);
      });
    }
  }

  static resolve(data: any) {
    postMessage({ result: true, return: data });
  }

  static reject(data: any) {
    postMessage({ result: true, return: data });
  }

  constructor(scriptURL: string | URL, options?: WorkerPoolOptions) {
    if (options) {
      options.corePoolSize && (this.corePoolSize = options.corePoolSize);
      options.maxPoolSize && (this.maxPoolSize = options.maxPoolSize);
    }
    this.scriptURL = scriptURL;
  }

  public execute(fn: string, message: any): Promise<any> {
    if (this.poolSize < this.maxPoolSize) {
      this.idlePool.push(new Worker(this.scriptURL, { type: "module" }));
      this.poolSize++;
    }
    const promise = new Promise((resolve, reject) => {
      this.taskQueue.push({ fn, params: message, resolve, reject });
      this.nextTask();
    });

    return promise;
  }

  private nextTask() {
    if (this.taskQueue.length === 0) return;
    else if (this.idlePool.length === 0 && this.poolSize < this.maxPoolSize) {
      this.idlePool.push(new Worker(this.scriptURL, { type: "module" }));
      this.poolSize++;
    }

    let worker = this.idlePool.shift();
    if(!worker)return;
    this.runningPool.push(worker);

    const task = this.taskQueue.shift();
    worker.onmessage = (event: MessageEvent) => {
      if (event.data.result) {
        task.resolve(event.data.return);
      } else {
        task.reject(event.data.return);
      }
      const workerIndex = this.runningPool.findIndex((x) => x === worker);
      this.runningPool.splice(workerIndex, 1);

      if (this.poolSize > this.corePoolSize) {
        if (this.keepAliveTime >= 0) {
          this.idlePool.push(worker!);
          setTimeout(() => {
            const index = this.idlePool.findIndex((x) => x === worker);
            if (index >= 0 && this.poolSize > this.corePoolSize) {
              this.idlePool.splice(index, 1);
              worker!.terminate();
              this.poolSize--;
            }
          }, this.keepAliveTime);
        }
      } else {
        this.idlePool.push(worker!);
      }
      setTimeout(() => this.nextTask(), 0);
    };

    worker.postMessage({ fn: task.fn, params: task.params });
  }
}
