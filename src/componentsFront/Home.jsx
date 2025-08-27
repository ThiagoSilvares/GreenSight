import React from 'react';
import { Link } from 'react-router-dom';
import { Link as ScrollLink, animateScroll as scroll } from 'react-scroll';
import { FaUser, FaMapMarkedAlt, FaRegCommentDots, FaChartBar } from 'react-icons/fa';
import LogoEscrita from '../assets/LogoEscritaGreenSight.png';
import Enchente from '../assets/enchente.png';

const Home = () => {
  const isUsuarioLogado = !!localStorage.getItem('usuarioLogado');

  return (
    <div className="bg-black text-white min-h-screen font-sans">

      <header className="bg-black/70 backdrop-blur-md fixed top-0 w-full z-50 px-8 py-4 flex justify-between items-center shadow-md">
        <button onClick={() => scroll.scrollToTop()} className="focus:outline-none">
          <img
            src={LogoEscrita}
            alt="Logo Escrita Green Sight"
            className="h-14 w-auto object-contain cursor-pointer"
          />
        </button>

        <nav className="space-x-8 text-sm md:text-base font-medium tracking-wide text-zinc-100">
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
          {!isUsuarioLogado && (
            <Link to="/login" className="hover:text-green-500 transition-all duration-200">
              <FaUser className="inline mr-1" /> Login
            </Link>
          )}
        </nav>
      </header>

      <section className="text-center px-6 pt-32 pb-8 md:pt-40 md:pb-8 max-w-5xl mx-auto">
        <h2 className="text-4xl md:text-6xl font-extrabold mb-6 leading-snug">
          Monitoramento Inteligente para <br className="hidden sm:block" /> Cidades Mais Limpas e Seguras.
        </h2>
        <p className="text-gray-300 max-w-3xl mx-auto mb-8 text-sm md:text-base">
          O Green Sight utiliza tecnologia de câmeras e análise de dados para o mapeamento de bueiros em tempo real, 
          possibilitando a atualização manual do estado de cada uma das unidades monitoradas. A partir disso, constrói-se uma base geoespacial confiável, 
          que apoia a prevenção de enchentes, o planejamento urbano e a gestão sustentável das cidades.
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
            Localização precisa de bueiros ao longo das vias públicas, oferecendo uma visão clara e ampla da infraestrutura existente, e orientando de forma estratégica as ações de manutenção.
          </p>
        </div>
        <div className="bg-white rounded-md shadow-md p-6 text-center">
          <h3 className="text-lg font-bold mb-2">Dados para Ação</h3>
          <p className="text-sm">
            Disponibilização de mapas e dashboards com a finalidade de auxiliar gestores e equipes técnicas a atuarem com maior eficiência e planejamento estratégico.
          </p>
        </div>
        <div className="bg-white rounded-md shadow-md p-6 text-center">
          <h3 className="text-lg font-bold mb-2">Gestão Estratégica</h3>
          <p className="text-sm">
            Disponibilização da localização e do estado atualizado dos bueiros, promovendo engajamento social e fortalecimento da consciência ambiental coletiva.
          </p>
        </div>
      </section>

      <section className="bg-black text-white px-6 py-16 max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="lg:w-1/2">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            O Desafio dos <br /> Resíduos Urbanos
          </h2>
          <p className="text-gray-300 text-sm md:text-base mb-4">
            O acúmulo de lixo em bueiros é um problema crescente nas cidades, causando alagamentos, proliferação de doenças e poluição ambiental.
            Isso acarreta prejuízos significativos à infraestrutura urbana e compromete diretamente a qualidade de vida da população.
          </p>
          <p className="text-gray-300 text-sm md:text-base">
            A falta de monitoramento eficiente agrava a situação, dificultando a identificação dos pontos críticos e a ação preventiva.
          </p>
        </div>
        <div className="lg:w-1/2">
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
            <div className="bg-zinc-400 text-white font-bold py-6 mb-4 rounded">Câmera</div>
            <h3 className="text-base font-semibold mb-2">Câmeras Inteligentes</h3>
            <p className="text-sm">Instaladas em veículos a fim de registrar imagens das vias, possibilitando a detecção e o mapeamento preciso da localização dos bueiros.</p>
          </div>
          <div className="bg-zinc-200 rounded-md shadow-lg p-9 text-black min-h-[230px] flex flex-col justify-start">
            <div className="bg-zinc-400 text-white font-bold py-6 mb-4 rounded">GPS Nuvem</div>
            <h3 className="text-base font-semibold mb-2">GPS e Armazenamento em Nuvem</h3>
            <p className="text-sm">Geolocalização via GPS integrada a armazenamento em nuvem, garantindo a associação das imagens às coordenadas exatas e à segurança dos dados coletados.</p>
          </div>
          <div className="bg-zinc-200 rounded-md shadow-lg p-9 text-black min-h-[230px] flex flex-col justify-start">
            <div className="bg-zinc-400 text-white font-bold py-6 mb-4 rounded">IA</div>
            <h3 className="text-base font-semibold mb-2">Inteligência Artificial</h3>
            <p className="text-sm">Algoritmos de visão computacional processam as imagens para identificar automaticamente a existência e posição dos bueiros, alimentando a base geoespacial do sistema.</p>
          </div>
          <div className="bg-zinc-200 rounded-md shadow-lg p-9 text-black min-h-[230px] flex flex-col justify-start">
            <div className="bg-zinc-400 text-white font-bold py-6 mb-4 rounded">Mapa</div>
            <h3 className="text-base font-semibold mb-2">Mapa Interativo</h3>
            <p className="text-sm">Os dados processados são exibidos em mapas que permitem a visualização da distribuição dos bueiros na cidade, servindo como base para atualizações manuais de estado.</p>
          </div>
        </div>
      </section>

      <section className="bg-black text-white px-6 py-16 max-w-4xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">Faça Parte da Mudança!</h2>
        <p className="text-gray-300 mb-8">
          Quer saber mais sobre o Green Sight ou como sua cidade pode se beneficiar?
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

      <footer className="bg-black text-gray-400 text-sm py-6 border-t border-gray-700 px-6">
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

export default Home;
