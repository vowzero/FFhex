import { App } from "@/app";
import { SVG_closeFile } from "@/components/Icon";
import "@/assets/css/Tab.less";

let tabsElement: HTMLUListElement;
let tabsContent: HTMLDivElement;
let tabIDs: number[];
let activeIndex: number;

function tabDestory(index: number) {
  tabsElement.querySelector(`[data-index="${index}"]`)?.remove();
  tabsContent.querySelector(`[data-index="${index}"]`)?.remove();
  tabIDs.splice(
    tabIDs.findIndex((e) => e === index),
    1
  );
  activeTab(tabIDs[tabIDs.length - 1]);
  App.closeFile(index);
}

function tabOnClick(event: MouseEvent) {
  let index: number = parseInt((event.target as HTMLLIElement).dataset["index"]!);
  if (activeIndex !== index) activeTab(index);
}

function tabCloseOnClick(event: MouseEvent) {
  // find tab index
  let aLi: HTMLLIElement = event
    .composedPath()
    .find((e: EventTarget) => (e as HTMLElement).tagName == "LI") as HTMLLIElement;
  let index: number = parseInt(aLi.dataset["index"]!);

  // remove tabTitle and tabContent
  tabDestory(index);

  // prevent switch to current tab
  event.stopPropagation();
}

function onKeyDown(event: KeyboardEvent): boolean {
  // alt is equal to ctrl in most cases
  if (!(event.ctrlKey&&event.altKey)&&(event.ctrlKey||event.altKey)) {
    switch (event.key) {
      case "o":
        event.preventDefault();
        document.getElementById("select-file")!.click();
        return false;
      case "w":
        event.preventDefault();
        tabDestoryCurrent();
        return false;
    }
  }
  return true;
}

export function tabDestoryCurrent() {
  if (activeIndex === 0) return;
  tabDestory(activeIndex);
}

export function newTabButton(index: number, title: string, closeButton: boolean = true) {
  let newLi: HTMLLIElement = document.createElement("li");
  newLi.dataset["index"] = index.toString();
  newLi.innerHTML = `${title}`;
  if (closeButton) {
    let btn: HTMLAnchorElement = document.createElement("a");
    btn.innerHTML = `${SVG_closeFile}`;
    btn.onclick = tabCloseOnClick;
    newLi.appendChild(btn);
  }
  newLi.onclick = tabOnClick;
  tabsElement.appendChild(newLi);
  tabIDs.push(index);
}

export function newTabContent(index: number, element: HTMLElement) {
  tabsContent.appendChild(element);
  element.classList.add("tab-page");
  element.dataset["index"] = index.toString();
}

export function activeTab(index: number) {
  activeIndex = index;
  tabsElement.querySelectorAll(`.active`).forEach((e: Element) => e.classList.remove("active"));
  tabsElement.querySelector(`[data-index="${index}"]`)?.classList.add("active");
  tabsContent.querySelectorAll(`.active`).forEach((e: Element) => e.classList.remove("active"));
  tabsContent.querySelector(`[data-index="${index}"]`)?.classList.add("active");
  App.switchFile(index);
}

export function setupTab() {
  tabsElement = document.querySelector(".tabs ul")!;
  tabsContent = document.querySelector(".tab-contents")!;
  activeIndex = 0;
  tabIDs = [];
  newTabButton(0, "Home", false);
  activeTab(0);
  document.addEventListener("keydown", onKeyDown);
}
