import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Function to download model if not exists
export const downloadVoskModel = async (modelName = 'vosk-model-en-in-0.4'): Promise<string> => {
  const modelsDir = path.resolve('models');
  const modelPath = path.join(modelsDir, modelName);
  
  // Convert to forward slashes for Python
  const normalizedModelsDir = modelsDir.replace(/\\/g, '/');
  const normalizedModelPath = modelPath.replace(/\\/g, '/');
  
  // Create models directory if it doesn't exist
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
  }
  
  // Check if model already exists
  if (fs.existsSync(modelPath)) {
    console.log(`Model ${modelName} already exists at ${modelPath}`);
    return modelPath;
  }
  
  console.log(`Downloading model ${modelName}...`);
  
  // Use a Python script to download the model
  // This approach works because vosk's Python package is easier to install
  return new Promise((resolve, reject) => {
    const process = spawn('python', [
      '-c',
      `
import os
import sys
import zipfile
import urllib.request

model_name = "${modelName}"
model_url = f"https://alphacephei.com/vosk/models/{model_name}.zip"
model_path = r"${normalizedModelPath}"
models_dir = r"${normalizedModelsDir}"

print(f"Models directory: {models_dir}")
print(f"Target model path: {model_path}")

if not os.path.exists(models_dir):
    os.makedirs(models_dir)

print(f"Downloading {model_url}...")
urllib.request.urlretrieve(model_url, f"{model_name}.zip")

print("Extracting model...")
with zipfile.ZipFile(f"{model_name}.zip", "r") as zip_ref:
    zip_ref.extractall(models_dir)

os.remove(f"{model_name}.zip")
print(f"Model downloaded and extracted to {model_path}")
      `
    ]);
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log(data.toString());
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(data.toString());
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log(`Downloaded model to ${modelPath}`);
        resolve(modelPath);
      } else {
        const error = `Failed to download model: ${stderr}`;
        console.error(error);
        reject(new Error(error));
      }
    });
  });
};

// Transcribe audio using vosk via Python (more reliable than Node.js bindings)
export const transcribeWithVosk = (
  audioFile: string, 
  modelName = 'vosk-model-en-in-0.4'
): Promise<string> => {
  console.log(`Transcribing ${audioFile} with Vosk model ${modelName}`);
  
  return new Promise((resolve, reject) => {
    const modelPath = path.resolve('models', modelName);
    
    // Convert to forward slashes and normalize path for Python
    const normalizedModelPath = modelPath.replace(/\\/g, '/');
    const normalizedAudioFile = audioFile.replace(/\\/g, '/');
    
    // Check if model exists
    if (!fs.existsSync(modelPath)) {
      return reject(new Error(`Model not found at ${modelPath}. Please download it first.`));
    }
    
    // Use a Python script to do the transcription
    const process = spawn('python', [
      '-c',
      `
import sys
import json
import os
import wave
import subprocess
from vosk import Model, KaldiRecognizer, SetLogLevel

# Convert audio to required format if needed
audio_file = "${normalizedAudioFile}"
wav_file = audio_file + ".wav"

# Convert to WAV format if not already
if not audio_file.endswith(".wav"):
    print(f"Converting {audio_file} to WAV format...")
    subprocess.run(["ffmpeg", "-i", audio_file, "-ar", "16000", "-ac", "1", wav_file], check=True)
else:
    wav_file = audio_file

# Set up Vosk
SetLogLevel(-1)  # Disable debug output
print("Loading model...")
# Use raw string prefix (r) to avoid escape sequence issues with Windows paths
model_path = r"${normalizedModelPath}"
print(f"Model path: {model_path}")
model = Model(model_path)
print("Model loaded")

# Process audio
wf = wave.open(wav_file, "rb")
rec = KaldiRecognizer(model, wf.getframerate())
rec.SetWords(True)

print("Transcribing...")
transcription = ""
while True:
    data = wf.readframes(4000)
    if len(data) == 0:
        break
    if rec.AcceptWaveform(data):
        part = json.loads(rec.Result())
        if "text" in part:
            transcription += part["text"] + " "

final = json.loads(rec.FinalResult())
if "text" in final:
    transcription += final["text"]

print("Done transcribing")

# Write to file
with open(audio_file + ".txt", "w") as f:
    f.write(transcription.strip())

print(audio_file + ".txt")
      `
    ]);
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
      console.log(data.toString());
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
      console.error(data.toString());
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        // Return the path to the transcription file
        const transcriptionFile = `${audioFile}.txt`;
        if (fs.existsSync(transcriptionFile)) {
          resolve(transcriptionFile);
        } else {
          reject(new Error(`Transcription completed but file not found: ${transcriptionFile}`));
        }
      } else {
        reject(new Error(`Failed to transcribe: ${stderr}`));
      }
    });
  });
};

// Check dependencies for vosk
export const checkVoskDependencies = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // First check Python modules
    const pythonProcess = spawn('python', [
      '-c',
      `
try:
    import vosk
    print("vosk is installed")
    import wave
    print("wave is installed")
    exit(0)
except ImportError as e:
    print(f"Missing dependency: {e}")
    exit(1)
      `
    ]);
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        // Python modules check failed
        resolve(false);
        return;
      }
      
      // Check if FFmpeg is installed as a system command
      const ffmpegProcess = spawn('ffmpeg', ['-version']);
      
      ffmpegProcess.on('error', () => {
        console.error("FFmpeg is not installed or not in PATH");
        resolve(false);
      });
      
      ffmpegProcess.on('close', (ffmpegCode) => {
        if (ffmpegCode === 0) {
          console.log("FFmpeg is installed");
          resolve(true);
        } else {
          console.error("FFmpeg check failed with code:", ffmpegCode);
          resolve(false);
        }
      });
    });
  });
}; 