import "./style.css";

type NotificationType = "info" | "success" | "error";
type ButtonId =
  | "copy"
  | "replace"
  | "replace-and-adjust-size"
  | "place-over"
  | "place-under"
  | "clear-cache";

const searchParams = new URLSearchParams(window.location.search);
document.body.dataset.theme = searchParams.get("theme") ?? "light";

let isShapeSelected = false;

const buttons: Partial<Record<ButtonId, HTMLButtonElement>> = {
  copy: document.getElementById("copy")! as HTMLButtonElement,
  replace: document.getElementById("replace")! as HTMLButtonElement,
  "replace-and-adjust-size": document.getElementById(
    "replace-and-adjust-size"
  )! as HTMLButtonElement,
  "place-over": document.getElementById("place-over")! as HTMLButtonElement,
  "place-under": document.getElementById("place-under")! as HTMLButtonElement,
  "clear-cache": document.getElementById("clear-cache")! as HTMLButtonElement,
};

const toggleLoadingSpinner = (show: boolean) => {
  const spinner = document.getElementById("loading-spinner");
  const instructionText = document.getElementById("instruction-text");
  const imagePreview = document.getElementById(
    "image-preview"
  ) as HTMLImageElement;
  const layerName = document.getElementById("layer-name");

  if (spinner) {
    spinner.classList.toggle("hidden", !show);
  }
  if (instructionText) {
    instructionText.classList.add("hidden");
  }
  if (imagePreview) {
    imagePreview.src = "";
  }
  if (layerName) {
    layerName.textContent = "";
  }
};

const addClickHandler = (id: ButtonId, handler: () => void) => {
  if (buttons[id]) {
    buttons[id]!.onclick = handler;
  }
};

const sendMessage = (type: string) => {
  parent.postMessage({ type }, "*");
};

const NOTIFICATION_DISPLAY_TIME = 3000;
let currentNotification: HTMLElement | null = null;

const showNotification = (message: string, type: NotificationType = "info") => {
  const container = document.getElementById("notification-container");
  if (!container) return;

  if (currentNotification) {
    currentNotification.remove();
  }

  const notification = document.createElement("div");
  notification.className = `notification notification-${type}`;
  notification.textContent = message;

  container.appendChild(notification);
  currentNotification = notification;

  notification.offsetHeight;
  notification.classList.add("show");

  setTimeout(() => {
    notification.classList.remove("show");
    notification.classList.add("hide");

    notification.addEventListener(
      "transitionend",
      () => {
        if (container.contains(notification)) {
          container.removeChild(notification);
        }
        if (currentNotification === notification) {
          currentNotification = null;
        }
      },
      { once: true }
    );
  }, NOTIFICATION_DISPLAY_TIME);
};

const initializeButtons = () => {
  const updateCopyButtonState = () => {
    // if (buttons.copy) {
    //   buttons.copy.disabled = !isShapeSelected;
    // }
  };
  addClickHandler("copy", () => {
    if (isShapeSelected) {
      toggleLoadingSpinner(true);
      sendMessage("copy");
    } else {
      showNotification("Please select one shape to copy", "info");
    }
  });
  updateCopyButtonState();
  addClickHandler("replace", () => sendMessage("replace"));
  addClickHandler("replace-and-adjust-size", () =>
    sendMessage("replaceAndAdjustSize")
  );
  addClickHandler("place-over", () => sendMessage("placeOver"));
  addClickHandler("place-under", () => sendMessage("placeUnder"));
  addClickHandler("clear-cache", () => {
    sendMessage("clearCache");

    const instructionText = document.getElementById("instruction-text");
    const layerName = document.getElementById("layer-name");
    const imagePreview = document.getElementById(
      "image-preview"
    ) as HTMLImageElement;

    if (instructionText) {
      instructionText.classList.remove("hidden");
    }
    // if (instructionText) {
    //   instructionText!.textContent = 'Click "COPY SHAPE" to start';
    // }
    if (layerName) {
      layerName.textContent = "";
    }
    if (imagePreview) {
      imagePreview.src = "";
    }
  });
};

// const initializeKeyboardShortcuts = () => {
//   window.addEventListener("keydown", (event) => {
//     // Check for Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)
//     if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "r") {
//       event.preventDefault(); // Prevent browser refresh
//       sendMessage("replace");
//     }
//   });
// };

async function resizeImage(
  imageData: Uint8Array,
  quality: number,
  imageType: string = "image/png"
): Promise<Blob> {
  const image = await createImageBitmap(
    new Blob([imageData], { type: imageType })
  );
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0);
  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob!), imageType, quality)
  );
}

const initializeMessageListener = () => {
  window.addEventListener("message", async (event) => {
    if (event.data.type === "notification") {
      showNotification(event.data.content, event.data.state);
    }
    if (event.data.type === "updateCopiedShapeImageAndName") {
      toggleLoadingSpinner(false);
      const layerName = document.getElementById("layer-name");
      if (layerName) {
        layerName.textContent = event.data.name || "No shape copied";
      }
      if (event.data.image) {
        const resizedBlob = await resizeImage(event.data.image, 0.2);
        const imagePreview = document.getElementById(
          "image-preview"
        ) as HTMLImageElement;
        if (imagePreview) {
          imagePreview.src = URL.createObjectURL(resizedBlob);
        }
      }
    }
    if (event.data.type === "theme") {
      document.body.dataset.theme = event.data.content;
    }
    if (event.data.type === "selection") {
      if (event.data.shapes && event.data.shapes.length === 1) {
        isShapeSelected = true;
      } else if (event.data.shapes && event.data.shapes.length > 1) {
        isShapeSelected = false;
      } else {
        isShapeSelected = false;
      }

      // if (buttons.copy) {
      //   buttons.copy.disabled = !isShapeSelected;
      // }
    }
  });
};

const initializeApp = () => {
  initializeButtons();
  initializeMessageListener();
  //initializeKeyboardShortcuts();
};

initializeApp();
