import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaMapMarkedAlt,
  FaRegCommentDots,
  FaMapMarkerAlt,
  FaArrowLeft,
  FaChartBar
} from 'react-icons/fa';
import LogoEscrita from '../assets/LogoEscritaGreenSight.png';

const CadastroBueiros = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    latitude: '',
    longitude: '',
  });

  const [imagem, setImagem] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [bueirosExistentes, setBueirosExistentes] = useState([]);

  useEffect(() => {
    fetch('http://localhost:3001/api/bueiros')
      .then(res => res.json())
      .then(data => setBueirosExistentes(data))
      .catch(err => console.error('Erro ao buscar bueiros existentes:', err));
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
    // aceita vírgula decimal
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

    // checagem simples de duplicidade (mesmas coords)
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
    if (imagem) data.append('imagem', imagem); // opcional

    try {
      const resposta = await fetch('http://localhost:3001/api/bueiros', {
        method: 'POST',
        body: data,
      });

      if (resposta.ok) {
        setMensagem('Bueiro cadastrado com sucesso!');
        setFormData({ latitude: '', longitude: '' });
        setImagem(null);

        const atualizados = await fetch('http://localhost:3001/api/bueiros');
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

  return (
    <div className="bg-black min-h-screen text-white font-sans">
      <header className="bg-black/70 backdrop-blur-md fixed top-0 w-full z-50 px-8 py-4 flex justify-between items-center shadow-md">
        <Link to="/" className="focus:outline-none">
          <img src={LogoEscrita} alt="Logo Green Sight" className="h-14 w-auto object-contain cursor-pointer" />
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

      <div className="pt-24 pl-16">
        <Link
          to="/mapa"
          className="absolute top-32 left-16 text-lg flex items-center border-b border-white hover:border-green-500 transition-all"
        >
          <FaArrowLeft className="text-white mr-2" />
          <span className="text-white font-medium">Voltar</span>
        </Link>
      </div>

      <main className="pt-8 px-8 max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-8">Cadastro de Bueiros</h1>

        {mensagem && (
          <p className={`mb-4 text-sm ${mensagem.includes('sucesso') ? 'text-green-400' : 'text-red-400'}`}>
            {mensagem}
          </p>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-zinc-800 p-8 rounded-lg shadow-md space-y-6"
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

          {/* REMOVIDO: campo de Status (não usamos mais) */}

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
