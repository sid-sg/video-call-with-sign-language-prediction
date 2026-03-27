# Video Calling with Sign Language Recognition

A real-time video calling application with built-in sign language recognition. 

## Motivation

The main motivation behind making this project is to explore **WebRTC** and **in-browser machine learning** for real-time inference. This is achieved by running an ONNX model using **ONNX Runtime Web** via a Web Worker, ensuring high-performance inference without blocking the main UI thread.

## Tech Stack

### Frontend
- **React 19** (built with Vite)
- **TailwindCSS v4** (for styling)
- **WebRTC API** (for peer-to-peer video streaming and data channels)
- **ONNX Runtime Web** (for running the sign language detection model in a Web Worker)
- **MediaPipe** (for fast browser-based hand tracking and preprocessing)
- **Socket.IO Client** (for WebRTC signaling)
- **TypeScript**

### Backend
- **Node.js & Express**
- **Socket.IO** (signaling server for establishing WebRTC peer connections)
- **TypeScript**

## Local Project Setup

### 1. Clone the repository
```bash
git clone <your-repository-url>
cd video-calling-webrtc
```

### 2. Backend Setup
Open a terminal and navigate to the backend directory:
```bash
cd backend
```

Install dependencies:
```bash
npm install
```

Create a `.env` file in the `backend` directory and add your required API keys:
```env
METERED_API_KEY=your_metered_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

Start the backend development server:
```bash
npm run dev
```

### 3. Frontend Setup
Open a new terminal window or tab and navigate to the frontend directory:
```bash
cd frontend
```

Install dependencies:
```bash
npm install
```

Start the frontend development server:
```bash
npm run dev
```

The application should now be accessible in your web browser at the URL provided by the Vite server (typically `http://localhost:5173`).

## Machine Learning Model

The project includes a custom machine learning model for sign language detection. The training code and notebook are located in the `model` directory.

If you want to modify, train, or use your own custom model in the frontend:
1. Train or update the model using the resources in the `model` directory.
2. Export the trained model to the ONNX format (e.g., `landmark_model.onnx`).
3. Copy the exported `.onnx` model file alongside any matching class label files (like `landmark_classes.json`) into the `frontend/public/` directory. 

The web application will then automatically load your ONNX model from the public directory directly into the Web Worker for real-time inference.
