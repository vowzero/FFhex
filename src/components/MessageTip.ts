import "@/assets/css/MessageTip.less";

let messageBox: HTMLElement | null = null;

export interface MessageOption {
  text: string;
  timeout?: number;
}

const itemAdjust = () => {
  const children=messageBox!.children;
  for(let i=0;i<children.length;i++) {
    (children[i] as HTMLElement).style.top=`${56*i+16}px`;
  }
};

const createMessage = (message: MessageOption) => {
  const item = document.createElement("div");
  item.textContent = message.text;
  item.style.top=`${messageBox!.children.length*56+16}px`;
  item.classList.add("message-item", "hidden");
  messageBox!.appendChild(item);
  // start countdown timeout
  item.addEventListener(
    "transitionend",
    () => {
      setTimeout(() => {
        item.classList.add("hidden");
        item.addEventListener("transitionend", () => {item.remove();itemAdjust();},{once: true});
      }, message.timeout || 3000);
    },
    { once: true }
  );
  // start show
  setTimeout(() => item.classList.remove("hidden"), 0);
};

export class MessageTip {
  public static show(message: MessageOption) {
    if (!messageBox) {
      messageBox = document.createElement("div");
      messageBox.classList.add("message-tip-box");
      // messageBox.classList.add("hidden");
      document.body.appendChild(messageBox);
    }

    createMessage(message);
  }
}
