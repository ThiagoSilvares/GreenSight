import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FaUser,
  FaMapMarkedAlt,
  FaRegCommentDots,
  FaTrash,
  FaChartBar,
  FaBars,
  FaTimes,
  FaPlus,
  FaSignOutAlt,
} from "react-icons/fa";
import LogoEscrita from "../assets/LogoEscritaGreenSight.png";

const API_BASE_RAW =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
  process.env.REACT_APP_API_BASE_URL ||
  (typeof window !== "undefined" && window.__API_BASE__) ||
  "http://localhost:3001";

const API_BASE = String(API_BASE_RAW).replace(/\/$/, "");
const API = `${API_BASE}/api`;

const year = new Date().getFullYear();

const toAbsoluteUrl = (url) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
};

const Relatos = () => {
  const navigate = useNavigate();
  const isUsuarioLogado = !!localStorage.getItem("usuarioLogado");

  const rawUser = localStorage.getItem("usuarioLogado");
  let email = null;
  try {
    const parsed = JSON.parse(rawUser);
    email = parsed?.email || parsed?.user?.email || null;
  } catch {
    email = rawUser || null;
  }
  const isAdmin = !!email && /@admgreensight\.com$/i.test(email);

  const location = useLocation();
  const isActive = (path) =>
    location.pathname === path ? "text-green-500" : "hover:text-green-500";

  const [navOpen, setNavOpen] = useState(false);
  const [mostrarConfirmacaoLogout, setMostrarConfirmacaoLogout] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [author, setAuthor] = useState("");

  const [rua, setRua] = useState("");
  const [bairro, setBairro] = useState("");
  const [numero, setNumero] = useState("");

  const [content, setContent] = useState("");
  const MAX_LEN = 1000;

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const onScroll = () => setNavOpen(false);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const fetchRelatos = async () => {
    try {
      setLoading(true);
      const r = await fetch(`${API}/relatos`);

      if (!r.ok) {
        if (posts.length > 0) setError(`Falha ao carregar (${r.status}).`);
        setPosts([]);
        return;
      }

      const data = await r.json().catch(() => null);
      if (!Array.isArray(data)) {
        if (posts.length > 0) setError("Resposta inesperada do servidor.");
        setPosts([]);
        return;
      }

      const mapped = data.map((it) => ({
        id: it.id,
        author: it.author,
        address: it.address ?? null,
        content: it.content ?? it.text ?? it.description ?? it.message ?? null,
        imageUrl: it.image_path,
        createdAt: it.created_at,
      }));

      setError(null);
      setPosts(mapped);
    } catch (e) {
      console.error(e);
      if (posts.length > 0) setError("Não foi possível carregar os relatos.");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFileSelect(file) {
    if (!file) return;
    if (!file.type?.startsWith("image/")) return alert("Envie apenas imagens");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    handleFileSelect(e.dataTransfer.files?.[0]);
  }

  function getNiceDate(iso) {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  }

  function clearForm() {
    setAuthor("");
    setRua("");
    setBairro("");
    setNumero("");
    setContent("");
    setImageFile(null);
    setImagePreview(null);
  }

  async function handlePublish(e) {
    e.preventDefault();
    if (!author.trim()) return alert("Informe seu nome.");
    if (!rua.trim()) return alert("Informe a rua.");
    if (!numero.toString().trim()) return alert("Informe o número.");
    if (!bairro.trim()) return alert("Informe o bairro.");
    if (content.length > MAX_LEN) return alert(`Relato muito longo (máx. ${MAX_LEN} caracteres).`);

    const address = `${rua.trim()}, ${numero.toString().trim()} - ${bairro.trim()}`;

    try {
      const form = new FormData();
      form.append("author", author.trim());
      form.append("address", address);
      form.append("rua", rua.trim());
      form.append("numero", numero.toString().trim());
      form.append("bairro", bairro.trim());

      if (content.trim()) form.append("content", content.trim());
      if (imageFile) form.append("image", imageFile);

      const resp = await fetch(`${API}/relatos`, {
        method: "POST",
        body: form,
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });

      if (!resp.ok) {
        const raw = await resp.text();
        let msg = "Erro ao publicar relato";
        try {
          const j = JSON.parse(raw);
          if (j?.message) msg = j.message;
        } catch {
          if (raw) msg = raw;
        }
        throw new Error(msg);
      }

      const saved = await resp.json();
      const newPost = {
        id: saved.id,
        author: saved.author,
        address: saved.address ?? address,
        content: saved.content ?? content ?? null,
        imageUrl: saved.image_path,
        createdAt: saved.created_at,
      };

      setPosts((prev) => [newPost, ...prev]);
      setShowForm(false);
      clearForm();
      setError(null);
    } catch (err) {
      console.error(err);
      alert(err.message || "Falha ao publicar. Tente novamente.");
    }
  }

  async function handleDelete(relatoId) {
    if (!isAdmin) return;
    const ok = window.confirm("Certeza que deseja excluir este relato?");
    if (!ok) return;

    try {
      const resp = await fetch(`${API}/relatos/${relatoId}`, {
        method: "DELETE",
        headers: { "X-User-Email": email || "" },
      });

      if (resp.status === 204) {
        setPosts((prev) => prev.filter((p) => p.id !== relatoId));
        return;
      }

      const err = await resp.json().catch(() => ({}));
      throw new Error(err.message || "Falha ao excluir o relato.");
    } catch (e) {
      console.error(e);
      alert(e.message || "Erro ao excluir. Tente novamente.");
    }
  }

  const renderLocalInfo = (p) => {
    if (p?.address) {
      return (
        <p>
          <span className="font-semibold">Endereço:</span> {p.address}
        </p>
      );
    }
    return null;
  };

  const handleLogout = () => {
    localStorage.removeItem("usuarioLogado");
    localStorage.removeItem("usuario");
    navigate("/");
  };

  return (
    <div className="bg-black text-white min-h-screen font-sans flex flex-col">
      <header className="bg-black/70 backdrop-blur-md fixed top-0 w-full z-50 px-4 md:px-8 py-3 flex justify-between items-center shadow-md">
        <Link to="/" className="focus:outline-none">
          <img
            src={LogoEscrita}
            alt="Logo Escrita Green Sight"
            className="h-10 md:h-14 w-auto object-contain cursor-pointer"
          />
        </Link>

        <nav className="hidden md:flex space-x-8 text-base font-medium tracking-wide text-zinc-100 items-center">
          {isUsuarioLogado && (
            <Link to="/mapa" className={`${isActive("/mapa")} transition-all duration-200`}>
              <FaMapMarkedAlt className="inline mr-1" /> Mapa
            </Link>
          )}
          <Link to="/relatos" className={`${isActive("/relatos")} transition-all duration-200`}>
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
            <Link to="/login" className={`${isActive("/login")} transition-all duration-200`}>
              <FaUser className="inline mr-1" /> Login
            </Link>
          )}
        </nav>

        <button
          aria-label={navOpen ? "Fechar menu" : "Abrir menu"}
          onClick={() => setNavOpen((v) => !v)}
          className="md:hidden text-zinc-100 focus:outline-none"
        >
          {navOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
        </button>

        <div
          className={`md:hidden absolute left-0 right-0 top-full bg-black/95 border-t border-zinc-800 ${
            navOpen ? "block" : "hidden"
          }`}
        >
          <ul className="flex flex-col gap-1 px-4 py-3 text-zinc-100">
            {isUsuarioLogado && (
              <li>
                <Link
                  to="/mapa"
                  onClick={() => setNavOpen(false)}
                  className={`flex items-center gap-2 py-2 ${isActive("/mapa")}`}
                >
                  <FaMapMarkedAlt /> Mapa
                </Link>
              </li>
            )}
            <li>
              <Link
                to="/relatos"
                onClick={() => setNavOpen(false)}
                className={`flex items-center gap-2 py-2 ${isActive("/relatos")}`}
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
                  className={`flex items-center gap-2 py-2 ${isActive("/login")}`}
                >
                  <FaUser /> Login
                </Link>
              </li>
            )}
          </ul>
        </div>
      </header>

      <main className="pt-20 md:pt-28 pb-12 px-6 max-w-5xl mx-auto w-full flex-1">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-3 mb-6">
          <h1 className="text-3xl md:text-5xl font-bold">Relatos da Comunidade</h1>
          <button
            onClick={() => setShowForm(true)}
            className="bg-green-700 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-full transition duration-200 text-sm self-start md:self-auto"
          >
            + Nova publicação
          </button>
        </div>

        <section className="bg-zinc-100 text-black rounded-md shadow-md p-0 overflow-hidden">
          {loading ? (
            <div className="px-5 py-3 text-base text-zinc-700">Carregando...</div>
          ) : posts.length === 0 ? (
            <div className="px-5 py-3 text-base text-zinc-700">
              Ainda não há relatos publicados.
            </div>
          ) : error ? (
            <div className="px-5 py-3 text-base text-red-700 bg-red-50 border-t border-red-200">
              {error}{" "}
              <button
                onClick={fetchRelatos}
                className="ml-2 underline text-red-800 hover:text-red-900"
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            <ul>
              {posts.map((p, i) => (
                <li key={p.id} className="px-5 py-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-lg font-semibold">{p.author}</p>
                    <div className="flex items-center gap-3">
                      <time className="text-sm text-zinc-600">{getNiceDate(p.createdAt)}</time>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="text-red-600 text-sm font-semibold hover:underline flex items-center gap-1"
                          title="Excluir relato"
                        >
                          <FaTrash className="inline" /> Excluir
                        </button>
                      )}
                    </div>
                  </div>

                  {p.imageUrl && (
                    <img
                      src={toAbsoluteUrl(p.imageUrl)}
                      alt="Imagem do relato"
                      className="mt-4 w-full max-h-[480px] object-contain rounded"
                    />
                  )}
                  
                  <div className="mt-3 text-sm text-zinc-700 space-y-1">
                    {renderLocalInfo(p)}
                    {p?.content && (
                      <p className="whitespace-pre-wrap">
                        <span className="font-semibold">Relato:</span> {p.content}
                      </p>
                    )}
                  </div>

                  {i !== posts.length - 1 && <hr className="mt-5 border-zinc-300" />}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="bg-black text-zinc-400 text-sm border-t border-zinc-700 mt-auto">
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
                <a href="#" className="hover:text-white inline-block py-1 px-2">
                  Privacidade
                </a>
                <a href="#" className="hover:text-white inline-block py-1 px-2">
                  Termos de Uso
                </a>
              </nav>
            </div>
          </div>
        </div>
      </footer>

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

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-100 text-black w-full max-w-md rounded-md shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b bg-zinc-50">
              <h3 className="text-sm font-bold">Criar publicação</h3>
              <button
                onClick={() => setShowForm(false)}
                className="text-sm px-2 py-1 rounded hover:bg-zinc-200"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <form onSubmit={handlePublish} className="p-4 grid gap-4">
              <div>
                <label className="block text-[12px] text-zinc-600 mb-1">Seu nome</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Ex.: Primeiro e Último Nome"
                  className="w-full rounded border border-zinc-300 p-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>

              <div>
                <label className="block text-[12px] text-zinc-600 mb-1">Imagem (opcional)</label>
                <div
                  onDrop={onDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="group flex flex-col items-center justify-center gap-2 border border-dashed rounded p-4 bg-white hover:border-green-600"
                >
                  <input
                    type="file"
                    accept="image/*"
                    id="up-img"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files?.[0])}
                  />
                  {imagePreview ? (
                    <img src={imagePreview} alt="Pré-visualização" className="max-h-52 rounded" />
                  ) : (
                    <>
                      <p className="text-[13px] text-zinc-800">
                        Arraste a imagem aqui ou{" "}
                        <label htmlFor="up-img" className="text-green-700 underline cursor-pointer">
                          clique para selecionar
                        </label>
                      </p>
                      <p className="text-[11px] text-zinc-500">JPG, PNG... (opcional)</p>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-[12px] text-zinc-600 mb-1">Rua</label>
                  <input
                    type="text"
                    value={rua}
                    onChange={(e) => setRua(e.target.value)}
                    placeholder="Ex.: Rua das Flores"
                    className="w-full rounded border border-zinc-300 p-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] text-zinc-600 mb-1">Número</label>
                    <input
                      type="text"
                      value={numero}
                      onChange={(e) => setNumero(e.target.value)}
                      placeholder="Ex.: 123"
                      className="w-full rounded border border-zinc-300 p-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-green-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] text-zinc-600 mb-1">Bairro</label>
                    <input
                      type="text"
                      value={bairro}
                      onChange={(e) => setBairro(e.target.value)}
                      placeholder="Ex.: Centro"
                      className="w-full rounded border border-zinc-300 p-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-green-600"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[12px] text-zinc-600 mb-1">Relato</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value.slice(0, MAX_LEN))}
                  placeholder="Descreva o problema..."
                  rows={4}
                  className="w-full rounded border border-zinc-300 p-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-green-600 resize-y"
                />
                <div className="text-[11px] text-zinc-500 text-right mt-1">
                  {content.length}/{MAX_LEN}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-3 py-1.5 text-[13px] rounded-full border hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-[13px] rounded-full bg-green-700 hover:bg-green-600 text-white font-semibold"
                >
                  Publicar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Relatos;
