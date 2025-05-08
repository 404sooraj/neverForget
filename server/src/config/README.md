# Local NLP Model for Never Forget

## Overview
This module provides a lightweight, open-source, local alternative to cloud-based AI services for the Never Forget application. By using Node.js-native NLP libraries, we eliminate the need for external API keys and dependencies on third-party services.

## Features
- **Text Summarization**: Extracts key sentences from transcripts to create concise summaries
- **One-liner Generation**: Creates brief, single-sentence summaries of conversations
- **Memory Query Processing**: Keyword-based retrieval of relevant memories
- **Time-based Query Handling**: Special processing for questions about when events occurred

## Implementation
The system uses a combination of:
- Sentiment analysis to identify important sentences
- Keyword extraction for memory retrieval
- Statistical methods for sentence importance scoring

## Benefits
- **Privacy**: All processing happens locally, no data sent to external services
- **Cost**: Eliminates usage costs associated with cloud AI services
- **Offline Operation**: Works without internet connection
- **Customization**: Easier to tune for specific application needs

## Dependencies
- `node-nlp`: For sentiment analysis and basic NLP functions
- `natural`: For additional text processing capabilities

## Usage
The module exposes the following main functions:
- `generateLocalSummary(transcript)`: Generates summary from a transcript
- `processLocalMemoryQuery(query, memories)`: Processes user queries against stored memories
- `isTimeQuery(query)`: Detects if a query is asking about time/dates

## Performance Considerations
While not as sophisticated as cloud-based models like Gemini, this implementation provides reasonable quality for most use cases while maintaining much lower latency and resource requirements. 