const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const { PythonShell } = require('python-shell');

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

    let opciones = {
        mode: 'text',
        pythonPath: path.join(__dirname, 'venv', 'Scripts', 'python.exe'),
        scriptPath: __dirname,
        args: [rutaArchivo, carpetaBase] 
    };

    let pyshell = new PythonShell('motor.py', opciones);

    // --- VARIABLES PARA CALCULAR EL PROGRESO GLOBAL ---
    const TOTAL_PASES = 8; // 4 Stems * 2 Shifts
    let paseActual = 0;    // Empezamos en el pase 0 (que visualmente será el 1)
    let ultimoPorcentajeRaw = 0;

    pyshell.on('message', function (mensaje) {
        console.log("PY:", mensaje);
        if (mensaje.includes('FINAL_PATH::')) {
             const rutaFinal = mensaje.split('FINAL_PATH::')[1].trim();
             event.reply('proceso-terminado', rutaFinal);
             return;
        }
        
        // Detectar Porcentaje (Patrón "Numero%")
        const textoLimpio = mensaje.replace(/\u001b\[.*?m/g, '').trim();
        const match = textoLimpio.match(/(\d{1,3})%/);

        if (match) {
            let porcentajeRaw = parseInt(match[1]); // Porcentaje del pase actual (0-100)

            // DETECTOR DE NUEVA PASADA:
            // Si la barra cae bruscamente (ej: de 90% a 5%), significa que empezó un nuevo pase
            if (porcentajeRaw < ultimoPorcentajeRaw && ultimoPorcentajeRaw > 80 && porcentajeRaw < 20) {
                paseActual++;
            }
            // Límite de seguridad
            if (paseActual >= TOTAL_PASES) paseActual = TOTAL_PASES - 1;

            ultimoPorcentajeRaw = porcentajeRaw;

            // --- CÁLCULO DEL PROGRESO GLOBAL (LA MAGIA) ---
            // Fórmula: (PasesCompletados * 100 + %Actual) / TotalPases
            let porcentajeGlobal = ((paseActual * 100) + porcentajeRaw) / TOTAL_PASES;
            
            // Enviamos un OBJETO con toda la info detallada a la pantalla
            event.reply('actualizar-progreso', {
                global: Math.round(porcentajeGlobal),
                pase: paseActual + 1,
                totalPases: TOTAL_PASES
            });
        }
    });

    pyshell.on('error', function (err) {
        console.error("Crash:", err);
        event.reply('error', 'Ocurrió un error inesperado.');
    });

    pyshell.end(function (err) {
        if (err) console.error("Fin proceso con error:", err);
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