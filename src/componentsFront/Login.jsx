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

  const togglePassword = () => setShowPassword((v) => !v);

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
        navigate('/');
      } else {
        setErro(data?.mensagem || 'Erro ao fazer login');
      }
    } catch (error) {
      console.error('Erro de rede:', error);
      setErro('Erro ao conectar com o servidor');
    }
  };

  return (
    <div className="min-h-screen flex bg-black text-white font-sans">
      <div className="hidden md:flex w-1/2 flex-col items-start justify-center relative bg-black px-10">
        <Link
          to="/"
          className="absolute top-16 left-14 text-lg flex items-center border-b border-white hover:border-green-500 transition-all"
        >
          <FaArrowLeft className="text-white mr-2" />
          <span className="text-white font-medium">Voltar</span>
        </Link>

        <div className="w-full flex justify-end pr-2">
          <img
            src={LogoGreenSight}
            alt="Logo Green Sight"
            className="w-[550px] h-[550px] object-contain"
          />
        </div>
      </div>

      <div className="w-full md:w-1/2 flex flex-col items-center justify-center px-8 -mt-12">
        <Link to="/">
          <img src={LogoEscrita} alt="Logo Escrita Green Sight" className="h-20 w-auto cursor-pointer" />
        </Link>

        <form onSubmit={handleLogin} className="w-full max-w-lg mt-4 space-y-6">
          <div className="relative border-b border-zinc-600">
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail"
              required
              className="w-full bg-transparent border-none outline-none text-white placeholder-gray-400 pt-4 pb-1 text-base"
            />
          </div>

          <div className="relative border-b border-zinc-600">
            <input
              type={showPassword ? 'text' : 'password'}
              id="senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Senha"
              required
              className="w-full bg-transparent border-none outline-none text-white placeholder-gray-400 pt-4 pb-1 text-base"
            />
            <button
              type="button"
              onClick={togglePassword}
              className="absolute right-2 top-3 focus:outline-none"
            >
              {showPassword ? (
                <FaEye className="text-green-500 text-lg" />
              ) : (
                <FaEyeSlash className="text-gray-500 text-lg" />
              )}
            </button>
          </div>

          <div className="text-left text-sm">
            <a href="#" className="text-gray-300 underline">Esqueci minha senha</a>
          </div>

          {erro && <div className="text-red-500 text-sm mt-2">{erro}</div>}

          <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white py-2 font-semibold text-base rounded-md">
            ENTRAR
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
