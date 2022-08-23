import { throttle } from "../utils";

export class VirtualList {
  private _box: HTMLElement;
  private _container: HTMLElement;
  private _realHeight!: number;
  private _childrenNum!: number;
  private _childHeight!: number;
  private _updateFn: Function;

  constructor(container: HTMLElement, updateFn: Function) {
    this._box = document.createElement('div');
    this._container = container;
    this._updateFn = updateFn;
    this._container.parentNode?.replaceChild(this._box, this._container);
    this._box.appendChild(this._container);
    this._box.classList.add('virtual-list-box');
    this._container.classList.add('virtual-list-container');
    this._box.addEventListener('scroll', this.onScroll.bind(this));
  }

  private onScroll() {
    const offsetStart = Math.floor(this._box.scrollTop / this._childHeight);
    const top = offsetStart * this._childHeight;
    const bottom = this._realHeight - top;
    this._container.style.paddingTop = top + 'px';
    this._container.style.paddingBottom = bottom + 'px';
    this._updateFn(offsetStart);
  }

  public updateRealHeight() {
    this._realHeight = this._childrenNum * this._childHeight;
    this.onScroll();
  }
  set childrenNum(num: number) {
    this._childrenNum = num;
    this.updateRealHeight();
  }

  set childHeight(height: number) {
    this._childHeight = height;
    this.updateRealHeight();
  }

  set displayHeight(height: number) {
    this._box.style.height = height + "px";
  }
}