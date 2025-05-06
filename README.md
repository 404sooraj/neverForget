# NeverForget

NeverForget is an assistive technology application designed specifically for individuals with dementia, ADHD, and memory-related challenges. The app provides a seamless way to capture thoughts, memories, and important information through quick voice recordings, which are automatically transcribed and summarized for easy future reference.

## Purpose & Vision

NeverForget aims to:
- Help individuals with memory difficulties maintain independence
- Provide cognitive support for people with ADHD
- Assist dementia patients in preserving and accessing their memories
- Create a user-friendly interface that accommodates various cognitive needs
- Reduce anxiety about forgetting important information

## Features

### Core Functionality
- **Quick Capture System**
  - 10-second default recording duration (expandable up to 10 minutes)
  - One-tap recording activation
  - Automatic background upload
  - Real-time processing status indicators

### Smart Processing
- **Advanced Transcription**
  - OpenAI Whisper integration with multiple model options:
    - Whisper Tiny: Fast, lightweight processing
    - Whisper Base: Balanced performance
    - Whisper Turbo: Enhanced accuracy
  - Multi-language support
  - Punctuation and formatting

- **AI-Powered Summarization**
  - Google Gemini integration for concise summaries
  - Key points extraction
  - Context preservation
  - Memory categorization

### Accessibility-First Design
- **User Interface**
  - High-contrast visual elements
  - Large, readable text
  - Simple, intuitive navigation
  - Clear audio and visual feedback
  - Minimal cognitive load

- **Memory Management**
  - Categorized memory storage
  - Easy search and retrieval
  - Share functionality for caregivers
  - Backup and sync capabilities

## Future Roadmap

### Dedicated Hardware Development
- Custom device with specialized features:
  - Advanced background noise cancellation
  - Offline processing capabilities
  - Extended battery life
  - Durable, senior-friendly design

### Local Processing
- On-device transcription
- Local AI model implementation
- Enhanced privacy and security
- Reduced latency and internet dependency

## Tech Stack

### Frontend (Mobile App)
- React Native / Expo
- TypeScript
- React Navigation
- Expo AV for audio recording
- Native animations and gestures

### Backend (Server)
- Node.js & Express
- MongoDB for data storage
- OpenAI Whisper API integration
  - Configurable models (tiny/base/turbo)
- Google Gemini API for summarization

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- MongoDB instance
- OpenAI API key
- Google Cloud API key (for Gemini)
- FFmpeg installed and available in system PATH (required for Whisper audio processing)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/neverForget.git
cd neverForget
```

2. Install FFmpeg:
   - **Windows**:
     ```bash
     # Using Chocolatey
     choco install ffmpeg
     # Or download from https://ffmpeg.org/download.html#build-windows
     ```
   - **macOS**:
     ```bash
     brew install ffmpeg
     ```
   - **Linux**:
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
   For more details, visit the [FFmpeg Installation Guide](https://ffmpeg.org/download.html)

3. Install dependencies:
```bash
# Frontend setup
cd fend
npm install

# Backend setup
cd ../server
npm install
```

4. Configure environment variables:

Frontend (`fend/.env`):
```plaintext
EXPO_PUBLIC_API_URL=your_backend_url
```

Backend (`server/.env`):
```plaintext
MONGODB_URI=your_mongodb_uri
OPENAI_API_KEY=your_openai_api_key
GOOGLE_API_KEY=your_google_api_key
WHISPER_MODEL=base  # Options: tiny, base, turbo
PORT=3000
```

5. Start the development servers:

Backend:
```bash
cd server
npm run dev
```

Frontend:
```bash
cd fend
npx expo start
```

### Whisper Model Configuration

The application uses OpenAI's Whisper model for speech-to-text transcription. You can configure different model sizes based on your needs:

- **tiny**: Fastest, lowest accuracy, smallest model size (~39M parameters)
- **base**: Good balance of speed and accuracy (~74M parameters)
- **turbo**: Best accuracy, slower processing (~1.5B parameters)

To change the model, update the `WHISPER_MODEL` in your environment variables. For detailed information about Whisper models and their capabilities, visit the [OpenAI Whisper GitHub Repository](https://github.com/openai/whisper).

## Usage Guide

### Recording Memories
1. Open the app and tap the microphone button
2. Speak clearly for up to 10 seconds (default)
3. Recording automatically stops and processes
4. View the transcription and summary in the memories list

### Managing Recordings
1. Access the Summary tab to view all memories
2. Tap any memory to:
   - View full transcription
   - Read AI-generated summary
   - Share with caregivers
   - Delete if needed

### Settings Configuration
1. Adjust recording duration (10 sec - 10 min)
2. Select preferred Whisper model:
   - Tiny: Fastest, lower accuracy
   - Base: Balanced performance
   - Turbo: Highest accuracy, slower processing

## Contributing

We welcome contributions that improve accessibility and functionality for our users:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AccessibilityImprovement`)
3. Commit your changes (`git commit -m 'Add some AccessibilityImprovement'`)
4. Push to the branch (`git push origin feature/AccessibilityImprovement`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support:
- Open an issue in the GitHub repository
- Contact our support team at support@neverforget.app
- Join our community Discord server for discussions

## Security & Privacy

We take the privacy of our users, especially those with medical conditions, very seriously:
- All data is encrypted in transit and at rest
- Strict access controls and authentication
- Regular security audits
- HIPAA compliance measures
- Local processing options for sensitive data
