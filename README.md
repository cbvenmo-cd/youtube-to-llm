# YouTube To LLM

YouTube To LLM is a web application that extracts metadata and transcripts from YouTube videos, making them easily accessible for Large Language Models (LLMs) and other applications.

## Features

- Extract video metadata (title, description, duration, etc.)
- Download video transcripts/captions
- Export data in JSON format
- Secure API key authentication
- Previous analyses history
- Clean, user-friendly interface

## Technology Stack

- **Backend**: Node.js with Express
- **Database**: PostgreSQL with Prisma ORM
- **Frontend**: Vanilla JavaScript, HTML, CSS
- **Deployment**: Fly.io
- **Video Processing**: yt-dlp

## Deployment

The application is deployed at: https://youtube-to-llm.fly.dev

## Local Development

1. Clone the repository
2. Copy `.env.example` to `.env` and configure your environment variables
3. Install dependencies: `npm install`
4. Run database migrations: `npm run db:migrate`
5. Start the development server: `npm run dev`

## License

MIT
