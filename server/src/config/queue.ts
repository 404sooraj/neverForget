import { exec } from "child_process";
import { EventEmitter } from "events";
import { transcribeWithVosk, downloadVoskModel, checkVoskDependencies } from "./vosk-transcribe";
import path from "path";

interface TranscriptionJob {
  id: string;
  filePath: string;
  username: string;
  retries: number;
  maxRetries: number;
  language?: string; // Add language parameter
  onComplete: (error: Error | null, result?: any) => void;
}

class TranscriptionQueue {
  private queue: TranscriptionJob[] = [];
  private currentProcessing: number = 0;
  private maxConcurrency: number = 2; // Reduced from 3 to 2 to avoid GPU memory issues
  private events: EventEmitter;
  private gpuFailures: number = 0; // Track GPU failures to decide when to fall back to CPU
  private voskReady: boolean = false;
  private isInitializing: boolean = false;

  constructor() {
    this.events = new EventEmitter();
    this.events.on("processNext", this.processNext.bind(this));
    
    // Initialize Vosk model
    this.initializeVosk().catch(err => {
      console.error("Failed to initialize Vosk:", err);
    });
  }

  private async initializeVosk(): Promise<void> {
    if (this.isInitializing) return;
    this.isInitializing = true;

    try {
      // Check if Vosk dependencies are installed
      const depsInstalled = await checkVoskDependencies();
      
      if (!depsInstalled) {
        console.log("Vosk dependencies not found. Please install them with:");
        console.log("pip install vosk pydub");
        console.log("Falling back to whisper transcription");
        this.voskReady = false;
        return;
      }

      // Download the English-Indian model if not already downloaded
      await downloadVoskModel("vosk-model-en-in-0.4");
      this.voskReady = true;
      console.log("Vosk initialized successfully with English-Indian model");
    } catch (error) {
      console.error("Error initializing Vosk:", error);
      this.voskReady = false;
    } finally {
      this.isInitializing = false;
    }
  }

  public async addJob(
    filePath: string,
    username: string,
    onComplete: (error: Error | null, result?: any) => void,
    maxRetries: number = 3,
    language: string = "en-in" // Default to English-Indian
  ): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const job: TranscriptionJob = {
      id: jobId,
      filePath,
      username,
      retries: 0,
      maxRetries,
      language,
      onComplete,
    };

    this.queue.push(job);
    console.log(
      `\x1b[34mAdded job ${jobId} to queue. Queue length: ${this.queue.length}\x1b[0m`
    );

    // Always try to process next jobs when a new job is added
    this.events.emit("processNext");

    return jobId;
  }

  private async processNext(): Promise<void> {
    // Process jobs as long as there are jobs in the queue and we're below max concurrency
    while (
      this.queue.length > 0 &&
      this.currentProcessing < this.maxConcurrency
    ) {
      // Take the first job from the queue
      const job = this.queue.shift()!;

      // Increment the current processing count
      this.currentProcessing++;

      console.log(
        `\x1b[34mProcessing job ${job.id}. Attempt ${job.retries + 1} of ${
          job.maxRetries + 1
        }. Current parallel jobs: ${this.currentProcessing}\x1b[0m`
      );

      // Process the job asynchronously
      this.processJob(job)
        .then(() => {
          // Successfully completed
          job.onComplete(null);
          console.log(
            `\x1b[34mJob ${job.id} completed successfully. ${this.queue.length} recordings left in the queue\x1b[0m`
          );
        })
        .catch((error) => {
          console.error(`Error processing job ${job.id}:`, error);

          if (job.retries < job.maxRetries) {
            // Increment retries and add back to queue
            job.retries++;
            this.queue.push(job);
            console.log(
              `Job ${job.id} will be retried. Attempt ${job.retries + 1} of ${
                job.maxRetries + 1
              }`
            );
          } else {
            // Max retries reached, report failure
            job.onComplete(
              new Error(`Failed after ${job.maxRetries + 1} attempts`)
            );
            console.log(
              `Job ${job.id} failed after ${job.maxRetries + 1} attempts`
            );
          }
        })
        .finally(() => {
          // Always decrement the processing count and try to process next jobs
          this.currentProcessing--;

          // Small delay before processing next job
          setTimeout(() => {
            this.events.emit("processNext");
          }, 500);
        });
    }
  }

  private async processJob(job: TranscriptionJob): Promise<void> {
    return this.processTranscription(job);
  }

  private processTranscription(job: TranscriptionJob): Promise<void> {
    // Use Vosk for English-Indian transcription if ready and language is en-in
    if (this.voskReady && job.language === "en-in") {
      console.log(`Using Vosk for English-Indian transcription of ${job.filePath}`);
      return new Promise((resolve, reject) => {
        transcribeWithVosk(job.filePath)
          .then(() => {
            resolve();
          })
          .catch((error) => {
            console.error("Vosk transcription failed:", error);
            console.log("Falling back to Whisper transcription");
            // Fall back to Whisper if Vosk fails
            this.runWhisperTranscription(job, true)
              .then(resolve)
              .catch(reject);
          });
      });
    } else {
      // Use Whisper for other languages or if Vosk is not ready
      return this.runWhisperTranscription(job);
    }
  }

  private runWhisperTranscription(job: TranscriptionJob, isFallback = false): Promise<void> {
    return new Promise((resolve, reject) => {
      // Determine if we should use CPU based on previous GPU failures
      const useCPU = this.gpuFailures > 0;
      const deviceFlag = useCPU ? "--device cpu" : "";
      
      // Determine the language flag
      let languageFlag = "--language English"; // Default language
      
      if (job.language === "en-in") {
        languageFlag = "--language English";
      }
      
      console.log(
        `Running Whisper transcription${useCPU ? " on CPU" : " on GPU"} with ${languageFlag}${isFallback ? " (fallback from Vosk)" : ""}`
      );

      exec(
        `whisper ${job.filePath} --model base ${deviceFlag} --output_dir uploads --output_format txt ${languageFlag}`,
        (error) => {
          if (error) {
            const errorStr = error.toString().toLowerCase();

            // Check if this is a GPU memory error
            if (
              errorStr.includes("cuda error") ||
              errorStr.includes("gpu") ||
              errorStr.includes("memory") ||
              errorStr.includes("out of memory")
            ) {
              console.log(
                "Detected GPU memory issue, switching to CPU for this and future jobs"
              );
              this.gpuFailures++;

              // If this was a GPU attempt that failed, retry immediately on CPU
              if (!useCPU) {
                console.log("Retrying failed GPU transcription on CPU");
                exec(
                  `whisper ${job.filePath} --model base --device cpu --output_dir uploads --output_format txt ${languageFlag}`,
                  (cpuError) => {
                    if (cpuError) {
                      console.error("CPU fallback also failed:", cpuError);
                      reject(cpuError);
                    } else {
                      resolve();
                    }
                  }
                );
                return;
              }
            }
            reject(error);
          } else {
            resolve();
          }
        }
      );
    });
  }

  public getQueueStatus(): {
    queueLength: number;
    activeJobs: number;
    maxConcurrency: number;
    voskReady: boolean;
  } {
    return {
      queueLength: this.queue.length,
      activeJobs: this.currentProcessing,
      maxConcurrency: this.maxConcurrency,
      voskReady: this.voskReady,
    };
  }

  public getJobPosition(jobId: string): number {
    return this.queue.findIndex((job) => job.id === jobId);
  }

  public getGpuFailures(): number {
    return this.gpuFailures;
  }
}

// Create a singleton instance
export const transcriptionQueue = new TranscriptionQueue();
