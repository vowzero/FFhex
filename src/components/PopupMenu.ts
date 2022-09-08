import "@/assets/css/PopupMenu.less";

export enum MenuItemStatus {
  NORMAL,
  INVISIBLE,
  DISABLED,
}
interface MenuItemStatusFn {
  (): MenuItemStatus;
}

export interface MenuItem {
  key: string;
  label: string;
  handler: Function;
  status?: MenuItemStatus | MenuItemStatusFn;
  shortCut?: string;
  children?: MenuItem[];
}

let menuElement: HTMLElement | null = null;

const createMenuList = (menuList: MenuItem[]) => {
  const ul = document.createElement("ul");
  let itemElement, label, shortcut;
  for (let item of menuList) {
    itemElement = document.createElement("li");
    let status;
    if (!item.status) status = MenuItemStatus.NORMAL;
    else if (item.status instanceof Function) status = item.status();
    else status = item.status;

    if (status === MenuItemStatus.INVISIBLE) continue;
    else if (status === MenuItemStatus.DISABLED) itemElement.classList.add("disabled");
    if (!item.children) {
      label = document.createElement("span");
      shortcut = document.createElement("span");
      label.textContent = item.label;
      if (item.shortCut) shortcut.textContent = item.shortCut;
      itemElement.dataset["key"] = item.key;
      itemElement.onclick = (_e) => {
        item.handler();
        menuElement!.classList.add("hidden");
      };
      itemElement.append(label, shortcut);
      ul.appendChild(itemElement);
    }
  }
  return ul;
};

export class PopupMenu {
  public static show(menuList: MenuItem[], x: number, y: number) {
    if (!menuElement) {
      menuElement = document.createElement("div");
      menuElement.classList.add("popup-menu");
      menuElement.classList.add("hidden");
      document.body.appendChild(menuElement);
    }

    menuElement.innerHTML = "";
    const ul = createMenuList(menuList);
    if (ul.children.length > 0) {
      menuElement.append(ul);

      // ensure the menu is in window
      const rect = ul.getBoundingClientRect();
      if (rect.width + x > window.innerWidth) {
        x = window.innerWidth - rect.width - 20;
      }
      if (rect.height + y > window.innerHeight) {
        y = window.innerHeight - rect.height - 20;
      }

      menuElement.style.left = `${x}px`;
      menuElement.style.top = `${y}px`;
      menuElement.classList.remove("hidden");

      document.addEventListener(
        "click",
        () => {
          menuElement!.classList.add("hidden");
        },
        { once: true, capture: true }
      );
    }
  }
}
