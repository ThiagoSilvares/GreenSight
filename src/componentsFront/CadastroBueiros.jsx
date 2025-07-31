import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaChartLine,
  FaSyncAlt,
  FaMapMarkerAlt,
} from 'react-icons/fa';
import LogoEscrita from '../assets/LogoEscritaGreenSight.png';

const CadastroBueiros = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    latitude: '',
    longitude: '',
    status: 'nao_analisado',
    imagem_url: '',
  });

  const [mensagem, setMensagem] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const resposta = await fetch('http://localhost:3001/api/bueiros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (resposta.ok) {
        setMensagem('Bueiro cadastrado com sucesso!');
        setFormData({
          latitude: '',
          longitude: '',
          status: 'nao_analisado',
          imagem_url: '',
        });
      } else {
        setMensagem('Erro ao cadastrar bueiro.');
      }
    } catch (err) {
      console.error(err);
      setMensagem('Erro ao conectar com o servidor.');
    }
  };

  return (
    <div className="bg-black min-h-screen text-white font-sans">
      <header className="bg-black/70 backdrop-blur-md fixed top-0 w-full z-50 px-8 py-4 flex justify-between items-center shadow-md">
        <Link to="/" className="focus:outline-none">
          <img src={LogoEscrita} alt="Logo Green Sight" className="h-14 w-auto object-contain cursor-pointer" />
        </Link>
        <nav className="space-x-8 text-sm md:text-base font-medium tracking-wide text-zinc-100">
          <Link to="/dashboard" className="hover:text-green-500 transition-all duration-200 font-bold">
            <FaChartLine className="inline mr-1" /> Dashboard
          </Link>
          <Link to="/atualizacoes" className="hover:text-green-500 transition-all duration-200">
            <FaSyncAlt className="inline mr-1" /> Atualizações
          </Link>
        </nav>
      </header>

      <main className="pt-28 px-8 max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">Cadastro de Bueiros</h1>

        {mensagem && (
          <p className={`mb-4 text-sm ${mensagem.includes('sucesso') ? 'text-green-400' : 'text-red-400'}`}>
            {mensagem}
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-zinc-800 p-8 rounded-lg shadow-md space-y-6"
        >
          <div>
            <label className="block mb-1 text-zinc-300">Latitude</label>
            <input
              type="text"
              name="latitude"
              value={formData.latitude}
              onChange={handleChange}
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
              className="w-full px-4 py-2 rounded bg-zinc-900 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-zinc-300">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded bg-zinc-900 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="limpo">Limpo</option>
              <option value="obstruido">Obstruído</option>
              <option value="nao_analisado">Não Analisado</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 text-zinc-300">Imagem (URL ou nome do arquivo)</label>
            <input
              type="text"
              name="imagem_url"
              value={formData.imagem_url}
              onChange={handleChange}
              placeholder="Ex: bueiro123.jpg ou https://..."
              className="w-full px-4 py-2 rounded bg-zinc-900 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded flex items-center justify-center gap-2 transition-all duration-300"
          >
            <FaMapMarkerAlt /> Cadastrar Bueiro
          </button>
        </form>
      </main>

      <footer className="bg-black text-gray-400 text-sm py-6 border-t border-gray-700 px-6 mt-10">
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

export default CadastroBueiros;
