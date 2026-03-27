import { BrowserRouter, Route, Routes } from "react-router-dom"
import { VideoCall } from "./components/VideoCall"
import { useEffect } from "react"
import { preloadSignLanguageModels } from "./hooks/useSignLanguageDetection"

const App = () => {
  useEffect(() => {
    // Delay the heavy ML model preload by 2 seconds to allow 
    // initial UI rendering and WebRTC signaling to complete without lag.
    const timer = setTimeout(() => {
        preloadSignLanguageModels()
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<VideoCall />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App