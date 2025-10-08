import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell, Legend
} from "recharts";
import {
  FaBars,
  FaTimes,
  FaMapMarkedAlt,
  FaRegCommentDots,
  FaChartBar,
  FaUser,
  FaPlus,
  FaSignOutAlt,
} from "react-icons/fa";
import LogoEscrita from "../assets/LogoEscritaGreenSight.png";

const year = new Date().getFullYear();

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
  process.env.REACT_APP_API_BASE_URL ||
  (typeof window !== "undefined" && window.__API_BASE__) ||
  "http://localhost:3001";

const API = `${String(API_BASE).replace(/\/$/, "")}/api`;

const CHART_HEIGHT = 340;

const ZONAS_ORDER = [
  { key: "leste", label: "Zona Leste", color: "#3b82f6" },
  { key: "norte", label: "Zona Norte", color: "#a855f7" },
  { key: "oeste", label: "Zona Oeste", color: "#f59e0b" },
  { key: "sul",   label: "Zona Sul",   color: "#ef4444" },
];

function LegendZonas() {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 12 }}>
      {ZONAS_ORDER.map(z => (
        <div key={z.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 12, height: 12, background: z.color,
              display: "inline-block", borderRadius: 2
            }}
          />
          <span>{z.label}</span>
        </div>
      ))}
    </div>
  );
}

const Graficos = () => {
  const navigate = useNavigate();

  const [resumo, setResumo] = useState(null);
  const [bueiros, setBueiros] = useState([]);
  const [serieAPI, setSerieAPI] = useState(null);
  const [zonasData, setZonasData] = useState(null);
  const [zonasErr, setZonasErr] = useState(null);

  const [navOpen, setNavOpen] = useState(false);
  const [mostrarConfirmacaoLogout, setMostrarConfirmacaoLogout] = useState(false);

  const isUsuarioLogado = !!localStorage.getItem("usuarioLogado");

  useEffect(() => {
    fetch(`${API}/resumo`)
      .then((r) => r.json())
      .then(setResumo)
      .catch((e) => console.error("Erro /resumo:", e));
  }, []);

  useEffect(() => {
    fetch(`${API}/bueiros_por_dia`)
      .then(async (r) => {
        if (!r.ok) throw new Error("endpoint /bueiros_por_dia indisponível");
        const data = await r.json();
        setSerieAPI(Array.isArray(data) ? data : null);
      })
      .catch(() => {
        fetch(`${API}/bueiros`)
          .then((r) => r.json())
          .then(setBueiros)
          .catch((e) => console.error("Erro fallback /bueiros:", e));
      });
  }, []);

  useEffect(() => {
    fetch(`${API}/bueiros/por-zona`)
      .then(async (r) => {
        if (!r.ok) throw new Error("endpoint /bueiros/por-zona indisponível");
        const data = await r.json();
        setZonasData(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        console.error("Erro /bueiros/por-zona:", e);
        setZonasErr("Endpoint /bueiros/por-zona indisponível");
        setZonasData(null);
      });
  }, []);

  useEffect(() => {
    const onScroll = () => setNavOpen(false);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function onlyDate(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const mapeadosSerie = useMemo(() => {
    if (Array.isArray(serieAPI) && serieAPI.length) {
      return serieAPI.map((p) => {
        const d = (p.dia || p.DIA || p.date || "").toString().slice(0, 10);
        const [yyyy, mm, dd] = d.split("-");
        return { dia: `${dd}/${mm}`, mapeados: Number(p.total_no_dia ?? p.total ?? p.count ?? 0) };
      });
    }
    const today = new Date();
    const dias = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dias.push(onlyDate(d.toISOString()));
    }
    const base = Object.fromEntries(dias.map((d) => [d, 0]));
    for (const b of bueiros || []) {
      const quando =
        b.data_monitoramento ||
        b.data_mapeamento ||
        b.data_cadastro ||
        b.created_at ||
        b.createdAt ||
        b.updated_at ||
        b.updatedAt;
      const dia = onlyDate(quando);
      if (dia && base[dia] !== undefined) base[dia] += 1;
    }
    return dias.map((d) => {
      const [yyyy, mm, dd] = d.split("-");
      return { dia: `${dd}/${mm}`, mapeados: base[d] };
    });
  }, [serieAPI, bueiros]);

  const totalAcumulado = Number(
    resumo?.total_mapeados ?? resumo?.total_monitorados ?? (bueiros?.length ?? 0)
  );
  const hasMapeados = mapeadosSerie.some((p) => p.mapeados > 0);

  const zonasAll = useMemo(() => {
    if (!Array.isArray(zonasData)) return [];

    const acc = Object.fromEntries(ZONAS_ORDER.map(z => [z.key, 0]));

    for (const z of zonasData) {
      const nome = String(z?.zona ?? z?.nome ?? "").toLowerCase().trim();
      const valor = Number(z?.total_bueiros ?? z?.total ?? 0);

      if (nome.includes("sem") && nome.includes("zona")) continue;

      const found = ZONAS_ORDER.find(cfg => nome.includes(cfg.key));
      if (found) acc[found.key] += (Number.isFinite(valor) ? valor : 0);
    }

    return ZONAS_ORDER.map(cfg => ({
      key: cfg.key,
      name: cfg.label,
      value: acc[cfg.key] ?? 0,
      color: cfg.color,
    }));
  }, [zonasData]);

  const zonasChart = useMemo(
    () => zonasAll.filter(z => z.value > 0),
    [zonasAll]
  );

  const totalZonas = useMemo(
    () => zonasAll.reduce((acc, z) => acc + (Number.isFinite(z.value) ? z.value : 0), 0),
    [zonasAll]
  );

  const handleLogout = () => {
    localStorage.removeItem("usuarioLogado");
    localStorage.removeItem("usuario");
    navigate("/");
  };

  return (
    <div className="bg-black min-h-screen text-white font-sans">
      <header className="bg-black/70 backdrop-blur-md fixed top-0 w-full z-50 px-4 md:px-8 py-3 flex items-center justify-between shadow-md">
        <Link to="/" className="focus:outline-none">
          <img
            src={LogoEscrita}
            alt="Logo Escrita Green Sight"
            className="h-10 md:h-14 w-auto object-contain cursor-pointer"
          />
        </Link>

        <nav className="hidden md:flex space-x-8 text-base font-medium tracking-wide text-zinc-100">
          {isUsuarioLogado && (
            <Link to="/mapa" className="hover:text-green-500 transition-all duration-200">
              <FaMapMarkedAlt className="inline mr-1" /> Mapa
            </Link>
          )}
          <Link to="/relatos" className="hover:text-green-500 transition-all duration-200">
            <FaRegCommentDots className="inline mr-1" /> Relatos
          </Link>
          <Link to="/graficos" className="text-green-500 transition-all duration-200 font-bold">
            <FaChartBar className="inline mr-1" /> Gráficos
          </Link>
          {!isUsuarioLogado && (
            <Link to="/login" className="hover:text-green-500 transition-all duration-200">
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

      <main className="pt-20 md:pt-24 px-6 md:px-10 pb-20 max-w-5xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-bold mb-10 text-center">
          Indicadores do Mapeamento de Bueiros
        </h1>

        <div className="bg-zinc-800 p-6 rounded-lg shadow-lg mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">
              Bueiros mapeados por dia (últimos 30 dias)
            </h2>
            <span className="text-sm text-zinc-300">
              Total mapeados:{" "}
              <span className="font-bold text-white">{totalAcumulado}</span>
            </span>
          </div>

          <div className="w-full" style={{ height: CHART_HEIGHT }}>
            {hasMapeados ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mapeadosSerie}>
                  <defs>
                    <linearGradient id="gMap" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dia" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="mapeados"
                    stroke="#22c55e"
                    fill="url(#gMap)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-300">
                Sem mapeamentos nesse período.
              </div>
            )}
          </div>
        </div>

        <div className="bg-zinc-800 p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Bueiros por zona</h2>
            <span className="text-sm text-zinc-300">
              Total somado:{" "}
              <span className="font-bold text-white">{totalZonas}</span>
            </span>
          </div>

          <div className="w-full" style={{ height: CHART_HEIGHT }}>
            {zonasErr ? (
              <div className="h-full flex items-center justify-center text-zinc-300">
                {zonasErr}. Certifique-se de expor <code>/bueiros/por-zona</code> no backend.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={zonasChart}
                  margin={{ top: 10, right: 20, left: 0, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(v) => `${v} bueiro(s)`} />
                  <Legend verticalAlign="bottom" align="center" content={<LegendZonas />} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                    {zonasChart.map((item) => (
                      <Cell key={item.key} fill={item.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </main>

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

export default Graficos;
