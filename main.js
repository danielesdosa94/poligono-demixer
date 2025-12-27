const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process'); // Usamos spawn nativo, más robusto para .exe

let ventana;

function crearVentana() {
    ventana = new BrowserWindow({
        width: 900, height: 700,
        title: "Polígono Splitter",
        backgroundColor: '#141414',
        icon: path.join(__dirname, 'logo2.png'), 
        webPreferences: { nodeIntegration: true, contextIsolation: false }
    });
    ventana.setMenuBarVisibility(false);
    ventana.loadFile('index.html');
}

app.whenReady().then(crearVentana);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// --- LÓGICA DEL PROCESO ---

function iniciarProcesamiento(rutaArchivo, event) {
    if (!rutaArchivo || typeof rutaArchivo !== 'string') return;
    const carpetaBase = path.dirname(rutaArchivo);
    
    event.reply('inicio-proceso');
    event.reply('mensaje-consola', `Cargando motor de IA...`);

    // --- DETECCIÓN INTELIGENTE DE ENTORNO ---
    let comando, argumentos;

    if (app.isPackaged) {
        // MODO PRODUCCIÓN (Cuando ya es un .exe instalado)
        // La carpeta 'motor' estará dentro de resources
        const motorPath = path.join(process.resourcesPath, 'motor', 'motor.exe');
        comando = motorPath;
        argumentos = [rutaArchivo, carpetaBase]; // motor.exe recibe argumentos directo
        console.log("Modo Producción: Usando", motorPath);
    } else {
        // MODO DESARROLLO (En tu VS Code)
        const pythonPath = path.join(__dirname, 'venv', 'Scripts', 'python.exe');
        const scriptPath = path.join(__dirname, 'motor.py');
        comando = pythonPath;
        argumentos = ['-u', scriptPath, rutaArchivo, carpetaBase];
        console.log("Modo Desarrollo: Usando VENV");
    }
    // -----------------------------------------

    // Ejecutamos el proceso (Sea Python o sea el Exe)
    const proceso = spawn(comando, argumentos, {
        windowsHide: true // Ocultar ventana negra extra en producción
    });

    // Variables para el progreso
    const TOTAL_PASES = 8;
    let paseActual = 0;
    let ultimoPorcentajeRaw = 0;

    // LEER LO QUE DICE EL MOTOR
    proceso.stdout.on('data', (data) => {
        const mensaje = data.toString();
        console.log("PY:", mensaje);

        // 1. Detectar Ruta Final
        if (mensaje.includes('FINAL_PATH::')) {
             const rutaFinal = mensaje.split('FINAL_PATH::')[1].trim();
             event.reply('proceso-terminado', rutaFinal);
             return;
        }

        // 2. Detectar Porcentaje
        const textoLimpio = mensaje.replace(/\u001b\[.*?m/g, '').trim();
        const match = textoLimpio.match(/(\d{1,3})%/);

        if (match) {
            let porcentajeRaw = parseInt(match[1]);

            // Detector de nuevo pase (si baja de golpe)
            if (porcentajeRaw < ultimoPorcentajeRaw && ultimoPorcentajeRaw > 80 && porcentajeRaw < 20) {
                paseActual++;
            }
            if (paseActual >= TOTAL_PASES) paseActual = TOTAL_PASES - 1;
            ultimoPorcentajeRaw = porcentajeRaw;

            // Cálculo Global
            let porcentajeGlobal = ((paseActual * 100) + porcentajeRaw) / TOTAL_PASES;
            
            event.reply('actualizar-progreso', {
                global: Math.round(porcentajeGlobal),
                pase: paseActual + 1,
                totalPases: TOTAL_PASES
            });
        }
    });

    // LEER ERRORES
    proceso.stderr.on('data', (data) => {
        const errorMsg = data.toString();
        // A veces Demucs manda info por stderr que no es error, filtramos:
        if (errorMsg.toLowerCase().includes('error') && !errorMsg.includes('%')) {
            console.error("ERR:", errorMsg);
        }
    });

    proceso.on('close', (code) => {
        console.log(`Proceso terminó con código ${code}`);
        if (code !== 0) {
            event.reply('error', 'El proceso de IA se cerró inesperadamente.');
        }
    });
    
    proceso.on('error', (err) => {
        console.error("Error al iniciar proceso:", err);
        event.reply('error', 'No se pudo iniciar el motor de IA.');
    });
}

// IPC Listeners
ipcMain.on('abrir-selector-archivo', async (event) => {
    const resultado = await dialog.showOpenDialog(ventana, {
        properties: ['openFile'],
        filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'flac', 'm4a'] }]
    });
    if (resultado.canceled) return;
    iniciarProcesamiento(resultado.filePaths[0], event);
});

ipcMain.on('archivo-arrastrado', (event, rutaArchivo) => {
    iniciarProcesamiento(rutaArchivo, event);
});

ipcMain.on('abrir-carpeta-salida', (event, rutaParaAbrir) => {
    if (rutaParaAbrir) shell.openPath(rutaParaAbrir);
});