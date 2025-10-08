import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Link as ScrollLink, animateScroll as scroll } from 'react-scroll';
import {
  FaUser,
  FaMapMarkedAlt,
  FaRegCommentDots,
  FaChartBar,
  FaBars,
  FaTimes,
  FaPlus,
  FaSignOutAlt,
} from 'react-icons/fa';
import LogoEscrita from '../assets/LogoEscritaGreenSight.png';
import Enchente from '../assets/enchente.png';

const Home = () => {
  const navigate = useNavigate();
  const isUsuarioLogado = !!localStorage.getItem('usuarioLogado');
  const [navOpen, setNavOpen] = useState(false);
  const [mostrarConfirmacaoLogout, setMostrarConfirmacaoLogout] = useState(false);

  useEffect(() => {
    const onScroll = () => setNavOpen(false);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("usuarioLogado");
    localStorage.removeItem("usuario");
    navigate("/");
  };

  const year = new Date().getFullYear();

  return (
    <div className="bg-black text-white min-h-screen font-sans">
      <header className="bg-black/70 backdrop-blur-md fixed top-0 w-full z-50 px-4 md:px-8 py-3 flex justify-between items-center shadow-md">
        <button onClick={() => { setNavOpen(false); scroll.scrollToTop(); }} className="focus:outline-none">
          <img
            src={LogoEscrita}
            alt="Logo Escrita Green Sight"
            className="h-10 md:h-14 w-auto object-contain cursor-pointer"
          />
        </button>

        <nav className="hidden md:flex space-x-8 text-base font-medium tracking-wide text-zinc-100 items-center">
          {isUsuarioLogado && (
            <Link to="/mapa" className="hover:text-green-500 transition-all duration-200">
              <FaMapMarkedAlt className="inline mr-1" /> Mapa
            </Link>
          )}
          <Link to="/relatos" className="hover:text-green-500 transition-all duration-200">
            <FaRegCommentDots className="inline mr-1" /> Relatos
          </Link>
          <Link to="/graficos" className="hover:text-green-500 transition-all duration-200">
            <FaChartBar className="inline mr-1" /> Gráficos
          </Link>

          {isUsuarioLogado ? (
            <>
              <Link
                to="/cadastro-bueiros"
                className="hover:text-green-500 transition-all duration-200"
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
            <Link to="/login" className="hover:text-green-500 transition-all duration-200">
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
                  className="flex items-center gap-2 py-2 hover:text-green-500"
                >
                  <FaMapMarkedAlt /> Mapa
                </Link>
              </li>
            )}
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

            {isUsuarioLogado && (
              <>
                <li className="mt-2 border-t border-zinc-800" />
                <li>
                  <button
                    onClick={() => {
                      setNavOpen(false);
                      navigate("/cadastro-bueiros");
                    }}
                    className="w-full text-left flex items-center gap-2 py-2 hover:text-green-500"
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
                  className="flex items-center gap-2 py-2 hover:text-green-500"
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

      <section className="text-center px-6 pt-20 md:pt-40 pb-8 md:pb-8 max-w-5xl mx-auto">
        <h2 className="text-4xl md:text-6xl font-extrabold mb-6 leading-snug">
          Monitoramento Inteligente para <br className="hidden sm:block" /> Cidades Mais Limpas e Seguras
        </h2>
        <p className="text-gray-300 max-w-3xl mx-auto mb-8 text-sm md:text-base">
          O Green Sight utiliza tecnologia de câmeras e análise de dados para o mapeamento de bueiros em tempo real,
          possibilitando também o cadastro manual de cada uma das unidades monitoradas. A partir disso, constrói-se uma
          base geoespacial confiável, que apoia a prevenção de enchentes, o planejamento urbano e a gestão sustentável das cidades.
        </p>
        <div className="my-8">
          <ScrollLink
            to="tecnologia"
            smooth={true}
            duration={1200}
            offset={-80}
            className="bg-green-700 hover:bg-green-600 text-white font-semibold text-xl py-4 px-8 rounded-full transition duration-200 cursor-pointer inline-block"
          >
            Saiba Mais
          </ScrollLink>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 px-6 pt-0 pb-16 max-w-6xl mx-auto text-black">
        <div className="bg-white rounded-md shadow-md p-6 text-center">
          <h3 className="text-lg font-bold mb-2">Mapeamento Inteligente</h3>
          <p className="text-sm">
            Localização precisa de bueiros ao longo das vias públicas, oferecendo uma visão clara e ampla da infraestrutura existente,
            e orientando de forma estratégica as ações de manutenção.
          </p>
        </div>
        <div className="bg-white rounded-md shadow-md p-6 text-center">
          <h3 className="text-lg font-bold mb-2">Dados para Ação</h3>
          <p className="text-sm">
            Disponibilização de mapas e dashboards com a finalidade de auxiliar gestores e equipes técnicas a atuarem com maior
            eficiência e planejamento estratégico.
          </p>
        </div>
        <div className="bg-white rounded-md shadow-md p-6 text-center">
          <h3 className="text-lg font-bold mb-2">Gestão Estratégica</h3>
          <p className="text-sm">
            Disponibilização da localização dos bueiros, promovendo engajamento social e fortalecimento da consciência ambiental coletiva.
          </p>
        </div>
      </section>

      <section className="bg-black text-white px-6 py-16 max-w-6xl mx-auto flex flex-col lg:flex-row items-center lg:items-start justify-between gap-8">
        <div className="w-full lg:w-1/2 text-center lg:text-left">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight text-center lg:text-left">
            Os Desafios Gerados <br /> Pelos Resíduos Urbanos
          </h2>
          <p className="text-gray-300 text-sm md:text-base mb-4">
            O acúmulo de lixo em bueiros é um problema crescente nas cidades, causando alagamentos, proliferação de doenças e poluição ambiental.
            Isso acarreta prejuízos significativos à infraestrutura urbana e compromete diretamente a qualidade de vida da população.
          </p>
          <p className="text-gray-300 text-sm md:text-base">
            A falta de monitoramento eficiente agrava a situação, dificultando a identificação dos pontos críticos e a ação preventiva.
          </p>
        </div>
        <div className="w-full lg:w-1/2">
          <img
            src={Enchente}
            alt="Imagem de enchente"
            className="w-full h-auto rounded-md shadow-lg"
          />
        </div>
      </section>

      <section id="tecnologia" className="bg-black text-white px-6 py-16 max-w-6xl mx-auto">
        <h2 className="text-center text-3xl md:text-4xl font-bold mb-12">
          A Tecnologia por trás do Green Sight
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 text-center">
          <div className="bg-zinc-200 rounded-md shadow-lg p-9 text-black min-h-[230px] flex flex-col justify-start">
            <div className="bg-zinc-400 text-white font-bold py-6 mb-4 rounded">Câmeras Inteligentes</div>
            <p className="text-sm">Instaladas em veículos a fim de registrar imagens das vias, possibilitando a detecção e o mapeamento preciso da localização dos bueiros.</p>
          </div>
          <div className="bg-zinc-200 rounded-md shadow-lg p-9 text-black min-h-[230px] flex flex-col justify-start">
            <div className="bg-zinc-400 text-white font-bold py-6 mb-4 rounded">GPS e Armazenamento em Nuvem</div>
            <p className="text-sm">Geolocalização via GPS integrada a armazenamento em nuvem, garantindo a associação das imagens às coordenadas exatas e à segurança dos dados coletados.</p>
          </div>
          <div className="bg-zinc-200 rounded-md shadow-lg p-9 text-black min-h-[230px] flex flex-col justify-start">
            <div className="bg-zinc-400 text-white font-bold py-6 mb-4 rounded">Inteligência Artificial</div>
            <p className="text-sm">Algoritmos de visão computacional processam as imagens para identificar automaticamente a existência e posição dos bueiros, alimentando a base geoespacial do sistema.</p>
          </div>
          <div className="bg-zinc-200 rounded-md shadow-lg p-9 text-black min-h-[230px] flex flex-col justify-start">
            <div className="bg-zinc-400 text-white font-bold py-6 mb-4 rounded">Mapa Interativo</div>
            <p className="text-sm">Os dados processados são exibidos em mapas que permitem a visualização da distribuição dos bueiros na cidade, servindo como base para planejamento e ações de manutenção.</p>
          </div>
        </div>
      </section>

      <section className="bg-black text-white px-6 py-16 max-w-4xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">Faça Parte da Mudança!</h2>
        <p className="text-gray-300 mb-8">
          Tem alguma dúvida, sugestão ou gostaria de colaborar com o Green Sight? Entre em contato conosco!
        </p>
        <form className="bg-zinc-200 rounded-md shadow-md p-6 text-black space-y-4 max-w-xl mx-auto">
          <input
            type="text"
            placeholder="Seu nome"
            className="w-full p-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <input
            type="email"
            placeholder="Seu e-mail"
            className="w-full p-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <textarea
            placeholder="Sua mensagem"
            rows="4"
            className="w-full p-3 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
          ></textarea>
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-500 text-white font-semibold py-2 px-6 rounded-full transition duration-200"
          >
            Enviar Mensagem
          </button>
        </form>
      </section>

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

export default Home;
