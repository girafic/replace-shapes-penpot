import { Export } from "@penpot/plugin-types";
penpot.ui.open("Replace Shapes", `?theme=${penpot.theme}`, {
  width: 320,
  height: 470,
});

penpot.ui.onMessage(async (msg: any) => {
  const copiedShape = penpot.selection;
  penpot.ui.sendMessage({
    type: "selectionUpdate",
    shapes: copiedShape,
  });
  if (msg.type === "copy") {
    const copiedShape = penpot.selection;
    if (copiedShape.length === 1) {
      penpot.root?.setPluginData("copiedShape", JSON.stringify(copiedShape));
      const exportConfig: Export = {
        type: "png",
        scale: 0.5,
      };
      penpot.ui.sendMessage({
        type: "notification",
        content: "💾 Saved in cache",
        state: "success",
      });
      try {
        const imageData = await copiedShape[0].export(exportConfig);
        penpot.ui.sendMessage({
          type: "updateCopiedShapeImageAndName",
          image: imageData,
          name: copiedShape[0].name || "Unnamed Shape",
        });
      } catch (error) {
        console.error(`Error exporting PNG ${copiedShape[0].id}:`, error);
      }
    } else {
      penpot.ui.sendMessage({
        type: "selectionUpdate",
        shapes: copiedShape,
      });
      penpot.ui.sendMessage({
        type: "notification",
        content: "Please select one shape to copy",
        state: "error",
      });
    }
  }

  if (
    msg.type === "replace" ||
    msg.type === "replaceAndAdjustSize" ||
    msg.type === "placeOver" ||
    msg.type === "placeUnder"
  ) {
    const selectedShapes = penpot.selection;
    let copiedShape = null;
    let clonedShapes = [];
    try {
      copiedShape = JSON.parse(
        penpot.root?.getPluginData("copiedShape") || "[]"
      );
    } catch (e) {
      penpot.ui.sendMessage({
        type: "notification",
        content: "Error",
        state: "error",
      });
    }
    if (copiedShape && copiedShape[0] && copiedShape[0].id) {
      const findShape = penpot.currentPage?.getShapeById(
        "" + copiedShape[0].id
      );
      if (!findShape) {
        penpot.ui.sendMessage({
          type: "notification",
          content: "Shape removed?",
          state: "info",
        });
        return;
      }
      if (findShape) {
        if (selectedShapes.length > 0) {
          const blockId = penpot.history.undoBlockBegin();
          selectedShapes.forEach((element) => {
            let clonedShape = null;

            clonedShape = findShape.clone();
            clonedShapes.push(clonedShape);
            const elementParent = element?.parent;
            if (
              elementParent &&
              (elementParent.type === "board" || elementParent.type === "group")
            ) {
              const index = elementParent.children.findIndex(
                (child) => child.id === element.id
              );
              if (msg.type === "placeOver") {
                elementParent.insertChild(index + 1, clonedShape);
              } else {
                elementParent.insertChild(index, clonedShape);
              }
            }
            clonedShape.x = element.x ? element.x : element.bounds.x;
            clonedShape.y = element.y ? element.y : element.bounds.y;
            if (msg.type === "replaceAndAdjustSize") {
              clonedShape.resize(
                element.width ? element.width : element.bounds.width,
                element.height ? element.height : element.bounds.height
              );
            }
            if (msg.type !== "placeOver" && msg.type !== "placeUnder") {
              element.remove();
            }
            penpot.selection = clonedShapes;
          });
          penpot.history.undoBlockFinish(blockId);
        }
      }
    } else {
      penpot.ui.sendMessage({
        type: "notification",
        content: "Nothing copied or cache cleared?",
        state: "info",
      });
    }
  }
  if (msg.type === "clearCache") {
    penpot.root?.setPluginData("copiedShape", "{}");
    penpot.ui.sendMessage({
      type: "notification",
      content: "Cache cleared",
      state: "success",
    });
    penpot.ui.sendMessage({
      type: "updateCopiedShapeName",
      name: "No shape copied",
    });
  }
});

penpot.on("themechange", (theme) => {
  penpot.ui.sendMessage({
    type: "theme",
    content: theme,
  });
});

penpot.on("selectionchange", () => {
  const copiedShape = penpot.selection;
  penpot.ui.sendMessage({
    type: "selection",
    shapes: copiedShape,
  });
});
