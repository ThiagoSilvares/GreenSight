import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaUser,
  FaMapMarkedAlt,
  FaRegCommentDots,
  FaTrash,
  FaChartBar,
  FaBars,
  FaTimes,
} from "react-icons/fa";
import LogoEscrita from "../assets/LogoEscritaGreenSight.png";

const API_BASE_RAW =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  process.env.REACT_APP_API_BASE_URL ||
  (typeof window !== 'undefined' && window.__API_BASE__) ||
  'http://localhost:3001';

const API_BASE = String(API_BASE_RAW).replace(/\/$/, "");
const API = `${API_BASE}/api`;

const year = new Date().getFullYear();

const toAbsoluteUrl = (url) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
};

const normalizeNumber = (v) => {
  if (v == null) return NaN;
  return parseFloat(String(v).replace(",", "."));
};
const isValidLat = (v) => Number.isFinite(v) && v >= -90 && v <= 90;
const isValidLon = (v) => Number.isFinite(v) && v >= -180 && v <= 180;

const Relatos = () => {
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

  const [showForm, setShowForm] = useState(false);
  const [author, setAuthor] = useState("");
  const [latText, setLatText] = useState("");
  const [lonText, setLonText] = useState("");
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
        latitude: it.latitude != null ? Number(it.latitude) : null,
        longitude: it.longitude != null ? Number(it.longitude) : null,
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
    setLatText("");
    setLonText("");
    setImageFile(null);
    setImagePreview(null);
  }

  async function handlePublish(e) {
    e.preventDefault();
    if (!author.trim()) return alert("Informe seu nome.");

    const lat = normalizeNumber(latText);
    const lon = normalizeNumber(lonText);
    if (!isValidLat(lat)) return alert("Latitude inválida.");
    if (!isValidLon(lon)) return alert("Longitude inválida.");

    try {
      const form = new FormData();
      form.append("author", author.trim());
      form.append("latitude", String(lat));
      form.append("longitude", String(lon));
      if (imageFile) form.append("image", imageFile);

      const resp = await fetch(`${API}/relatos`, {
        method: "POST",
        body: form,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.message || "Erro ao publicar relato");
      }

      const saved = await resp.json();
      const newPost = {
        id: saved.id,
        author: saved.author,
        address: saved.address ?? null,
        latitude: saved.latitude != null ? Number(saved.latitude) : lat,
        longitude: saved.longitude != null ? Number(saved.longitude) : lon,
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
    if (Number.isFinite(p?.latitude) && Number.isFinite(p?.longitude)) {
      const latStr = p.latitude.toFixed(6);
      const lonStr = p.longitude.toFixed(6);
      const gmaps = `https://www.google.com/maps?q=${latStr},${lonStr}`;
      return (
        <p>
          <span className="font-semibold">Local:</span>{" "}
          <a href={gmaps} target="_blank" rel="noreferrer" className="underline text-blue-700">
            {latStr}, {lonStr}
          </a>
        </p>
      );
    }
    if (p?.address) {
      return (
        <p>
          <span className="font-semibold">Endereço:</span> {p.address}
        </p>
      );
    }
    return null;
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
          {!isUsuarioLogado && (
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
        <div className="mb-5">
          <button
            onClick={() => setShowForm(true)}
            className="bg-green-700 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-full transition duration-200 text-sm"
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
              <button onClick={fetchRelatos} className="ml-2 underline text-red-800 hover:text-red-900">
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
                      className="mt-4 w-full max-h-[300px] object-contain rounded bg-black"
                    />
                  )}
                  <div className="mt-3 text-sm text-zinc-700">{renderLocalInfo(p)}</div>
                  {i !== posts.length - 1 && <hr className="mt-5 border-zinc-300" />}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

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

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-100 text-black w-full max-w-md rounded-md shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b bg-zinc-50">
              <h3 className="text-sm font-bold">Criar publicação</h3>
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
                      <p className="text-[11px] text-zinc-500">JPG, PNG, HEIC… (opcional)</p>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] text-zinc-600 mb-1">Latitude</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={latText}
                    onChange={(e) => setLatText(e.target.value)}
                    placeholder="-23.64601"
                    className="w-full rounded border border-zinc-300 p-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
                <div>
                  <label className="block text-[12px] text-zinc-600 mb-1">Longitude</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={lonText}
                    onChange={(e) => setLonText(e.target.value)}
                    placeholder="-46.57590"
                    className="w-full rounded border border-zinc-300 p-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 text-[13px] rounded-full border hover:bg-zinc-50">
                  Cancelar
                </button>
                <button type="submit" className="px-3 py-1.5 text-[13px] rounded-full bg-green-700 hover:bg-green-600 text-white font-semibold">
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
