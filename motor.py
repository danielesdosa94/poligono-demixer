import subprocess
import os
import sys
import io # <--- IMPORTANTE: Necesario para arreglar la codificación

# --- PARCHE DE CODIFICACIÓN PARA WINDOWS ---
# Esto obliga a Python a usar UTF-8 para imprimir en la consola,
# permitiendo emojis y tildes sin que la app explote.
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# --- CONFIGURACIÓN ---
MODELO = "htdemucs_ft" 
SHIFTS = "2"
OVERLAP = "0.5"

def procesar_audio(ruta_archivo):
    if not os.path.exists(ruta_archivo):
        # Quitamos emojis de los errores críticos por seguridad
        print(f"Error: El archivo '{ruta_archivo}' no existe.")
        return False

    # Ahora sí podemos usar emojis sin miedo
    print(f"--- 🎛️ Procesando: {os.path.basename(ruta_archivo)} ---")
    print(f"Modelo: {MODELO} | Shifts: {SHIFTS}")
    
    comando = [
        sys.executable, "-m", "demucs",
        "-n", MODELO,
        "--shifts", SHIFTS,
        "--overlap", OVERLAP,
        ruta_archivo
    ]

    try:
        subprocess.run(comando, check=True)
        print(f"\n✅ Separación completada con éxito.")
        return True

    except subprocess.CalledProcessError as e:
        print(f"\nError critico en Python: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) > 1:
        archivo_input = sys.argv[1]
        procesar_audio(archivo_input)
    else:
        print("Advertencia: Modo manual. Procesando 'test.mp3'")
        procesar_audio("test.mp3")