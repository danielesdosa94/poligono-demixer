import subprocess
import os

# --- CONFIGURACIÓN DE CALIDAD ---

# MODELO: Probemos la versión "Fine Tuned" (htdemucs_ft)
# Suele tener mejor separación vocal que el estándar.
MODELO = "htdemucs_ft" 

# SHIFTS: Número de pasadas aleatorias.
# 1 = Rápido (calidad normal)
# 2 = Mejor calidad (reduce artifacts)
# 5 - 10 = Calidad "Audiófila" (muy lento, pero muy limpio)
# Recomendación para Lead Magnet: 2
SHIFTS = "2"

# OVERLAP: Cuánto se superponen los segmentos (0.1 a 0.99).
# 0.25 es default. Subirlo a 0.5 suaviza las uniones.
OVERLAP = "0.5"

def procesar_audio(ruta_archivo):
    if not os.path.exists(ruta_archivo):
        print(f"❌ Error: El archivo '{ruta_archivo}' no existe.")
        return False

    print(f"\n--- 🎛️ Procesando en Alta Calidad ---")
    print(f"Canción: {os.path.basename(ruta_archivo)}")
    print(f"Modelo: {MODELO} | Shifts: {SHIFTS} | Overlap: {OVERLAP}")
    print("⏳ Esto tardará más que la prueba anterior...")

    comando = [
        "demucs",
        "-n", MODELO,
        "--shifts", SHIFTS,
        "--overlap", OVERLAP,
        # Opcional: Si quieres guardar en MP3 320k en vez de WAV para ahorrar espacio
        # "--mp3", "--mp3-bitrate", "320",
        ruta_archivo
    ]

    try:
        subprocess.run(comando, check=True)
        print(f"\n✅ Separación completada.")
        return True

    except subprocess.CalledProcessError as e:
        print(f"\n❌ Error: {e}")
        return False

if __name__ == "__main__":
    archivo_input = "test.wav" # Asegúrate que este archivo exista
    procesar_audio(archivo_input)