import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import LogoGreenSight from '../assets/LogoGreenSight.png';
import LogoEscrita from '../assets/LogoEscritaGreenSight.png';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  const togglePassword = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');

    try {
      const response = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, senha }),
      });

      const data = await response.json();

      if (response.ok && data.sucesso) {
        let papel = 'Funcionário';
        if (email.includes('@admgreensight')) {
          papel = 'Administrador';
        }

        const usuario = {
          ...data.usuario,
          papel,
        };

        localStorage.setItem('usuarioLogado', 'true');
        localStorage.setItem('usuario', JSON.stringify(usuario));

        console.log('Usuário logado:', usuario);
        navigate('/');
      } else {
        setErro(data.mensagem || 'Erro ao fazer login');
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
          className="absolute top-16 left-14 text-lg border-b-2 border-white flex items-center"
        >
          <span className="text-green-500 mr-2 text-xl">‹</span>
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
          <img
            src={LogoEscrita}
            alt="Logo Escrita Green Sight"
            className="h-20 w-auto cursor-pointer"
          />
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

          {erro && (
            <div className="text-red-500 text-sm mt-2">{erro}</div>
          )}

          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-500 text-white py-2 font-semibold text-base rounded-md"
          >
            ENTRAR
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
