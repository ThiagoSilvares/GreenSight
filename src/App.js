import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import Home from './componentsFront/Home';
import Login from './componentsFront/Login';
import Mapa from './componentsFront/Mapa';
import CadastroBueiros from './componentsFront/CadastroBueiros';
import AtualizarStatus from './componentsFront/AtualizarStatus';
import Relatos from './componentsFront/Relatos';
import Graficos from './componentsFront/Graficos'

const PrivateRoute = ({ element }) => {
  const isUsuarioLogado = !!localStorage.getItem('usuarioLogado');
  return isUsuarioLogado ? element : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/relatos" element={<Relatos />} />
        <Route path="/graficos" element={<Graficos />} />

        <Route
          path="/mapa"
          element={<PrivateRoute element={<Mapa />} />}
        />
        <Route
          path="/cadastro-bueiros"
          element={<PrivateRoute element={<CadastroBueiros />} />}
        />
        <Route
          path="/atualizar-status" 
          element={<PrivateRoute element={<AtualizarStatus />} />}
        />
      </Routes>
    </Router>
  );
}

export default App;
