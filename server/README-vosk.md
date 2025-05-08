# English-Indian Speech Transcription with Vosk

This project now supports English-Indian speech transcription using Vosk, a free offline speech recognition toolkit.

## Prerequisites

Before you can use the Vosk transcription feature, you need:

1. **Python 3.x**: Vosk requires Python to be installed on your system
2. **FFmpeg**: Required for audio processing
3. **Pip**: Python package manager to install Vosk

## Setup

To set up Vosk for English-Indian speech transcription:

1. Run the setup script:
   ```
   npm run setup-vosk
   ```

   This script will:
   - Check if Python is installed
   - Install the Vosk Python package
   - Check if FFmpeg is installed
   - Create the necessary directories

2. The English-Indian model will be downloaded automatically when needed (about 40MB).

## Usage

The transcription service will automatically use Vosk for English-Indian transcription whenever available. If Vosk is not available or encounters an error, it will fall back to Whisper.

To transcribe audio with English-Indian language support:

```
POST /transcribe
Content-Type: multipart/form-data

audio: [audio file]
username: [username]
language: en-in
```

The `language` parameter should be set to `en-in` to use English-Indian transcription with Vosk.

## Troubleshooting

If you encounter issues with Vosk:

1. **Check Python installation**: Make sure Python 3.x is installed and in your PATH
   ```
   python --version
   ```

2. **Check FFmpeg installation**: Make sure FFmpeg is installed and in your PATH
   ```
   ffmpeg -version
   ```

3. **Manual installation**: If the setup script fails, you can manually install Vosk:
   ```
   pip install vosk pydub
   ```

4. **Model download**: If the model fails to download automatically, you can manually download it from:
   ```
   https://alphacephei.com/vosk/models/vosk-model-en-in-0.4.zip
   ```
   and extract it to the `server/models/vosk-model-en-in-0.4` directory.

5. **Logs**: Check the server logs for any errors related to Vosk initialization.

## Fallback Mechanism

If Vosk fails for any reason, the system will automatically fall back to using Whisper for transcription. This ensures that transcription continues to work even if there are issues with Vosk or its dependencies.

## Performance

Vosk is designed to be lightweight and can run efficiently on most systems without requiring a GPU. It offers good accuracy for English-Indian transcription while requiring fewer resources than larger models like Whisper. 