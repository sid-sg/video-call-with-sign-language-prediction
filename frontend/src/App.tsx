import { BrowserRouter, Route, Routes } from "react-router-dom"
import { VideoCall } from "./components/VideoCall"

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<VideoCall />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App