import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaBars,
  FaTimes,
  FaMapMarkedAlt,
  FaRegCommentDots,
  FaFileAlt,
  FaSignOutAlt,
  FaPlus,
  FaChartBar
} from 'react-icons/fa';
import LogoEscrita from '../assets/LogoEscritaGreenSight.png';
import MapComponent from './MapComponent';

const MAP_CENTER = [-23.64601, -46.57590]; 

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  process.env.REACT_APP_API_BASE_URL ||
  (typeof window !== 'undefined' && window.__API_BASE__) ||
  'http://localhost:3001';

const API = `${String(API_BASE).replace(/\/$/, '')}/api`;

const Mapa = () => {
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [dadosResumo, setDadosResumo] = useState(null);
  const [bueirosMapa, setBueirosMapa] = useState([]);
  const [zonas, setZonas] = useState({ norte: 0, sul: 0, leste: 0, oeste: 0 });
  const [mostrarConfirmacaoLogout, setMostrarConfirmacaoLogout] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const logado = localStorage.getItem('usuarioLogado');
    const usuarioSalvo = JSON.parse(localStorage.getItem('usuario'));
    if (!logado || !usuarioSalvo) navigate('/login');
  }, [navigate]);

  useEffect(() => {
    fetch(`${API}/resumo`)
      .then((res) => res.json())
      .then((data) => setDadosResumo(data))
      .catch((err) => console.error('Erro ao buscar resumo:', err));
  }, []);

  useEffect(() => {
    fetch(`${API}/bueiros`)
      .then((res) => res.json())
      .then((data) => setBueirosMapa(data))
      .catch((err) => console.error('Erro ao buscar bueiros do mapa:', err));
  }, []);

  useEffect(() => {
    const [lat0, lon0] = MAP_CENTER;
    fetch(`${API}/bueiros/por-zona?lat0=${lat0}&lon0=${lon0}`)
      .then((r) => r.json())
      .then((rows) => {
        const z = { norte: 0, sul: 0, leste: 0, oeste: 0, outros: 0 };
        rows?.forEach((x) => {
          const nome = (x.zona || '').toString();
          if (/norte/i.test(nome)) z.norte += x.total ?? 0;
          else if (/sul/i.test(nome)) z.sul += x.total ?? 0;
          else if (/leste/i.test(nome)) z.leste += x.total ?? 0;
          else if (/oeste/i.test(nome)) z.oeste += x.total ?? 0;
          else z.outros += x.total ?? 0;
        });
        setZonas(z);
      })
      .catch((err) => console.error('Erro ao buscar por zona:', err));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('usuarioLogado');
    localStorage.removeItem('usuario');
    navigate('/');
  };

  const cards = [
    ['Total de Bueiros Cadastrados', dadosResumo?.total_mapeados ?? 0],
    ['Novos nos Últimos 30 dias', dadosResumo?.novos_30d ?? 0],
    ['Zona Norte', zonas.norte],
    ['Zona Sul', zonas.sul],
    ['Zona Leste', zonas.leste],
    ['Zona Oeste', zonas.oeste],
  ];

  return (
    <div className="bg-black min-h-screen text-white font-sans">
      <header className="bg-black/70 backdrop-blur-md fixed top-0 w-full z-50 px-8 py-4 flex justify-between items-center shadow-md">
        <Link to="/" className="focus:outline-none">
          <img src={LogoEscrita} alt="Logo Escrita Green Sight" className="h-14 w-auto object-contain cursor-pointer" />
        </Link>

        <nav className="space-x-8 text-sm md:text-base font-medium tracking-wide text-zinc-100">
          <Link to="/mapa" className="hover:text-green-500 transition-all duration-200 font-bold">
            <FaMapMarkedAlt className="inline mr-1" /> Mapa
          </Link>
          <Link to="/relatos" className="hover:text-green-500 transition-all duration-200">
            <FaRegCommentDots className="inline mr-1" /> Relatos
          </Link>
          <Link to="/graficos" className="hover:text-green-500 transition-all duration-200">
            <FaChartBar className="inline mr-1" /> Gráficos
          </Link>
        </nav>
      </header>

      <div className="pt-24 flex">
        <div className={`${sidebarAberta ? 'w-64' : 'w-16'} bg-black transition-all duration-300 min-h-screen p-4`}>
          <button onClick={() => setSidebarAberta(!sidebarAberta)} className="mb-6 text-green-400">
            {sidebarAberta ? <FaTimes size={28} /> : <FaBars size={28} />}
          </button>
          {sidebarAberta && (
            <ul className="space-y-8 mt-6 text-lg">
              <li
                onClick={() => navigate('/cadastro-bueiros')}
                className="hover:text-green-400 cursor-pointer flex items-center gap-3"
              >
                <FaPlus size={20} /> Cadastro de Bueiros
              </li>
              <li
                onClick={() => setMostrarConfirmacaoLogout(true)}
                className="hover:text-green-400 cursor-pointer flex items-center gap-3"
              >
                <FaSignOutAlt size={20} /> Sair
              </li>
            </ul>
          )}
        </div>

        <main className="flex-1 p-10">
          <div className="flex justify-between items-center mb-12">
            <h1 className="text-3xl md:text-5xl font-bold">Central de Monitoramento</h1>
            <span className="border px-3 py-1 rounded-md text-sm">Administrador</span>
          </div>

          <div className="bg-zinc-800 rounded-lg overflow-hidden relative z-0">
            <MapComponent bueiros={bueirosMapa} markerColor="#3b82f6" />
          </div>

          <div className="mt-6 flex justify-center text-sm text-zinc-300">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span> Bueiros Cadastrados
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map(([titulo, valor], index) => (
              <div key={index} className="bg-zinc-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <p className="text-zinc-300 text-sm">{titulo}</p>
                <p className="text-green-400 text-3xl font-bold mt-2">{valor}</p>
              </div>
            ))}
          </div>
        </main>
      </div>

      {mostrarConfirmacaoLogout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-zinc-900 p-6 rounded-lg shadow-lg text-center">
            <p className="text-white text-lg mb-4">Deseja realmente encerrar sua sessão?</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => { handleLogout(); setMostrarConfirmacaoLogout(false); }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
              >
                Sim
              </button>
              <button
                onClick={() => setMostrarConfirmacaoLogout(false)}
                className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded"
              >
                Não
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-black text-gray-400 text-sm py-6 border-t border-gray-700 px-6 mt-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-center md:text-left">
          <div className="text-left">
            <p className="font-semibold">© 2025 GREEN SIGHT</p>
            <p>Todos os direitos reservados.</p>
          </div>
          <div className="text-center">
            <p className="italic">Um projeto de TCC para um futuro mais sustentável.</p>
          </div>
          <div className="flex justify-center md:justify-end space-x-6">
            <a href="#" className="hover:text-white">Privacidade</a>
            <a href="#" className="hover:text-white">Termos de Uso</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Mapa;
