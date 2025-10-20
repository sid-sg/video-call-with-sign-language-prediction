import { BrowserRouter, Route, Routes } from "react-router-dom"
import { VideoCall } from "./components/VideoCall"

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/caller" element={<VideoCall />} />
        <Route path="/callee" element={<VideoCall />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App