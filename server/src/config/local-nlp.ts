import { SentimentAnalyzer, PorterStemmer, Stopwords } from 'node-nlp';
import { LogisticRegressionClassifier, BayesClassifier } from 'natural';

// Initialize the sentiment analyzer for key phrase extraction 
const sentimentAnalyzer = new SentimentAnalyzer({ language: 'en' });
const classifier = new BayesClassifier();

// Utility function to extract key sentences
const extractKeySentences = (text: string, limit: number = 5): string[] => {
  // Split text into sentences
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  if (sentences.length <= limit) {
    return sentences;
  }
  
  // Score sentences based on word importance
  const sentenceScores: {text: string, score: number}[] = [];
  
  for (const sentence of sentences) {
    // Skip very short sentences
    if (sentence.trim().split(/\s+/).length < 4) continue;
    
    // Calculate sentiment score as a proxy for sentence importance
    const analysis = sentimentAnalyzer.getSentiment(sentence);
    
    // Calculate word frequency importance
    const words = sentence.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    
    // Score based on unique words and sentiment intensity
    const score = (uniqueWords.size / words.length) * Math.abs(analysis) * sentence.length;
    
    sentenceScores.push({
      text: sentence.trim(),
      score
    });
  }
  
  // Sort by score and take the top N sentences
  const topSentences = sentenceScores
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.text);
  
  return topSentences;
};

// Generate a simple one-liner summary
const generateOneLiner = (text: string): string => {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Use the first sentence if it's reasonably sized
  if (sentences.length > 0) {
    const firstSentence = sentences[0].trim();
    if (firstSentence.split(/\s+/).length >= 5 && firstSentence.split(/\s+/).length <= 20) {
      return firstSentence;
    }
  }
  
  // Extract key phrases for a synthesized one-liner
  const keySentences = extractKeySentences(text, 1);
  if (keySentences.length > 0) {
    // Truncate if too long
    let oneLiner = keySentences[0];
    if (oneLiner.split(/\s+/).length > 15) {
      oneLiner = oneLiner.split(/\s+/).slice(0, 15).join(' ') + '...';
    }
    return oneLiner;
  }
  
  return "A conversation was recorded.";
};

// Main function to generate summary using local NLP processing
export const generateLocalSummary = async (transcript: string): Promise<{ summary: string; oneLiner: string }> => {
  try {
    console.log("Generating summary using local NLP processing...");
    
    // Generate one-liner
    const oneLiner = generateOneLiner(transcript);
    
    // Generate summary from key sentences
    const keySentences = extractKeySentences(transcript, 7);
    const summary = keySentences.join('. ');
    
    return {
      oneLiner,
      summary
    };
  } catch (error) {
    console.error("Error generating local summary:", error);
    return {
      oneLiner: "A conversation was recorded.",
      summary: "The system was unable to generate a summary for this transcript."
    };
  }
};

// Local implementation for memory chatbot queries
export const processLocalMemoryQuery = (query: string, memories: any[]): string => {
  try {
    // Simple keyword matching for memory search
    const queryKeywords = query.toLowerCase().split(/\s+/);
    
    // Score memories based on keyword matches
    const scoredMemories = memories.map(memory => {
      const content = `${memory.oneLiner} ${memory.summary} ${memory.transcript}`.toLowerCase();
      let score = 0;
      
      // Count keyword matches
      for (const keyword of queryKeywords) {
        if (keyword.length <= 3) continue; // Skip short words
        if (content.includes(keyword)) {
          score += 1;
        }
      }
      
      return {
        memory,
        score
      };
    });
    
    // Sort by score and get the top 3
    const topMemories = scoredMemories
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .filter(m => m.score > 0)
      .map(m => m.memory);
    
    if (topMemories.length === 0) {
      return "I don't have any memories that match your question.";
    }
    
    // Compose a response using the top memories
    let response = "Based on your recorded memories:\n\n";
    
    topMemories.forEach((memory, index) => {
      const date = new Date(memory.timestamp).toLocaleDateString();
      response += `Memory from ${date}: ${memory.oneLiner || 'No one-liner available'}\n`;
      response += `${memory.summary || 'No detailed summary available'}\n\n`;
    });
    
    return response.trim();
  } catch (error) {
    console.error("Error processing local memory query:", error);
    return "I'm sorry, I couldn't process your question due to a technical issue.";
  }
};

// Utility function to determine if query is about time/date
export const isTimeQuery = (query: string): boolean => {
  const timeKeywords = ['when', 'time', 'date', 'day', 'month', 'year', 'morning', 'afternoon', 'evening'];
  const queryLower = query.toLowerCase();
  
  return timeKeywords.some(keyword => queryLower.includes(keyword));
}; 