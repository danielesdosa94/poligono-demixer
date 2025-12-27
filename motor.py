import subprocess
import os
import sys
import io
import shutil

# Forzamos codificación UTF-8 para evitar errores de emojis
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# --- CONFIGURACIÓN ---
MODELO = "htdemucs_ft" 
SHIFTS = "2"
OVERLAP = "0.5"

def procesar_audio(ruta_archivo, carpeta_base):
    if not os.path.exists(ruta_archivo):
        print(f"Error: El archivo no existe.")
        return False

    nombre_cancion = os.path.splitext(os.path.basename(ruta_archivo))[0]
    carpeta_final = os.path.join(carpeta_base, f"stems_{nombre_cancion}")
    carpeta_temp = os.path.join(carpeta_base, "temp_work")

    print(f"--- 🎛️ Procesando: {nombre_cancion} ---")
    print(f"📂 Destino final: {carpeta_final}")
    
    # Limpieza inicial
    if os.path.exists(carpeta_temp):
        shutil.rmtree(carpeta_temp)

    comando = [
        sys.executable, "-m", "demucs",
        "-n", MODELO,
        "-o", carpeta_temp,
        "--shifts", SHIFTS,
        "--overlap", OVERLAP,
        ruta_archivo
    ]

    try:
        # --- CAMBIO CLAVE: USAMOS POPEN EN LUGAR DE RUN ---
        # Esto abre el proceso y nos permite leerlo en vivo
        proceso = subprocess.Popen(
            comando,
            stdout=subprocess.PIPE,  # Capturamos salida estándar
            stderr=subprocess.STDOUT, # Redirigimos errores (barra de progreso) a la salida estándar
            text=True,     # Lo tratamos como texto
            bufsize=1,     # Buffer de línea (envía cada vez que hay nueva línea)
            encoding='utf-8',
            errors='replace' # Si hay caracteres raros, no crashea
        )

        # LEEMOS EN VIVO
        # Este bucle se ejecuta cada vez que Demucs imprime algo
        for linea in proceso.stdout:
            # Imprimimos inmediatamente para que Electron lo lea
            print(linea, end='', flush=True) 

        # Esperamos a que termine el proceso
        proceso.wait()

        # Verificamos si salió bien
        if proceso.returncode == 0:
            # --- LÓGICA DE MOVER ARCHIVOS ---
            ruta_demucs = os.path.join(carpeta_temp, MODELO, nombre_cancion)
            
            if os.path.exists(ruta_demucs):
                if os.path.exists(carpeta_final):
                    shutil.rmtree(carpeta_final)
                shutil.move(ruta_demucs, carpeta_final)
                shutil.rmtree(carpeta_temp)
                
                print(f"\n✅ Separación completada con éxito.")
                print(f"FINAL_PATH::{carpeta_final}") 
                return True
            else:
                print("❌ Error: Demucs no generó la carpeta esperada.")
                return False
        else:
            print(f"❌ Error: El proceso terminó con código {proceso.returncode}")
            return False

    except Exception as e:
        print(f"\nError crítico en Python: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 2:
        ruta_input = sys.argv[1]
        ruta_output = sys.argv[2]
        procesar_audio(ruta_input, ruta_output)
    else:
        procesar_audio("test.mp3", os.getcwd())