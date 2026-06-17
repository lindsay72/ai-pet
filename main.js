const { app, BrowserWindow, dialog, ipcMain, Menu, screen } = require("electron");
const fs = require("fs");
const path = require("path");

let mainWindow;
let dragTimer;
let dragOffset = { x: 0, y: 0 };
let dragStarted = false;
let contextMenuOpened = false;

const isSmokeTest = process.argv.includes("--smoke-test");

function sendPetAction(action) {
  if (!mainWindow) {
    return;
  }

  mainWindow.webContents.executeJavaScript(`window.performPetAction(${JSON.stringify(action)})`);
}

function imageMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }
  if (extension === ".webp") {
    return "image/webp";
  }
  if (extension === ".gif") {
    return "image/gif";
  }
  if (extension === ".svg") {
    return "image/svg+xml";
  }
  return "image/png";
}

async function choosePetImage() {
  if (!mainWindow) {
    return;
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    title: "选择宠物形象",
    properties: ["openFile"],
    filters: [
      { name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "gif", "svg"] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return;
  }

  const filePath = result.filePaths[0];
  const data = fs.readFileSync(filePath);
  const dataUrl = `data:${imageMimeType(filePath)};base64,${data.toString("base64")}`;
  mainWindow.webContents.executeJavaScript(`window.setPetImage(${JSON.stringify(dataUrl)})`);
}

function showPetMenu() {
  if (!mainWindow) {
    return;
  }

  Menu.buildFromTemplate([
    { label: "卖萌", click: () => sendPetAction("cute") },
    { label: "走路", click: () => sendPetAction("walk") },
    { type: "separator" },
    { label: "上传形象...", click: choosePetImage },
    { label: "恢复默认形象", click: () => sendPetAction("reset-image") },
  ]).popup({ window: mainWindow });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 240,
    height: 240,
    minWidth: 220,
    minHeight: 220,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    hasShadow: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  if (isSmokeTest) {
    mainWindow.webContents.on("console-message", (_event, level, message) => {
      console.log(`[renderer:${level}] ${message}`);
    });
  }
  mainWindow.webContents.on("context-menu", (event) => {
    event.preventDefault();
    contextMenuOpened = true;
    if (isSmokeTest) {
      return;
    }
    showPetMenu();
  });
  mainWindow.loadFile("index.html", { query: { desktop: "1" } });

  if (isSmokeTest) {
    mainWindow.webContents.once("did-finish-load", runSmokeTest);
  }
}

async function runSmokeTest() {
  const before = await mainWindow.webContents.executeJavaScript(`
    ({
      desktopMode: document.body.classList.contains("desktop-mode"),
      hasDesktopPet: Boolean(window.desktopPet),
      performType: typeof window.performPetAction,
      setImageType: typeof window.setPetImage,
      panelDisplay: getComputedStyle(document.querySelector(".status-panel")).display,
      actionsDisplay: getComputedStyle(document.querySelector(".actions")).display,
      energy: document.querySelector("#energyValue").textContent
    })
  `);

  await mainWindow.webContents.executeJavaScript(`
    window.desktopPet.startDrag({ x: 180, y: 180 });
    window.desktopPet.stopDrag();
  `);
  await mainWindow.webContents.executeJavaScript(`
    document.querySelector("#pet").dispatchEvent(new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: 180,
      clientY: 170,
      button: 2
    }));
  `);
  sendPetAction("cute");
  await mainWindow.webContents.executeJavaScript(`
    window.setPetImage("data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjggMTI4Ij48Y2lyY2xlIGN4PSI2NCIgY3k9IjY0IiByPSI1MiIgZmlsbD0iIzhlZTZjYyIvPjwvc3ZnPg==");
  `);

  setTimeout(async () => {
    const after = await mainWindow.webContents.executeJavaScript(`
      ({
        energy: document.querySelector("#energyValue").textContent,
        thought: document.querySelector("#thought").textContent,
        customPet: document.body.classList.contains("custom-pet")
      })
    `);

    console.log(JSON.stringify({ before, after, dragStarted, contextMenuOpened }, null, 2));
    app.quit();
  }, 250);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on("pet:start-drag", (_event, offset) => {
  if (!mainWindow) {
    return;
  }

  dragStarted = true;
  dragOffset = offset;
  clearInterval(dragTimer);
  dragTimer = setInterval(() => {
    const cursor = screen.getCursorScreenPoint();
    mainWindow.setPosition(cursor.x - dragOffset.x, cursor.y - dragOffset.y, false);
  }, 16);
});

ipcMain.on("pet:stop-drag", () => {
  clearInterval(dragTimer);
  dragTimer = undefined;
});

ipcMain.on("pet:show-menu", () => {
  contextMenuOpened = true;
  if (isSmokeTest) {
    return;
  }

  showPetMenu();
});

ipcMain.on("pet:close", () => {
  app.quit();
});
