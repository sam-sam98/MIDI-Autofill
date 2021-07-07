const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const fs = require("fs");
const util = require("util");
const path = require("path");
const SerialServer = require("./serial-server");

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  // eslint-disable-line global-require
  app.quit();
}

let serialServer = new SerialServer();
let mainWindow;

// FIXME: Awful, instead SerialServer should have a await/async API so this isn't necessary to track
let activeSaveDirectory;

const createWindow = async () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // nodeIntegration: true,
      // contextIsolation: false,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  // and load the index.html of the app.
  await mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", async () => {
  try {
    await serialServer.init();
  } catch (error) {}
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on("app-ready", (event) => {
  var connectionStatus = "good";
  if (serialServer.port == undefined) {
    connectionStatus = "error";
  }
  event.reply("app-connection-result", connectionStatus);
});

ipcMain.on("retry-connection", async (event) => {
  console.log("Retrying connection...");
  try {
    await serialServer.init();
  } catch (error) {}

  var connectionStatus = "good";
  if (serialServer.port == undefined) {
    connectionStatus = "error";
  }
  event.reply("app-connection-result", connectionStatus);
});

ipcMain.on("list-files", async (_event) => {
  serialServer.listFiles();
});

ipcMain.on("save-files", async (_event, files) => {
  var result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });

  console.log(files);

  if (!result.canceled) {
    var directory = result.filePaths[0];
    activeSaveDirectory = directory;
    for (let file of files) {
      console.log("Fetching file ", file);
      serialServer.fetchFile(file);
    }
  }
});

serialServer.on("list_files_response", (files) => {
  mainWindow.webContents.send("list-files-result", files);
});

serialServer.on("fetch_file_response", async (response) => {
  let file = response["file"];
  let base64 = response["data"];
  let outPath = path.join(activeSaveDirectory, file);
  let writeFile = util.promisify(fs.writeFile);
  try {
    await writeFile(outPath, base64, "base64");
  } catch (error) {
    console.error("Failed to fetch file ", file, ": ");
    console.error(error);
  }
});
