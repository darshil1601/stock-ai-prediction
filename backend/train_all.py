import sys
from app.utils.train_all import train_all_symbols
from app.services.training.lstm_trainer import train

if __name__ == "__main__":
    from app.utils.train_all import SYMBOLS
    target_symbols = sys.argv[1:] if len(sys.argv) > 1 else SYMBOLS
    if len(target_symbols) == 1:
        train(target_symbols[0])
    else:
        train_all_symbols()
