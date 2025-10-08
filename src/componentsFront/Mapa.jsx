import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaBars,
  FaTimes,
  FaMapMarkedAlt,
  FaRegCommentDots,
  FaSignOutAlt,
  FaPlus,
  FaChartBar,
  FaSearch,
  FaBroom
} from 'react-icons/fa';
import LogoEscrita from '../assets/LogoEscritaGreenSight.png';
import MapComponent from './MapComponent';

const year = new Date().getFullYear();

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
  const [navOpen, setNavOpen] = useState(false);

  const [latInput, setLatInput] = useState('');
  const [lonInput, setLonInput] = useState('');
  const pontosRef = useRef([]); 
  const [flyTo, setFlyTo] = useState(null); 
  const [highlightedId, setHighlightedId] = useState(null);
  const [toast, setToast] = useState(null); 

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

  useEffect(() => {
    const onScroll = () => setNavOpen(false);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const distMeters = (lat1, lon1, lat2, lon2) => {
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const showToast = (text, type = 'warn', ms = null) => {
    setToast({ text, type });
    if (typeof ms === 'number') {
      setTimeout(() => setToast(null), ms);
    }
  };

  const handleBuscar = (e) => {
    e?.preventDefault?.();
    const lat = parseFloat(latInput);
    const lon = parseFloat(lonInput);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      showToast('Informe latitude e longitude válidas.', 'warn', 2200);
      return;
    }

    const pts = pontosRef.current || [];
    if (!pts.length) {
      showToast('Mapa ainda carregando. Tente novamente.', 'warn', 2200);
      return;
    }

    let best = null;
    let bestD = Infinity;
    for (const p of pts) {
      const d = distMeters(lat, lon, p.lat, p.lon);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }

    const LIMITAR_METROS = 5;
    if (best && bestD <= LIMITAR_METROS) {
      setHighlightedId(best.id ?? `${best.lat},${best.lon}`);
      setFlyTo({ lat: best.lat, lon: best.lon, zoom: 18 });
      setToast(null);
    } else {
      setHighlightedId(null);
      setFlyTo(null);
      showToast('Bueiro não encontrado nesta localização', 'warn', null);
    }
  };

  const handleLimpar = () => {
    setLatInput('');
    setLonInput('');
    setHighlightedId(null);
    setToast(null);
    setFlyTo({ lat: MAP_CENTER[0], lon: MAP_CENTER[1], zoom: 13.5 });
  };

  return (
    <div className="bg-black min-h-screen text-white font-sans">
      <header className="bg-black/70 backdrop-blur-md fixed top-0 w-full z-50 px-4 md:px-8 py-3 flex items-center justify-between shadow-md">
        <Link to="/" className="focus:outline-none">
          <img
            src={LogoEscrita}
            alt="Logo Escrita Green Sight"
            className="h-10 md:h-14 w-auto object-contain cursor-pointer"
          />
        </Link>

        <nav className="hidden md:flex space-x-8 text-base font-medium tracking-wide text-zinc-100">
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

        <button
          aria-label={navOpen ? 'Fechar menu' : 'Abrir menu'}
          onClick={() => setNavOpen((v) => !v)}
          className="md:hidden text-zinc-100 focus:outline-none"
        >
          {navOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
        </button>

        <div
          className={`md:hidden absolute left-0 right-0 top-full bg-black/95 border-t border-zinc-800 ${
            navOpen ? 'block' : 'hidden'
          }`}
        >
          <ul className="flex flex-col gap-1 px-4 py-3 text-zinc-100">
            <li>
              <Link
                to="/mapa"
                onClick={() => setNavOpen(false)}
                className="flex items-center gap-2 py-2 hover:text-green-500"
              >
                <FaMapMarkedAlt /> Mapa
              </Link>
            </li>
            <li>
              <Link
                to="/relatos"
                onClick={() => setNavOpen(false)}
                className="flex items-center gap-2 py-2 hover:text-green-500"
              >
                <FaRegCommentDots /> Relatos
              </Link>
            </li>
            <li>
              <Link
                to="/graficos"
                onClick={() => setNavOpen(false)}
                className="flex items-center gap-2 py-2 hover:text-green-500"
              >
                <FaChartBar /> Gráficos
              </Link>
            </li>
          </ul>
        </div>
      </header>

      <div className="pt-20 md:pt-24 flex">
        <div className={`hidden md:block ${sidebarAberta ? 'w-64' : 'w-16'} bg-black transition-all duration-300 min-h-screen p-4`}>
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

        <div
          className={`md:hidden fixed inset-y-0 left-0 w-64 bg-black p-4 z-50 transform transition-transform duration-300 ${
            sidebarAberta ? 'translate-x-0' : '-translate-x-full'
          }`}
          role="dialog"
          aria-label="Menu lateral"
        >
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setSidebarAberta(false)} className="text-green-400" aria-label="Fechar menu lateral">
              <FaTimes size={24} />
            </button>
          </div>
          <ul className="space-y-6 text-lg">
            <li
              onClick={() => {
                setSidebarAberta(false);
                navigate('/cadastro-bueiros');
              }}
              className="hover:text-green-400 cursor-pointer flex items-center gap-3"
            >
              <FaPlus size={20} /> Cadastro de Bueiros
            </li>
            <li
              onClick={() => {
                setSidebarAberta(false);
                setMostrarConfirmacaoLogout(true);
              }}
              className="hover:text-green-400 cursor-pointer flex items-center gap-3"
            >
              <FaSignOutAlt size={20} /> Sair
            </li>
          </ul>
        </div>

        {sidebarAberta && (
          <div className="md:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setSidebarAberta(false)} />
        )}
        <main className="flex-1 p-4 md:p-10">
          <div className="md:hidden grid grid-cols-[40px_1fr_40px] items-center mb-1">
            <button
              onClick={() => setSidebarAberta(true)}
              className="justify-self-start text-green-400 p-2 rounded-md"
              aria-label="Abrir menu lateral"
            >
              <FaBars size={20} />
            </button>
            <h1 className="text-3xl font-bold leading-tight text-center col-start-2">
              Central de Monitoramento
            </h1>
            <span />
          </div>
          <div className="md:hidden mt-2 mb-6 flex justify-center">
            <span className="border px-3 py-1 rounded-md text-xs">Administrador</span>
          </div>

          <div className="hidden md:flex items-center justify-between mb-6 md:mb-8">
            <h1 className="text-5xl font-bold leading-tight">Central de Monitoramento</h1>
            <span className="border px-3 py-1 rounded-md text-sm">Administrador</span>
          </div>

          <form
            onSubmit={handleBuscar}
            className="mb-3"
          >
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl px-3 py-3 md:px-4 md:py-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-2">
                <div className="w-full md:w-auto">
                  <div className="flex items-center bg-black/60 border border-zinc-700 rounded-xl px-3 h-10 text-sm focus-within:border-green-500 transition-colors">
                    <span className="mr-2 text-zinc-400 select-none">Lat</span>
                    <input
                      aria-label="Latitude"
                      value={latInput}
                      onChange={(e) => setLatInput(e.target.value)}
                      inputMode="decimal"
                      placeholder="-23.55"
                      className="bg-transparent outline-none w-full md:w-44"
                    />
                  </div>
                </div>

                <div className="hidden md:block text-zinc-700">•</div>

                <div className="w-full md:w-auto">
                  <div className="flex items-center bg-black/60 border border-zinc-700 rounded-xl px-3 h-10 text-sm focus-within:border-green-500 transition-colors">
                    <span className="mr-2 text-zinc-400 select-none">Lon</span>
                    <input
                      aria-label="Longitude"
                      value={lonInput}
                      onChange={(e) => setLonInput(e.target.value)}
                      inputMode="decimal"
                      placeholder="-46.63"
                      className="bg-transparent outline-none w-full md:w-44"
                    />
                  </div>
                </div>

                <div className="flex-1" />

                <div className="flex gap-2 justify-start md:justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-green-600 hover:bg-green-700 font-semibold text-sm transition-colors"
                  >
                    <FaSearch />
                    Buscar
                  </button>
                  <button
                    type="button"
                    onClick={handleLimpar}
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 font-semibold text-sm transition-colors"
                  >
                    <FaBroom />
                    Limpar
                  </button>
                </div>
              </div>
            </div>
          </form>

          {toast?.text && (
            <div className="mb-4 text-sm text-red-400">
              {toast.text}
            </div>
          )}

          <div className="bg-zinc-800 rounded-lg overflow-hidden relative z-0">
            <MapComponent
              bueiros={bueirosMapa}
              markerColor="#3b82f6"
              highlightColor="#22c55e"
              highlightedId={highlightedId}
              flyTo={flyTo}
              onPointsLoaded={(pts) => {
                pontosRef.current = pts || [];
              }}
            />
          </div>

          <div className="mt-6 flex justify-center text-sm text-zinc-300">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              Bueiros Cadastrados
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 max-[380px]:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {cards.map(([titulo, valor], index) => (
              <div
                key={index}
                className="bg-zinc-800 p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow flex flex-col justify-between min-h-[96px]"
              >
                <p className="text-zinc-300 text-xs sm:text-sm">{titulo}</p>
                <p className="text-green-400 text-2xl sm:text-3xl font-bold mt-1 sm:mt-2 break-words">
                  {valor}
                </p>
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
                onClick={() => {
                  handleLogout();
                  setMostrarConfirmacaoLogout(false);
                }}
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

      <footer className="bg-black text-zinc-400 text-sm border-t border-zinc-700">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
          <div className="flex flex-col items-center gap-4 sm:gap-6 md:grid md:grid-cols-3 md:items-start">
            <div className="order-2 md:order-1 text-center md:text-left">
              <p className="font-semibold">© {year} GREEN SIGHT</p>
              <p>Todos os direitos reservados.</p>
            </div>
            <div className="order-1 md:order-2 text-center italic text-zinc-300 px-4">
              Um projeto de TCC para um futuro mais sustentável.
            </div>
            <div className="order-3 md:order-3 w-full">
              <nav className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-2">
                <a href="#" className="hover:text-white inline-block py-1 px-2">Privacidade</a>
                <a href="#" className="hover:text-white inline-block py-1 px-2">Termos de Uso</a>
              </nav>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Mapa;
