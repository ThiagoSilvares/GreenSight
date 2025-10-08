import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FaMapMarkedAlt,
  FaRegCommentDots,
  FaMapMarkerAlt,
  FaChartBar,
  FaBars,
  FaTimes,
  FaUser,
  FaPlus,
  FaSignOutAlt,
} from 'react-icons/fa';
import LogoEscrita from '../assets/LogoEscritaGreenSight.png';

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  process.env.REACT_APP_API_BASE_URL ||
  (typeof window !== 'undefined' && window.__API_BASE__) ||
  'http://localhost:3001';

const API = `${String(API_BASE).replace(/\/$/, '')}/api`;
const year = new Date().getFullYear();

const CadastroBueiros = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isUsuarioLogado = !!localStorage.getItem('usuarioLogado');

  const isActive = (path) =>
    location.pathname === path ? 'text-green-500' : 'hover:text-green-500';

  const [navOpen, setNavOpen] = useState(false);
  const [mostrarConfirmacaoLogout, setMostrarConfirmacaoLogout] = useState(false);

  const [formData, setFormData] = useState({
    latitude: '',
    longitude: '',
  });

  const [imagem, setImagem] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [bueirosExistentes, setBueirosExistentes] = useState([]);

  useEffect(() => {
    fetch(`${API}/bueiros`)
      .then(res => res.json())
      .then(data => setBueirosExistentes(data))
      .catch(err => console.error('Erro ao buscar bueiros existentes:', err));
  }, []);

  useEffect(() => {
    const onScroll = () => setNavOpen(false);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImagemChange = (e) => {
    setImagem(e.target.files[0] || null);
  };

  const toNum = (v) => {
    if (typeof v !== 'string') return parseFloat(v);
    return parseFloat(v.replace(',', '.'));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const lat = toNum(formData.latitude);
    const lon = toNum(formData.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setMensagem('Latitude e longitude devem ser números válidos.');
      return;
    }

    const bueiroDuplicado = bueirosExistentes.some(b =>
      Number(b.latitude) === lat && Number(b.longitude) === lon
    );
    if (bueiroDuplicado) {
      setMensagem('Este bueiro já está cadastrado.');
      return;
    }

    const data = new FormData();
    data.append('latitude', String(lat));
    data.append('longitude', String(lon));
    if (imagem) data.append('imagem', imagem);

    try {
      const resposta = await fetch(`${API}/bueiros`, {
        method: 'POST',
        body: data,
      });

      if (resposta.ok) {
        setMensagem('Bueiro cadastrado com sucesso!');
        setFormData({ latitude: '', longitude: '' });
        setImagem(null);

        const atualizados = await fetch(`${API}/bueiros`);
        const dadosAtualizados = await atualizados.json();
        setBueirosExistentes(dadosAtualizados);
      } else {
        const errText = await resposta.text();
        setMensagem(`Erro ao cadastrar bueiro. ${errText || ''}`);
      }
    } catch (err) {
      console.error(err);
      setMensagem('Erro ao conectar com o servidor.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('usuarioLogado');
    localStorage.removeItem('usuario');
    navigate('/');
  };

  return (
    <div className="bg-black min-h-screen text-white font-sans">
      <header className="bg-black/70 backdrop-blur-md fixed top-0 w-full z-50 px-4 md:px-8 py-3 flex justify-between items-center shadow-md">
        <Link to="/" className="focus:outline-none">
          <img src={LogoEscrita} alt="Logo Green Sight" className="h-10 md:h-14 w-auto object-contain cursor-pointer" />
        </Link>

        <nav className="hidden md:flex space-x-8 text-base font-medium tracking-wide text-zinc-100 items-center">
          {isUsuarioLogado && (
            <Link to="/mapa" className={`${isActive('/mapa')} transition-all duration-200`}>
              <FaMapMarkedAlt className="inline mr-1" /> Mapa
            </Link>
          )}
          <Link to="/relatos" className={`${isActive('/relatos')} transition-all duration-200`}>
            <FaRegCommentDots className="inline mr-1" /> Relatos
          </Link>
          <Link to="/graficos" className={`${isActive('/graficos')} transition-all duration-200`}>
            <FaChartBar className="inline mr-1" /> Gráficos
          </Link>

          {isUsuarioLogado ? (
            <>
              <Link
                to="/cadastro-bueiros"
                className={`${isActive('/cadastro-bueiros')} transition-all duration-200`}
              >
                <FaPlus className="inline mr-1" /> Cadastro de Bueiros
              </Link>
              <button
                onClick={() => setMostrarConfirmacaoLogout(true)}
                className="hover:text-green-500 transition-all duration-200"
              >
                <FaSignOutAlt className="inline mr-1" /> Sair
              </button>
            </>
          ) : (
            <Link to="/login" className={`${isActive('/login')} transition-all duration-200`}>
              <FaUser className="inline mr-1" /> Login
            </Link>
          )}
        </nav>

        <button
          aria-label={navOpen ? 'Fechar menu' : 'Abrir menu'}
          onClick={() => setNavOpen(v => !v)}
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
            {isUsuarioLogado && (
              <li>
                <Link
                  to="/mapa"
                  onClick={() => setNavOpen(false)}
                  className={`flex items-center gap-2 py-2 ${isActive('/mapa')}`}
                >
                  <FaMapMarkedAlt /> Mapa
                </Link>
              </li>
            )}
            <li>
              <Link
                to="/relatos"
                onClick={() => setNavOpen(false)}
                className={`flex items-center gap-2 py-2 ${isActive('/relatos')}`}
              >
                <FaRegCommentDots /> Relatos
              </Link>
            </li>
            <li>
              <Link
                to="/graficos"
                onClick={() => setNavOpen(false)}
                className={`flex items-center gap-2 py-2 ${isActive('/graficos')}`}
              >
                <FaChartBar /> Gráficos
              </Link>
            </li>

            {isUsuarioLogado && (
              <>
                <li className="mt-2 border-t border-zinc-800" />
                <li>
                  <button
                    onClick={() => {
                      setNavOpen(false);
                      navigate('/cadastro-bueiros');
                    }}
                    className={`w-full text-left flex items-center gap-2 py-2 ${isActive('/cadastro-bueiros')}`}
                  >
                    <FaPlus /> Cadastro de Bueiros
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setNavOpen(false);
                      setMostrarConfirmacaoLogout(true);
                    }}
                    className="w-full text-left flex items-center gap-2 py-2 hover:text-green-500"
                  >
                    <FaSignOutAlt /> Sair
                  </button>
                </li>
              </>
            )}

            {!isUsuarioLogado && (
              <li>
                <Link
                  to="/login"
                  onClick={() => setNavOpen(false)}
                  className={`flex items-center gap-2 py-2 ${isActive('/login')}`}
                >
                  <FaUser /> Login
                </Link>
              </li>
            )}
          </ul>
        </div>
      </header>

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

      <main className="pt-20 md:pt-28 px-6 md:px-8 max-w-3xl mx-auto w-full">

        <h1 className="text-3xl md:text-5xl font-bold mb-6">Cadastro de Bueiros</h1>

        {mensagem && (
          <p
            className={`mb-4 text-sm ${
              mensagem.toLowerCase().includes('sucesso') ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {mensagem}
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-zinc-800 p-6 md:p-8 rounded-lg shadow-md space-y-6"
          encType="multipart/form-data"
        >
          <div>
            <label className="block mb-1 text-zinc-300">Latitude</label>
            <input
              type="text"
              name="latitude"
              value={formData.latitude}
              onChange={handleChange}
              placeholder="-23.55"
              className="w-full px-4 py-2 rounded bg-zinc-900 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-zinc-300">Longitude</label>
            <input
              type="text"
              name="longitude"
              value={formData.longitude}
              onChange={handleChange}
              placeholder="-46.63"
              className="w-full px-4 py-2 rounded bg-zinc-900 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-zinc-300">Imagem do bueiro (opcional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImagemChange}
              className="w-full px-4 py-2 rounded bg-zinc-900 border border-zinc-700"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors"
          >
            <FaMapMarkerAlt /> Cadastrar Bueiro
          </button>
        </form>
      </main>

      <footer className="bg-black text-zinc-400 text-sm border-t border-zinc-700 mt-10">
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

export default CadastroBueiros;
