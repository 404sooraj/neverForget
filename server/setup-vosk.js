const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Setting up Vosk for English-Indian transcription...');

// Check if Python is installed
const checkPython = spawn('python', ['--version']);

checkPython.on('close', (code) => {
  if (code !== 0) {
    console.error('Python is not installed or not in PATH. Please install Python 3.x.');
    process.exit(1);
  }

  console.log('Python is installed, proceeding with setup.');
  
  // Install Vosk and dependencies
  console.log('Installing Vosk and dependencies...');
  const pip = spawn('pip', ['install', 'vosk', 'pydub']);
  
  pip.stdout.on('data', (data) => {
    console.log(data.toString());
  });
  
  pip.stderr.on('data', (data) => {
    console.error(data.toString());
  });
  
  pip.on('close', (code) => {
    if (code !== 0) {
      console.error('Failed to install Vosk dependencies. You may need to run this script with admin privileges.');
      process.exit(1);
    }
    
    console.log('Vosk dependencies installed successfully.');
    console.log('Checking FFmpeg installation...');
    
    // Check if FFmpeg is installed
    const ffmpeg = spawn('ffmpeg', ['-version']);
    
    ffmpeg.on('error', () => {
      console.error('FFmpeg is not installed. Please install FFmpeg.');
      console.log('For Windows, you can download it from: https://ffmpeg.org/download.html');
      console.log('For Linux: sudo apt-get install ffmpeg');
      console.log('For macOS: brew install ffmpeg');
      process.exit(1);
    });
    
    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        console.error('FFmpeg is not installed or not in PATH. Please install FFmpeg.');
        process.exit(1);
      }
      
      console.log('FFmpeg is installed.');
      console.log('Creating models directory if it doesn\'t exist...');
      
      // Create models directory if it doesn't exist
      const modelsDir = path.join(__dirname, 'models');
      if (!fs.existsSync(modelsDir)) {
        fs.mkdirSync(modelsDir, { recursive: true });
      }
      
      console.log('Setup completed successfully!');
      console.log('');
      console.log('The Vosk English-Indian model will be downloaded automatically when needed.');
      console.log('You can now start the server and transcribe audio using Vosk.');
    });
  });
}); 