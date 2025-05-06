# NeverForget – Installation Guide

A comprehensive guide to set up NeverForget with local Whisper transcription, GPU acceleration, and all required dependencies.

## 1. Prerequisites

- **Node.js** (v16+)
- **npm** or **yarn**
- **Python 3.8+** (required for Whisper)
- **pip** (Python package manager)
- **MongoDB** (local or cloud instance)
- **Google Cloud API key** (for Gemini summarization)
- **CUDA-compatible GPU** (recommended for faster transcription)
- **FFmpeg** (required for audio processing)

## 2. Clone the Repository

```bash
git clone https://github.com/yourusername/neverForget.git
cd neverForget
```

## 3. Install FFmpeg

FFmpeg is essential for audio processing with Whisper.

### Windows

```bash
# Using Chocolatey
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html#build-windows
# Add the bin folder to your PATH environment variable
```

### macOS

```bash
brew install ffmpeg
```

### Linux

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# Fedora
sudo dnf install ffmpeg
```

Verify installation:

```bash
ffmpeg -version
```

## 4. Install Local Whisper

NeverForget uses OpenAI's Whisper locally (not the API version) for transcription.

### Install Whisper

```bash
pip install -U openai-whisper
```

### Add GPU Support (Highly Recommended)

For GPU acceleration, install PyTorch with CUDA support:

```bash
# For CUDA 11.8 (adjust based on your CUDA version)
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

To determine your optimal PyTorch version, visit: https://pytorch.org/get-started/locally/ , above command is skippable for cpu

## 5. Install Application Dependencies

### Frontend (React Native/Expo)

```bash
cd fend
npm install
```

### Backend (Node.js/Express)

```bash
cd ../server
npm install
```

## 6. Configure Environment Variables

### Frontend Configuration

Create `fend/.env`:

- instead of localhost, use your actual ip address, to run on mobile

```plaintext
EXPO_PUBLIC_API_URL=http://localhost:5000
```

### Backend Configuration

Create `server/.env`:

```plaintext
MONGODB_URI=your_mongodb_uri
GOOGLE_API_KEY=your_google_api_key
WHISPER_MODEL=base  # Options: tiny, base, small, medium, large
PORT=5000
```

## 7. Whisper Model Configuration

The application uses locally installed Whisper models for speech-to-text transcription:

| Model  | Parameters | Memory Required | Speed   | Accuracy |
| ------ | ---------- | --------------- | ------- | -------- |
| tiny   | ~39M       | ~1GB VRAM       | Fast    | Lower    |
| base   | ~74M       | ~1GB VRAM       | Medium  | Good     |
| small  | ~244M      | ~2GB VRAM       | Slower  | Better   |
| medium | ~769M      | ~5GB VRAM       | Slow    | High     |
| large  | ~1.5B      | ~10GB VRAM      | Slowest | Highest  |

To change the model, update the `WHISPER_MODEL` in your environment variables.
[not implemented yet ]

## 8. Start the Application

### Start Backend Server

```bash
cd server
npm run dev
```

### Start Frontend Development Server

```bash
cd fend
npx expo start
```

## 9. Verify GPU Acceleration

When running the application, check the server logs to confirm GPU usage:

```
Running Whisper transcription on GPU
```

If you see this message, Whisper is successfully using your GPU for transcription.

## 10. Troubleshooting

### CUDA/GPU Issues

- Ensure you have compatible NVIDIA drivers installed
- Verify PyTorch was installed with CUDA support:
  ```python
  import torch
  print(torch.cuda.is_available())  # Should return True
  ```
- Check GPU memory usage during transcription (should increase)

### FFmpeg Issues

- Ensure FFmpeg is properly installed and in your PATH
- Try running `ffmpeg -version` to verify installation

### MongoDB Connection Issues

- Check your MongoDB connection string
- Ensure MongoDB service is running

### Whisper Installation Issues

- Make sure you have Python 3.8+ installed
- Try reinstalling Whisper: `pip install -U openai-whisper`

## 11. Additional Resources

- [Whisper GitHub Repository](https://github.com/openai/whisper)
- [PyTorch Installation Guide](https://pytorch.org/get-started/locally/)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [MongoDB Documentation](https://docs.mongodb.com/)
