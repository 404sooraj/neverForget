import { exec } from "child_process";
import { EventEmitter } from "events";

interface TranscriptionJob {
  id: string;
  filePath: string;
  username: string;
  retries: number;
  maxRetries: number;
  onComplete: (error: Error | null, result?: any) => void;
}

class TranscriptionQueue {
  private queue: TranscriptionJob[] = [];
  private isProcessing: boolean = false;
  private events: EventEmitter;

  constructor() {
    this.events = new EventEmitter();
    this.events.on('processNext', this.processNext.bind(this));
  }

  public async addJob(
    filePath: string,
    username: string,
    onComplete: (error: Error | null, result?: any) => void,
    maxRetries: number = 3
  ): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: TranscriptionJob = {
      id: jobId,
      filePath,
      username,
      retries: 0,
      maxRetries,
      onComplete,
    };

    this.queue.push(job);
    console.log(`Added job ${jobId} to queue. Queue length: ${this.queue.length}`);

    if (!this.isProcessing) {
      this.events.emit('processNext');
    }

    return jobId;
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const job = this.queue[0];

    try {
      console.log(`Processing job ${job.id}. Attempt ${job.retries + 1} of ${job.maxRetries + 1}`);
      await this.processTranscription(job);
      
      // If successful, remove the job from queue
      this.queue.shift();
      job.onComplete(null);
      console.log(`Job ${job.id} completed successfully`);
    } catch (error) {
      console.error(`Error processing job ${job.id}:`, error);
      
      if (job.retries < job.maxRetries) {
        // Move the job to the end of the queue for retry
        job.retries++;
        this.queue.push(this.queue.shift()!);
        console.log(`Job ${job.id} will be retried. Attempt ${job.retries + 1} of ${job.maxRetries + 1}`);
      } else {
        // Remove the job if max retries reached
        this.queue.shift();
        job.onComplete(new Error(`Failed after ${job.maxRetries + 1} attempts`));
        console.log(`Job ${job.id} failed after ${job.maxRetries + 1} attempts`);
      }
    } finally {
      this.isProcessing = false;
      
      // Process next job if queue is not empty
      if (this.queue.length > 0) {
        setTimeout(() => {
          this.events.emit('processNext');
        }, 1000); // Add a small delay between jobs
      }
    }
  }

  private processTranscription(job: TranscriptionJob): Promise<void> {
    return new Promise((resolve, reject) => {
      const outputTxt = `${job.filePath}.txt`;

      exec(
        `whisper ${job.filePath} --model base --output_dir uploads`,
        (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        }
      );
    });
  }

  public getQueueStatus(): { queueLength: number; isProcessing: boolean } {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
    };
  }

  public getJobPosition(jobId: string): number {
    return this.queue.findIndex(job => job.id === jobId);
  }
}

// Create a singleton instance
export const transcriptionQueue = new TranscriptionQueue(); 