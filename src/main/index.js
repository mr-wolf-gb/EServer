import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import remoteMain from '@electron/remote/main'
import Store from 'electron-store'
import MainWindow from '@/main/MainWindow'
import { ipcListen } from '@/main/ipc'
import { extendPrototype } from '@/shared/utils/utils'
import I18n from '@/shared/i18n/I18n'

let mainWindow
const gotTheLock = app.isPackaged ? app.requestSingleInstanceLock() : true //仅生产环境生效

if (!gotTheLock) {
    app.quit()
} else {
    onReady()
    onRunning()
    onBeforeQuit()
}

async function createMainWindow() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: is.dev ? 1280 : 900,
        height: 650,
        minWidth: 900,
        minHeight: 650,
        resizable: true,
        titleBarStyle: 'hiddenInset',
        frame: !(process.platform === 'win32'),
        vibrancy: 'window',
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false,
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false,
            nodeIntegrationInWorker: true
        }
    })

    mainWindow.on('ready-to-show', () => {
        mainWindow.show()
    })

    mainWindow.on('page-title-updated', (e) => {
        e.preventDefault()
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
        mainWindow.webContents.openDevTools()
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
    remoteMain.enable(mainWindow.webContents)
    MainWindow.init(mainWindow)
}

function onReady() {
    app.on('ready', async () => {
        createMainWindow()
        Store.initRenderer()
        remoteMain.initialize()
        Store.initRenderer()
        I18n.init()
    })
}

function onRunning() {
    app.on('second-instance', () => {
        // 当运行第二个实例时,将会聚焦到mainWindow这个窗口
        if (mainWindow && app.isPackaged) {
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.show()
        }
    })
    //activate only macos
    app.on('activate', () => {
        mainWindow.show()
    })
}

function onBeforeQuit() {
    app.on('before-quit', () => {
        MainWindow.forceQuit = true
        if (is.dev) mainWindow.webContents.closeDevTools()
    })
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.commandLine.appendSwitch('--no-sandbox')
ipcListen()
extendPrototype()
