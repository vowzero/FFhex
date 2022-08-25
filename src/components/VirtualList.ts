import { ScrollBar,ScrollTo } from "@/components/ScrollBar";

export class VirtualList {
  private _listBox: HTMLElement;

  constructor(container: HTMLElement, updateFn: ScrollTo) {
    const scroll = document.createElement('div');
    this._listBox = document.createElement('div');

    container.parentNode?.replaceChild(this._listBox, container);
    container.classList.add('virtual-list-container');

    this._listBox.append(container,scroll);
    this._listBox.classList.add('virtual-list-box');


    new ScrollBar(this._listBox,scroll,updateFn);
  }

  set displayHeight(height: number) {
    this._listBox.style.height = height + "px";
  }
}