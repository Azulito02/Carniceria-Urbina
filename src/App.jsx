import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Inicio from './views/Inicio';
import Productos from './views/Productos';
import Inventario from './views/Inventario';
import Clientes from './views/Clientes';
import './App.css';

import '@fortawesome/fontawesome-free/css/all.min.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/inventario" element={<Inventario />} />
           <Route path="/clientes" element={<Clientes />} />
          <Route path="*" element={<Inicio />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;