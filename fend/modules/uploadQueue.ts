import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";

import { API_URL } from "../services/config";
interface QueueItem {
  id: string;
  uri: string;
  username: string;
  retries: number;
  status: "pending" | "processing" | "failed" | "completed";
  timestamp: number;
}

class UploadQueue {
  private static instance: UploadQueue;
  private queue: QueueItem[] = [];
  private isProcessing: boolean = false;
  private maxRetries: number = 4;
  private STORAGE_KEY = "@upload_queue";
  private listeners: Set<(queue: QueueItem[]) => void> = new Set();

  private constructor() {
    this.loadQueue();
  }

  public static getInstance(): UploadQueue {
    if (!UploadQueue.instance) {
      UploadQueue.instance = new UploadQueue();
    }
    return UploadQueue.instance;
  }

  private async loadQueue() {
    try {
      const savedQueue = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (savedQueue) {
        this.queue = JSON.parse(savedQueue);
        this.notifyListeners();
        this.processQueue();
      }
    } catch (error) {
      console.error("Error loading queue:", error);
    }
  }

  private async saveQueue() {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.queue));
      this.notifyListeners();
    } catch (error) {
      console.error("Error saving queue:", error);
    }
  }

  public addListener(callback: (queue: QueueItem[]) => void) {
    this.listeners.add(callback);
    callback(this.queue); // Initial call with current state
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.queue));
  }

  public async addToQueue(uri: string, username: string): Promise<string> {
    const id = `upload_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const item: QueueItem = {
      id,
      uri,
      username,
      retries: 0,
      status: "pending",
      timestamp: Date.now(),
    };

    this.queue.push(item);
    await this.saveQueue();

    if (!this.isProcessing) {
      this.processQueue();
    }

    return id;
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const item = this.queue[0];
    item.status = "processing";
    await this.saveQueue();

    try {
      await this.uploadAudio(item);

      // Success
      this.queue.shift();
      item.status = "completed";
      
      // Delete the audio file after successful upload
      try {
        await this.deleteAudioFile(item.uri);
        console.log(`Successfully deleted audio file: ${item.uri}`);
      } catch (deleteError) {
        console.error(`Failed to delete audio file ${item.uri}:`, deleteError);
        // Continue even if deletion fails - this is non-critical
      }
      
      await this.saveQueue();
    } catch (error) {
      console.error(`Upload failed for ${item.id}:`, error);

      if (item.retries < this.maxRetries - 1) {
        // Move to end of queue for retry
        item.retries++;
        item.status = "pending";
        this.queue.push(this.queue.shift()!);
        await this.saveQueue();
      } else {
        // Max retries reached
        this.queue.shift();
        item.status = "failed";
        
        // Delete the failed audio file to free up space
        try {
          await this.deleteAudioFile(item.uri);
          console.log(`Deleted failed audio file after max retries: ${item.uri}`);
        } catch (deleteError) {
          console.error(`Failed to delete failed audio file ${item.uri}:`, deleteError);
          // Continue even if deletion fails
        }
        
        await this.saveQueue();
      }
    } finally {
      this.isProcessing = false;

      // Process next item after a delay
      setTimeout(() => {
        this.processQueue();
      }, 1000);
    }
  }

  private async deleteAudioFile(uri: string): Promise<void> {
    if (!uri) {
      console.warn("Attempted to delete file with empty URI");
      return;
    }
    
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } else {
        console.log(`File does not exist: ${uri}`);
      }
    } catch (error) {
      console.error(`Error deleting file ${uri}:`, error);
      throw error;
    }
  }

  private async uploadAudio(item: QueueItem): Promise<void> {
    const maxRetries = this.maxRetries;
    const baseDelay = 1000; // Start with 1 second delay

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Add a small delay before each upload attempt
        if (attempt > 0) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.log(
            `Waiting ${delay}ms before retry attempt ${attempt + 1}...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        const formData = new FormData();
        formData.append("audio", {
          uri: item.uri,
          name: `audio_${Date.now()}.m4a`,
          type: "audio/m4a",
        } as any);
        formData.append("username", item.username);
        formData.append("language", "en-in");

        console.log(
          `Uploading file attempt ${attempt + 1}/${maxRetries + 1}...`
        );
        const response = await fetch(`${API_URL}/transcribe`, {
          method: "POST",
          body: formData,
          headers: {
            Accept: "application/json",
            Connection: "keep-alive",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `Upload failed with status ${response.status}:`,
            errorText
          );
          throw new Error(
            `HTTP error! status: ${response.status} - ${errorText}`
          );
        }

        const data = await response.json();
        console.log("Upload successful:", data);
        return data;
      } catch (error) {
        console.log(`Upload attempt ${attempt + 1} failed:`, error);
        const isLastAttempt = attempt === maxRetries;
        if (isLastAttempt) {
          throw error;
        }
      }
    }
  }

  public getQueueStatus(): QueueItem[] {
    return [...this.queue];
  }

  public getItemStatus(id: string): QueueItem | undefined {
    return this.queue.find((item) => item.id === id);
  }

  public async clearFailedUploads() {
    // Get failed items to delete their files
    const failedItems = this.queue.filter((item) => item.status === "failed");
    
    // Delete audio files for failed uploads
    for (const item of failedItems) {
      try {
        await this.deleteAudioFile(item.uri);
        console.log(`Deleted audio file from failed upload: ${item.uri}`);
      } catch (error) {
        console.error(`Failed to delete audio file from failed upload ${item.uri}:`, error);
      }
    }
    
    // Remove failed items from queue
    this.queue = this.queue.filter((item) => item.status !== "failed");
    this.saveQueue();
  }
}

export const uploadQueue = UploadQueue.getInstance();
