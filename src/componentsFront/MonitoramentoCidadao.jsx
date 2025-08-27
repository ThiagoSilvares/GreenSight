import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaUser, FaChartLine, FaSyncAlt, FaTrash } from "react-icons/fa";
import LogoEscrita from "../assets/LogoEscritaGreenSight.png";

const API = "http://localhost:3001/api";

const MonitoramentoCidadao = () => {
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

  const [showForm, setShowForm] = useState(false);
  const [author, setAuthor] = useState("");
  const [comment, setComment] = useState("");
  const [address, setAddress] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const r = await fetch(`${API}/relatos`);
        const data = await r.json();
        const mapped = data.map((it) => ({
          id: it.id,
          author: it.author,
          comment: it.comment,
          address: it.address,
          imageUrl: it.image_path,
          createdAt: it.created_at,
        }));
        setPosts(mapped);
      } catch (e) {
        console.error(e);
        alert("Não foi possível carregar os relatos.");
      } finally {
        setLoading(false);
      }
    })();
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
    setComment("");
    setAddress("");
    setImageFile(null);
    setImagePreview(null);
  }

  async function handlePublish(e) {
    e.preventDefault();
    if (!author.trim()) return alert("Informe seu nome.");
    if (!comment.trim() || comment.trim().length < 4)
      return alert("Descreva o que encontrou (mín. 4 caracteres).");
    if (!imageFile) return alert("Anexe uma imagem.");
    if (!address.trim()) return alert("Informe o endereço do local.");

    try {
      const form = new FormData();
      form.append("author", author.trim());
      form.append("comment", comment.trim());
      form.append("address", address.trim());
      form.append("image", imageFile);

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
        comment: saved.comment,
        address: saved.address,
        imageUrl: saved.image_path,
        createdAt: saved.created_at,
      };

      setPosts((prev) => [newPost, ...prev]);
      setShowForm(false);
      clearForm();
    } catch (err) {
      console.error(err);
      alert(err.message || "Falha ao publicar. Tente novamente.");
    }
  }

  async function handleDelete(relatoId) {
    if (!isAdmin) return;
    const ok = window.confirm("Confirma excluir este relato?");
    if (!ok) return;

    try {
      const resp = await fetch(`${API}/relatos/${relatoId}`, {
        method: "DELETE",
        headers: {
          "X-User-Email": email || "",
        },
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

  return (
    <div className="bg-black text-white min-h-screen font-sans flex flex-col">
      <header className="bg-black/70 backdrop-blur-md fixed top-0 w-full z-50 px-8 py-4 flex justify-between items-center shadow-md">
        <Link to="/" className="focus:outline-none">
          <img
            src={LogoEscrita}
            alt="Logo Escrita Green Sight"
            className="h-14 w-auto object-contain cursor-pointer"
          />
        </Link>
        <nav className="space-x-8 text-sm md:text-base font-medium tracking-wide text-zinc-100 flex items-center">
          {!isUsuarioLogado && (
            <Link
              to="/login"
              className={`${isActive("/login")} transition-all duration-200`}
            >
              <FaUser className="inline mr-1" /> Login
            </Link>
          )}
          {isUsuarioLogado && (
            <Link
              to="/dashboard"
              className={`${isActive("/dashboard")} transition-all duration-200`}
            >
              <FaChartLine className="inline mr-1" /> Dashboard
            </Link>
          )}
          <Link
            to="/monitoramento-cidadao"
            className={`${isActive(
              "/monitoramento-cidadao"
            )} transition-all duration-200`}
          >
            <FaSyncAlt className="inline mr-1" /> Monitoramento Cidadão
          </Link>
        </nav>
      </header>

      <main className="pt-28 pb-12 px-6 max-w-5xl mx-auto w-full flex-1">
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
              Ainda não há relatos.
            </div>
          ) : (
            <ul>
              {posts.map((p, i) => (
                <li key={p.id} className="px-5 py-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-lg font-semibold">{p.author}</p>
                    <div className="flex items-center gap-3">
                      <time className="text-sm text-zinc-600">
                        {getNiceDate(p.createdAt)}
                      </time>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="text-red-600 text-sm font-semibold hover:underline flex items-center gap-1"
                          title="Excluir relato"
                        >
                          <FaTrash className="inline" />
                          Excluir
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 text-base text-zinc-800 whitespace-pre-line">
                    {p.comment}
                  </p>
                  {p.imageUrl && (
                    <img
                      src={`http://localhost:3001${p.imageUrl}`}
                      alt="Imagem do relato"
                      className="mt-4 w-full max-h-[300px] object-contain rounded bg-black"
                    />
                  )}
                  <div className="mt-3 text-sm text-zinc-700">
                    <p>
                      <span className="font-semibold">Endereço:</span> {p.address}
                    </p>
                  </div>
                  {i !== posts.length - 1 && (
                    <hr className="mt-5 border-zinc-300" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="bg-black text-gray-400 text-sm py-6 border-t border-gray-700 px-6 mt-auto">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-center md:text-left">
          <div className="text-left">
            <p className="font-semibold">© 2025 GREEN SIGHT</p>
            <p>Todos os direitos reservados.</p>
          </div>
          <div className="text-center">
            <p className="italic">
              Um projeto de TCC para um futuro mais sustentável.
            </p>
          </div>
          <div className="flex justify-center md:justify-end space-x-6">
            <a href="#" className="hover:text-white">
              Privacidade
            </a>
            <a href="#" className="hover:text-white">
              Termos de Uso
            </a>
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
                <label className="block text-[12px] text-zinc-600 mb-1">
                  Seu nome
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Ex.: Primeiro e Último Nome"
                  className="w-full rounded border border-zinc-300 p-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-green-600"
                />
              </div>
              <div>
                <label className="block text-[12px] text-zinc-600 mb-1">
                  Comentário
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Ex.: Bueiro com lixo acumulado e água parada."
                  className="w-full min-h-[96px] rounded border border-zinc-300 p-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-green-600"
                  maxLength={200}
                />
                <div className="mt-1 text-right text-[11px] text-zinc-500">
                  {comment.length}/200
                </div>
              </div>
              <div>
                <label className="block text-[12px] text-zinc-600 mb-1">
                  Imagem
                </label>
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
                    <img
                      src={imagePreview}
                      alt="Pré-visualização"
                      className="max-h-52 rounded"
                    />
                  ) : (
                    <>
                      <p className="text-[13px] text-zinc-800">
                        Arraste a imagem aqui ou{" "}
                        <label
                          htmlFor="up-img"
                          className="text-green-700 underline cursor-pointer"
                        >
                          clique para selecionar
                        </label>
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        JPG, PNG, HEIC…
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[12px] text-zinc-600 mb-1">
                  Endereço
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua Exemplo, 123 — Bairro, Cidade/UF"
                  className="w-full rounded border border-zinc-300 p-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-green-600"
                />
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

export default MonitoramentoCidadao;
