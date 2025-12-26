const { app, BrowserWindow } = require('electron');
const path = require('path');

function crearVentana() {
    // Crear la ventana del navegador
    const ventana = new BrowserWindow({
        width: 800,
        height: 600,
        title: "Polígono Demixer",
        webPreferences: {
            nodeIntegration: true, // Para poder hablar con el sistema
            contextIsolation: false // Simplifica las cosas para este prototipo
        }
    });

    // Cargar el archivo index.html (que crearemos ahora)
    ventana.loadFile('index.html');
}

// Cuando la app esté lista, crea la ventana
app.whenReady().then(() => {
    crearVentana();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            crearVentana();
        }
    });
});

// Cerrar la app cuando todas las ventanas se cierren (Windows/Linux standard)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
