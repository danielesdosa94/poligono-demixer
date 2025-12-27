import sys
import os
import io
import shutil
import multiprocessing
import demucs.separate 

# --- CONFIGURACIÓN DE CANALES ---
# 1. Forzamos UTF-8 para evitar errores con tildes o emojis
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# 2. TRUCO DE ORO: Redirigimos stderr a stdout
# Esto hace que la barra de progreso de Demucs sea leída por Electron
sys.stderr = sys.stdout

# --- PARÁMETROS ---
MODELO = "htdemucs_ft" 
SHIFTS = "2"
OVERLAP = "0.5"

def procesar_audio(ruta_archivo, carpeta_base):
    # Imprimimos con flush=True para que llegue a Electron al instante
    print(f"--- Iniciando proceso para: {os.path.basename(ruta_archivo)} ---", flush=True)

    if not os.path.exists(ruta_archivo):
        print(f"Error: El archivo no existe.", flush=True)
        return False

    try:
        nombre_cancion = os.path.splitext(os.path.basename(ruta_archivo))[0]
        carpeta_final = os.path.join(carpeta_base, f"stems_{nombre_cancion}")
        carpeta_temp = os.path.join(carpeta_base, "temp_work")
        
        # Limpieza previa
        if os.path.exists(carpeta_temp):
            shutil.rmtree(carpeta_temp)

        # Configuración de Demucs
        demucs_args = [
            "-n", MODELO,
            "-j", "0",      # Mantenemos 0 workers para estabilidad
            "-o", carpeta_temp,
            "--shifts", SHIFTS,
            "--overlap", OVERLAP,
            ruta_archivo
        ]
        
        print("Iniciando separación...", flush=True)

        # EJECUCIÓN DEL MOTOR
        demucs.separate.main(demucs_args)
        
        # Gestión de archivos resultantes
        ruta_demucs = os.path.join(carpeta_temp, MODELO, nombre_cancion)
        
        if os.path.exists(ruta_demucs):
            if os.path.exists(carpeta_final):
                shutil.rmtree(carpeta_final)
            shutil.move(ruta_demucs, carpeta_final)
            shutil.rmtree(carpeta_temp)
            
            # MENSAJE CLAVE: Electron está esperando ESTO EXACTAMENTE
            print(f"FINAL_PATH::{carpeta_final}", flush=True) 
            return True
        else:
            print("Error: No se generó la carpeta de salida.", flush=True)
            return False

    except Exception as e:
        # Imprimimos el error para que Electron pueda mostrarlo si es necesario
        print(f"Error crítico en Python: {e}", flush=True)
        return False

if __name__ == "__main__":
    multiprocessing.freeze_support()
    
    if len(sys.argv) > 2:
        ruta_input = sys.argv[1]
        ruta_output = sys.argv[2]
        procesar_audio(ruta_input, ruta_output)
    else:
        print("Modo espera (sin argumentos)", flush=True)