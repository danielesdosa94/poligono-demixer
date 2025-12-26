import subprocess
import os
import sys

# Definimos el modelo a usar. 
# 'htdemucs' (Hybrid Transformer) es el estándar v4 de Meta. 
# Ofrece la mejor relación calidad/velocidad actual.
MODELO = "htdemucs"

def procesar_audio(ruta_archivo):
    """
    Toma un archivo de audio y lo separa en 4 stems usando Demucs.
    """
    
    # 1. Validación básica: ¿El archivo existe?
    if not os.path.exists(ruta_archivo):
        print(f"Error: El archivo '{ruta_archivo}' no existe.")
        return False

    print(f"--- Iniciando procesamiento para: {os.path.basename(ruta_archivo)} ---")
    print(f"Modelo seleccionado: {MODELO}")
    
    # 2. Construcción del comando
    # Equivalente a escribir en terminal: demucs -n htdemucs "cancion.mp3"
    comando = [
        "demucs",
        "-n", MODELO,
        ruta_archivo
    ]

    try:
        # 3. Ejecución del proceso
        # subprocess.run permite correr comandos de terminal desde Python
        subprocess.run(comando, check=True)
        
        print(f"\n✅ Separación completada con éxito.")
        return True

    except subprocess.CalledProcessError as e:
        print(f"\n❌ Error crítico durante el proceso: {e}")
        return False
    except FileNotFoundError:
        print("\n❌ Error: No se encuentra el comando 'demucs'. Verifica que esté instalado en el entorno virtual.")
        return False

if __name__ == "__main__":
    # --- ZONA DE PRUEBAS ---
    # Esto solo se ejecuta si corres el archivo directamente, no si lo importas.
    
    # Cambia esto por el nombre de tu archivo de prueba
    archivo_input = "test2.wav" 
    
    procesar_audio(archivo_input)