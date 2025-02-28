# Remote Desktop Tool

A browser-based remote desktop tool using Next.js, WebRTC, and WebSockets for screen sharing and remote control.

## Features

- Screen sharing with WebRTC
- Remote mouse and keyboard control
- Real-time communication via WebSockets
- Peer-to-peer connection for low latency
- Simple connection via unique IDs

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Communication**: WebRTC, Socket.io
- **Backend**: Node.js, Express

## Setup

### Prerequisites

- Node.js (v16+)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd speedtester
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Create a `.env.local` file:
   ```
   NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
   ```

### Running Locally

1. Start the signaling server:
   ```bash
   npm run server
   # or
   yarn server
   ```

2. In a separate terminal, start the Next.js development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Sharing Your Screen (Host)

1. On the main page, click "Generate Connection ID"
2. Share the generated ID with someone who needs to control your computer
3. Click "Start Sharing" to begin the session
4. When prompted by your browser, select the screen or application you want to share

### Controlling a Remote Screen (Viewer)

1. Enter the Connection ID provided by the host
2. Click "Connect" to join the session
3. Once connected, click "Enable Remote Control" to control the host's computer
4. Use your mouse and keyboard to control the remote computer

## Deployment

### Frontend (Next.js)

Deploy the frontend on Vercel:

1. Push your repository to GitHub
2. Import the repository on Vercel
3. Set the environment variable `NEXT_PUBLIC_SOCKET_URL` to your signaling server URL

### Signaling Server

Deploy the signaling server on Railway:

1. Create a new service on Railway using the GitHub repository
2. Configure the service to run the command: `node server.js`
3. Set the environment variable `FRONTEND_URL` to your frontend URL (for CORS)

## Limitations

- Actual remote control requires browser extensions or native applications for complete mouse/keyboard simulation
- The current implementation is a demonstration of the concept and works within the browser's security constraints
- For production use, additional security measures like authentication would be required

## License

MIT
