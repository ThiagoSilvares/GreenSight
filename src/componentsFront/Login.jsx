import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash, FaArrowLeft } from 'react-icons/fa';
import LogoGreenSight from '../assets/LogoGreenSight.png';
import LogoEscrita from '../assets/LogoEscritaGreenSight.png'; 

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  process.env.REACT_APP_API_BASE_URL ||
  (typeof window !== 'undefined' && window.__API_BASE__) ||
  'http://localhost:3001';

const API = `${String(API_BASE).replace(/\/$/, '')}/api`;

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  const togglePassword = () => setShowPassword(v => !v);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');
    try {
      const response = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });

      if (!response.ok) {
        let msg = 'Erro ao conectar com o servidor';
        try {
          const err = await response.json();
          msg = err?.mensagem || msg;
        } catch {}
        setErro(msg);
        return;
      }

      const data = await response.json();
      if (data?.sucesso) {
        const papel = email.includes('@admgreensight') ? 'Administrador' : 'Funcionário';
        const usuario = {
          email,
          nome: data?.usuario?.nome || '',
          papel,
          ...data?.usuario,
        };
        localStorage.setItem('usuarioLogado', JSON.stringify(usuario));
        localStorage.setItem('usuario', JSON.stringify(usuario));
        navigate('/mapa');
      } else {
        setErro(data?.mensagem || 'Erro ao fazer login');
      }
    } catch (error) {
      console.error('Erro de rede:', error);
      setErro('Erro ao conectar com o servidor');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans flex">
      <aside className="hidden md:flex w-1/2 relative items-center justify-center">
        <Link
          to="/"
          className="absolute top-10 left-12 flex items-center gap-2 text-white/90 hover:text-white transition"
        >
          <FaArrowLeft />
          <span className="underline underline-offset-4">Voltar</span>
        </Link>
        <img
          src={LogoGreenSight}
          alt="Ilustração Green Sight"
          className="max-w-[580px] w-[80%] h-auto object-contain"
        />
      </aside>
      <section className="w-full md:w-1/2 flex flex-col">
        <div className="md:hidden sticky top-0 z-10 bg-black/95 border-b border-zinc-800 px-4 py-3 grid grid-cols-[36px_1fr_36px] items-center">
          <Link to="/" aria-label="Voltar" className="justify-self-start text-white">
            <FaArrowLeft />
          </Link>
          <div className="justify-self-center">
            <img src={LogoEscrita} alt="Green Sight" className="h-6 w-auto" />
          </div>
          <span />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-5 sm:px-8 py-8 md:py-0">
          <Link to="/" className="hidden md:block mb-6">
            <img src={LogoEscrita} alt="Green Sight" className="h-14 w-auto" />
          </Link>
          <img
            src={LogoGreenSight}
            alt="Ilustração Green Sight"
            className="md:hidden mb-6 mt-2 h-28 w-auto object-contain"
          />
          <form
            onSubmit={handleLogin}
            className="w-full max-w-3xl md:max-w-xl flex flex-col gap-5"
          >
            <div className="relative">
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail"
                required
                className="w-full bg-[#e8f0fe] text-black placeholder-black/60 rounded-sm px-4 py-3 outline-none"
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Senha"
                required
                className="w-full bg-[#e8f0fe] text-black placeholder-black/60 rounded-sm px-4 py-3 pr-10 outline-none"
              />
              <button
                type="button"
                onClick={togglePassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded focus:outline-none active:scale-95"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? (
                  <FaEye className="text-green-500 text-lg" />
                ) : (
                  <FaEyeSlash className="text-zinc-600 text-lg" />
                )}
              </button>
            </div>

            <div className="text-left text-sm -mt-1">
              <a href="#" className="text-zinc-300 hover:text-white underline">
                Esqueci minha senha
              </a>
            </div>

            {erro && (
              <div className="text-red-500 text-sm -mt-2">
                {erro}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-md transition"
            >
              ENTRAR
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default Login;
