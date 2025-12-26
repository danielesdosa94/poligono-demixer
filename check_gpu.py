import torch

print(f"¿PyTorch ve la GPU?: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"Tarjeta detectada: {torch.cuda.get_device_name(0)}")
else:
    print("⚠️ ESTÁS USANDO CPU. Por eso va lento.")
