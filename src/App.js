import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import Home from './componentsFront/Home';
import Login from './componentsFront/Login';
import Dashboard from './componentsFront/Dashboard';
import CadastroBueiros from './componentsFront/CadastroBueiros';
import AtualizarStatus from './componentsFront/AtualizarStatus';
import MonitoramentoCidadao from './componentsFront/MonitoramentoCidadao';

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
        <Route path="/monitoramento-cidadao" element={<MonitoramentoCidadao />} />

        <Route
          path="/dashboard"
          element={<PrivateRoute element={<Dashboard />} />}
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
