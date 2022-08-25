import "../assets/css/ScrollBar.less";
import { throttle } from "../utils";

export interface ScrollTo {
  (type: number, ratio: number, updateRatio?: Function): void;
}

export class ScrollBar {
  static UP: number = 1;
  static DOWN: number = 2;
  static DRAG: number = 3;
  static TO: number = 4;
  private reserveBtnHeight: number;
  private scrollHeight!: number;
  private barHeight!: number;
  private _container: HTMLElement;
  private _scrollTo: ScrollTo;
  private _btnBar: HTMLElement;
  private _upperTop!: number;
  private _mainContainer: HTMLElement;

  constructor(
    box: HTMLElement,
    ScrollContainer: HTMLElement,
    scrollTo: ScrollTo
  ) {
    const btnUp = document.createElement("div");
    const btnBar = document.createElement("div");
    const btnDown = document.createElement("div");
    this._mainContainer = box;
    this._container = ScrollContainer;
    this._scrollTo = scrollTo;
    this._btnBar = btnBar;
    box.classList.add("virtual-scrollbar-box");
    ScrollContainer.classList.add("virtual-scrollbar");
    btnUp.classList.add("scroll-up");
    btnBar.classList.add("scroll-bar");
    btnDown.classList.add("scroll-down");
    ScrollContainer.append(btnUp, btnBar, btnDown);
    btnUp.addEventListener("click", this.onUp.bind(this));
    btnDown.addEventListener("click", this.onDown.bind(this));
    btnBar.addEventListener("mousedown", this.onMouseDown.bind(this));
    box.addEventListener("wheel", this.onWheel.bind(this));
    this.reserveBtnHeight = btnUp.getBoundingClientRect().height;
    this.adjust();
    new ResizeObserver(this.adjust.bind(this)).observe(box);
  }

  private onWheel = (event: WheelEvent) => {
    this._triggerEvent(event.deltaY > 0 ? ScrollBar.DOWN : ScrollBar.UP);
  };

  public updateScrollDisplayRatio(ratio: number) {
    if(ratio<0)ratio=0;
    if(ratio>1)ratio=1;
    let newTop = this._upperTop * ratio + this.reserveBtnHeight;
    this._btnBar.style.top = `${newTop}px`;
  }

  private adjust() {
    this.scrollHeight = this._mainContainer.getBoundingClientRect().height;
    this.barHeight = this._btnBar.getBoundingClientRect().height;
    this._upperTop =
      this.scrollHeight - this.reserveBtnHeight * 2 - this.barHeight;
  }

  private onMouseDown() {
    document.onmousemove = throttle((event: MouseEvent) => {
      let mouseTop =
        event.pageY -
        this._container.getBoundingClientRect().top -
        0.5 * this.barHeight -
        this.reserveBtnHeight;
      mouseTop = mouseTop < 0 ? 0 : mouseTop;
      mouseTop = mouseTop > this._upperTop ? this._upperTop : mouseTop;
      let ratio = mouseTop / this._upperTop;
      this._btnBar.style.top = `${mouseTop + this.reserveBtnHeight}px`;
      this._scrollTo(
        ScrollBar.DRAG,
        ratio,
        this.updateScrollDisplayRatio.bind(this)
      );
    }, 10);
    document.onmouseup = () =>
      (document.onmousemove = document.onmouseup = null);
  }

  set ratio(ratio: number) {
    this.updateScrollDisplayRatio(ratio);
    this._scrollTo(ScrollBar.DRAG, ratio, this.updateScrollDisplayRatio);
  }

  get ratio(): number {
    let scrollTop = parseInt(this._btnBar.style.top);
    if (isNaN(scrollTop)) scrollTop = 0;
    return (scrollTop - this.reserveBtnHeight) / this._upperTop;
  }

  private onUp() {
    this._triggerEvent(ScrollBar.UP);
  }

  private onDown() {
    this._triggerEvent(ScrollBar.DOWN);
  }

  private _triggerEvent(type: number) {
    this._scrollTo(type, this.ratio, this.updateScrollDisplayRatio.bind(this));
  }
}
