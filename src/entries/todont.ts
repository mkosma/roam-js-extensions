import {
  createMobileIcon,
  isControl,
  replaceText,
  runExtension,
} from "../entry-helpers";
import { createObserver } from "roam-client";

runExtension("todont", () => {
  const TODONT_CLASSNAME = "roamjs-todont";
  const css = document.createElement("style");
  css.textContent = `.bp3-button.bp3-small.${TODONT_CLASSNAME} {
    padding: 0;
    min-height: 0;
    min-width: 0;
    top: -1px;
    left: -2px;
    height: 14px;
    border-radius: 4px;
    width: 14px;
    color: #2E2E2E;
    background-color: #EF5151;
    border: #EA666656;
    border-width: 0 2px 2px 0;
}`;
  document.getElementsByTagName("head")[0].appendChild(css);

  const styleArchivedButtons = (node: HTMLElement) => {
    const buttons = node.getElementsByTagName("button");
    Array.from(buttons).forEach((button) => {
      if (
        button.innerText === "ARCHIVED" &&
        button.className.indexOf(TODONT_CLASSNAME) < 0
      ) {
        button.innerText = "x";
        button.className = `${button.className} ${TODONT_CLASSNAME}`;
      }
    });
  };
  styleArchivedButtons(document.body);

  let previousActiveElement: HTMLElement;
  const todontIconButton = createMobileIcon(
    "mobile-todont-icon-button",
    "minus-square"
  );
  todontIconButton.onclick = () => {
    if (previousActiveElement.tagName === "TEXTAREA") {
      previousActiveElement.focus();
      todontCallback();
    }
  };

  todontIconButton.onmousedown = () => {
    previousActiveElement = document.activeElement as HTMLElement;
  };

  createObserver((mutationList: MutationRecord[]) => {
    mutationList.forEach((record) => {
      styleArchivedButtons(record.target as HTMLElement);
    });
    const mobileBackButton = document.getElementById("mobile-back-icon-button");
    if (
      !!mobileBackButton &&
      !document.getElementById("mobile-todont-icon-button")
    ) {
      const mobileBar = document.getElementById("rm-mobile-bar");
      if (mobileBar) {
        mobileBar.insertBefore(todontIconButton, mobileBackButton);
      }
    }
  });

  const todontCallback = () => {
    if (document.activeElement.tagName === "TEXTAREA") {
      const textArea = document.activeElement as HTMLTextAreaElement;
      const value = textArea.value;
      if (value.startsWith("{{[[TODO]]}}")) {
        replaceText({ before: "{{[[TODO]]}}", after: "{{[[ARCHIVED]]}}" });
      } else if (value.startsWith("{{[[DONE]]}}")) {
        replaceText({ before: "{{[[DONE]]}}", after: "{{[[ARCHIVED]]}}" });
      } else if (value.startsWith("{{[[ARCHIVED]]}}")) {
        replaceText({ before: "{{[[ARCHIVED]]}}", after: "", prepend: true });
      } else {
        replaceText({ before: "", prepend: true, after: "{{[[ARCHIVED]]}}" });
      }
    }
  };

  const keydownEventListener = async (e: KeyboardEvent) => {
    if (e.key === "Enter" && e.shiftKey && isControl(e)) {
      todontCallback();
    }
  };

  document.addEventListener("keydown", keydownEventListener);
});
