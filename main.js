const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { PythonShell } = require('python-shell');

let ventana;

function crearVentana() {
    ventana = new BrowserWindow({
        width: 900,
        height: 600,
        title: "Polígono Demixer",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    ventana.loadFile('index.html');
}

app.whenReady().then(crearVentana);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// --- LÓGICA DE INTEGRACIÓN ROBUSTA ---

ipcMain.on('abrir-selector-archivo', async (event) => {
    const resultado = await dialog.showOpenDialog(ventana, {
        properties: ['openFile'],
        filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'flac', 'm4a'] }]
    });

    if (resultado.canceled) return;
    const rutaArchivo = resultado.filePaths[0];
    
    event.reply('inicio-proceso');
    event.reply('mensaje-consola', `Cargando: ${path.basename(rutaArchivo)}...`);

    let opciones = {
        mode: 'text',
        // Usamos path.join para que Windows ponga las barras correctamente
        pythonPath: path.join(__dirname, 'venv', 'Scripts', 'python.exe'),
        scriptPath: __dirname,
        args: [rutaArchivo]
    };

    let pyshell = new PythonShell('motor.py', opciones);

    // ESCUCHAMOS MENSAJES NORMALES
    pyshell.on('message', function (mensaje) {
        console.log("PY:", mensaje); // Ver en terminal VS Code
        if (mensaje.includes('Separación completada')) {
             event.reply('mensaje-consola', 'Finalizando exportación...');
        } else if (mensaje.includes('Procesando') || mensaje.includes('Modelo')) {
             event.reply('mensaje-consola', mensaje);
        }
    });

    // ESCUCHAMOS ERRORES (O BARRA DE PROGRESO)
    // Esto evita que la app muera solo porque Demucs muestra una barra de carga
    pyshell.on('stderr', function (stderr) {
        console.log("STDERR:", stderr); 
        // Solo si es un error real crítico avisamos, si es progreso lo ignoramos
        if (stderr.toLowerCase().includes('error')) {
            console.error("Error detectado:", stderr);
        }
    });

    // CUANDO PYTHON TERMINA
    pyshell.end(function (err, code, signal) {
        if (err) {
            console.error("Crash real:", err);
            // Solo mostramos error al usuario si el código de salida es de fallo (1)
            // A veces python-shell lanza error erróneo aunque termine bien
            event.reply('error', 'Revisa la terminal de VS Code para ver el detalle.'); 
        } else {
            console.log("Proceso terminado con código:", code);
            event.reply('proceso-terminado');
        }
    });
});