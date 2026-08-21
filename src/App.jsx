import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Inicio from './views/Inicio';
import Productos from './views/Productos';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="*" element={<Inicio />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;