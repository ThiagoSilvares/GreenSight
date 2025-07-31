import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './componentsFront/Home';
import Login from './componentsFront/Login';
import Dashboard from './componentsFront/Dashboard';

// Componente de rota privada
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
        <Route
          path="/dashboard"
          element={<PrivateRoute element={<Dashboard />} />}
        />
      </Routes>
    </Router>
  );
}

export default App;
