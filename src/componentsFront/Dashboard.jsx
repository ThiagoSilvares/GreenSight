import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaBars,
  FaTimes,
  FaChartLine,
  FaSyncAlt,
  FaFileAlt,
  FaSignOutAlt,
  FaBell,
  FaPlus,
  FaEdit,
} from 'react-icons/fa';
import { FiBell } from 'react-icons/fi';
import { IoChevronDown } from 'react-icons/io5';
import LogoEscrita from '../assets/LogoEscritaGreenSight.png';
import MapComponent from './MapComponent';

const Dashboard = () => {
  const [notificacoesAtivas, setNotificacoesAtivas] = useState(false);
  const [papel, setPapel] = useState('');
  const [menuAberto, setMenuAberto] = useState(false);
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const [dadosResumo, setDadosResumo] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [bueirosMapa, setBueirosMapa] = useState([]);
  const [mostrarConfirmacaoLogout, setMostrarConfirmacaoLogout] = useState(false);
  const navigate = useNavigate();

  const opcoes = ['Administrador', 'Funcionário'];

  useEffect(() => {
    const logado = localStorage.getItem('usuarioLogado');
    const usuarioSalvo = JSON.parse(localStorage.getItem('usuario'));

    if (!logado || !usuarioSalvo) {
      navigate('/login');
    } else {
      setUsuario(usuarioSalvo);
      setPapel(usuarioSalvo.papel || 'Funcionário');
    }
  }, [navigate]);

  useEffect(() => {
    fetch('http://localhost:3001/api/resumo')
      .then((res) => res.json())
      .then((data) => setDadosResumo(data))
      .catch((err) => console.error('Erro ao buscar dados:', err));
  }, []);

  useEffect(() => {
    fetch('http://localhost:3001/api/bueiros')
      .then((res) => res.json())
      .then((data) => setBueirosMapa(data))
      .catch((err) => console.error('Erro ao buscar bueiros do mapa:', err));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('usuarioLogado');
    localStorage.removeItem('usuario');
    navigate('/');
  };

  return (
    <div className="bg-black min-h-screen text-white font-sans">
      <header className="bg-black/70 backdrop-blur-md fixed top-0 w-full z-50 px-8 py-4 flex justify-between items-center shadow-md">
        <Link to="/" className="focus:outline-none">
          <img src={LogoEscrita} alt="Logo Escrita Green Sight" className="h-14 w-auto object-contain cursor-pointer" />
        </Link>

        <nav className="space-x-8 text-sm md:text-base font-medium tracking-wide text-zinc-100">
          <Link to="/dashboard" className="hover:text-green-500 transition-all duration-200 font-bold">
            <FaChartLine className="inline mr-1" /> Dashboard
          </Link>
          <Link to="/monitoramento-cidadao" className="hover:text-green-500 transition-all duration-200">
            <FaSyncAlt className="inline mr-1" /> Monitoramento Cidadão
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
              {papel === 'Administrador' && (
                <li
                  onClick={() => navigate('/cadastro-bueiros')}
                  className="hover:text-green-400 cursor-pointer flex items-center gap-3"
                >
                  <FaPlus size={20} /> Cadastro de Bueiros
                </li>
              )}
              {(papel === 'Administrador' || papel === 'Funcionário') && (
                <li
                  onClick={() => navigate('/atualizar-status')}
                  className="hover:text-green-400 cursor-pointer flex items-center gap-3"
                >
                  <FaEdit size={20} /> Atualizar Status
                </li>
              )}
              <li className="hover:text-green-400 cursor-pointer flex items-center gap-3">
                <FaFileAlt size={20} /> Relatórios
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
            <h1 className="text-3xl md:text-5xl font-bold">Dashboard de Monitoramento</h1>
            <div className="flex items-center space-x-4">
              <button
                className={`text-xl p-2 rounded hover:bg-zinc-800 transition ${notificacoesAtivas ? 'text-green-400' : ''}`}
                onClick={() => setNotificacoesAtivas(!notificacoesAtivas)}
              >
                {notificacoesAtivas ? <FaBell size={22} /> : <FiBell size={22} />}
              </button>

              <div className="relative">
                <button
                  onClick={() => setMenuAberto(!menuAberto)}
                  className="border px-3 py-1 rounded-md flex items-center gap-1 text-sm hover:bg-zinc-800"
                >
                  {papel} <IoChevronDown size={16} />
                </button>
                {menuAberto && (
                  <ul className="absolute right-0 mt-1 w-40 bg-zinc-800 shadow-lg rounded-md text-white text-sm z-50">
                    {opcoes.map((opcao) => {
                      const isFuncionario = usuario?.email?.endsWith('@funcgreensight.com');
                      const isAdministrador = opcao === 'Administrador';
                      const isDesativado = isFuncionario && isAdministrador;

                      return (
                        <li
                          key={opcao}
                          className={`px-4 py-2 ${
                            isDesativado
                              ? 'opacity-50 cursor-not-allowed'
                              : 'cursor-pointer hover:bg-zinc-700'
                          } ${opcao === papel ? 'bg-zinc-700 font-semibold' : ''}`}
                          onClick={() => {
                            if (isDesativado) return;
                            setPapel(opcao);
                            setMenuAberto(false);
                          }}
                        >
                          {opcao}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="bg-zinc-800 rounded-lg overflow-hidden relative z-0">
            <MapComponent bueiros={bueirosMapa} />
          </div>

          <div className="mt-6 flex justify-center space-x-6 text-sm text-zinc-300">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500"></span> Bueiros Limpos
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span> Bueiros Obstruídos
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span> Não Analisados
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {dadosResumo ? (
              [
                ['Bueiros Limpos', dadosResumo.bueiros_limpos],
                ['Bueiros com Obstrução', dadosResumo.bueiros_obstruidos],
                ['Bueiros Não Analisados', dadosResumo.bueiros_nao_analisados ?? 0],
                ['Total de Bueiros Monitorados', dadosResumo.total_monitorados],
                ['Percentual de Obstrução', `${dadosResumo.percentual_obstrucao ?? 0}%`],
                ['Percentual de Melhoria', `${dadosResumo.percentual_melhoria ?? 0}%`],
              ].map(([titulo, valor], index) => (
                <div
                  key={index}
                  className="bg-zinc-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
                >
                  <p className="text-zinc-300 text-sm">{titulo}</p>
                  <p className="text-green-400 text-3xl font-bold mt-2">{valor}</p>
                </div>
              ))
            ) : (
              <p className="text-zinc-400 col-span-3 text-center">Carregando dados do banco...</p>
            )}
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

export default Dashboard;
