import "../assets/ScrollBar.less"
import { throttle } from "../utils";

interface ScrollTo{
  (type: number, value:number): void;
}

export class ScrollBar {
  static UP: number = 1;
  static DOWN: number = 2;
  static DRAG: number = 3;
  static TO: number = 4;
  private reserveBtnHeight:number;
  private scrollHeight:number;
  private barHeight:number;
  private _container: HTMLElement;
  private _scrollTo: ScrollTo;
  private _btnBar: HTMLElement;
  private _upperTop:number;

  constructor(container: HTMLElement, scrollTo: ScrollTo) {
    const btnUp = document.createElement("div");
    const btnBar = document.createElement("div");
    const btnDown = document.createElement("div");
    this._container = container;
    this._scrollTo = scrollTo;
    this._btnBar=btnBar;
    container.classList.add("virtual-scrollbar");
    btnUp.classList.add("scroll-up");
    btnBar.classList.add("scroll-bar");
    btnDown.classList.add("scroll-down");
    container.append(btnUp,btnBar,btnDown);
    btnUp.addEventListener("click", this.onUp.bind(this));
    btnDown.addEventListener("click", this.onDown.bind(this));
    btnBar.addEventListener("mousedown", this.onMouseDown.bind(this));

    this.reserveBtnHeight=btnUp.getBoundingClientRect().height;
    this.scrollHeight=container.getBoundingClientRect().height;
    this.barHeight=btnBar.getBoundingClientRect().height;
    this._upperTop=this.scrollHeight-this.reserveBtnHeight*2-this.barHeight;
  }

  public updateScrollDisplayRatio(ratio: number) {
    let newTop=this._upperTop*ratio+this.reserveBtnHeight;
    this._btnBar.style.top = `${newTop}px`;
  }

  set ratio(ratio:number){
    this.updateScrollDisplayRatio(ratio);
    this._scrollTo(ScrollBar.DRAG,ratio);
  }

  get ratio():number{
    let scrollTop=parseInt(this._btnBar.style.top);
    return (scrollTop-this.reserveBtnHeight)/this._upperTop;
  }

  private onUp(){
    this._scrollTo(ScrollBar.UP,0);
  }
  private onDown(){
    this._scrollTo(ScrollBar.DOWN,0);
  }
  private onMouseDown(){
    document.onmousemove = throttle((event: MouseEvent) => {
      let mouseTop = event.pageY - this._container.getBoundingClientRect().top-0.5*this.barHeight-this.reserveBtnHeight;
      mouseTop=mouseTop<0?0:mouseTop;
      mouseTop=mouseTop>this._upperTop?this._upperTop:mouseTop;
      let ratio=mouseTop/this._upperTop;
      this._btnBar.style.top = `${mouseTop+this.reserveBtnHeight}px`;
      this._scrollTo(ScrollBar.DRAG,ratio);
    }, 10);
    document.onmouseup = () => document.onmousemove = document.onmouseup = null;
  }
}