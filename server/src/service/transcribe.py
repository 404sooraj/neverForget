# scripts/transcribe.py
import sys
import whisper
import json

def main(audio_path):
    model = whisper.load_model("base")
    result = model.transcribe(audio_path)
    print(json.dumps(result))

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python transcribe.py <audio_path>")
        sys.exit(1)

    main(sys.argv[1])
