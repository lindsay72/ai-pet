const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopPet", {
  isDesktop: true,
  onAction(callback) {
    ipcRenderer.on("pet:perform-action", (_event, action) => callback(action));
  },
  startDrag(offset) {
    ipcRenderer.send("pet:start-drag", offset);
  },
  stopDrag() {
    ipcRenderer.send("pet:stop-drag");
  },
  showMenu() {
    ipcRenderer.send("pet:show-menu");
  },
  close() {
    ipcRenderer.send("pet:close");
  },
});
