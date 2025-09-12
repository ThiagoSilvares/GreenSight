import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend
} from "recharts";
import {
  FaMapMarkedAlt,
  FaRegCommentDots,
  FaChartBar,
  FaUser,
} from "react-icons/fa";
import LogoEscrita from "../assets/LogoEscritaGreenSight.png";

const API = "http://localhost:3001/api";
const CHART_HEIGHT = 340;

// paleta fixa para zonas (evita variação entre renders)
const ZONAS_COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444", "#10b981", "#06b6d4", "#e11d48"];

const Graficos = () => {
  const [resumo, setResumo] = useState(null);
  const [bueiros, setBueiros] = useState([]);       // fallback p/ série diária
  const [serieAPI, setSerieAPI] = useState(null);   // série diária da API (view)
  const [zonasData, setZonasData] = useState(null); // dados por zona
  const [zonasErr, setZonasErr] = useState(null);

  const isUsuarioLogado = !!localStorage.getItem("usuarioLogado");

  // ---- RESUMO (view resumo_bueiros)
  useEffect(() => {
    fetch(`${API}/resumo`)
      .then((r) => r.json())
      .then(setResumo)
      .catch((e) => console.error("Erro /resumo:", e));
  }, []);

  // ---- SÉRIE DIÁRIA (view bueiros_por_dia) c/ fallback em /bueiros
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

  // ---- ZONAS (usa sua rota do backend)
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

  // ---------- HELPERS ----------
  function onlyDate(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  // Série final dos últimos 30 dias (usa série da API; senão computa via /bueiros)
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

  // Normaliza dados por zona para Pizza
  const zonasPieData = useMemo(() => {
    if (!Array.isArray(zonasData)) return [];
    return zonasData.map((z) => ({
      name: z.zona ?? z.nome ?? "—",
      value: Number(z.total_bueiros ?? z.total ?? 0),
    }));
  }, [zonasData]);

  const totalZonas = zonasPieData.reduce((acc, z) => acc + (Number.isFinite(z.value) ? z.value : 0), 0);

  return (
    <div className="bg-black min-h-screen text-white font-sans">
      <header className="bg-black/70 backdrop-blur-md fixed top-0 w-full z-50 px-8 py-4 flex justify-between items-center shadow-md">
        <Link to="/" className="focus:outline-none">
          <img
            src={LogoEscrita}
            alt="Logo Escrita Green Sight"
            className="h-14 w-auto object-contain cursor-pointer"
          />
        </Link>

        <nav className="space-x-8 text-sm md:text-base font-medium tracking-wide text-zinc-100">
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
      </header>

      <main className="pt-24 px-10 pb-20 max-w-5xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-bold mb-10 text-center">
          Indicadores do Mapeamento de Bueiros
        </h1>

        {/* Série temporal */}
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

        {/* Pizza por Zonas */}
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
            ) : Array.isArray(zonasPieData) && zonasPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={zonasPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {zonasPieData.map((_, i) => (
                      <Cell key={i} fill={ZONAS_COLORS[i % ZONAS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${v} bueiro(s)`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-300">
                Sem dados por zona para exibir.
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-black text-gray-400 text-sm py-6 border-t border-gray-700 px-6 mt-auto">
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

export default Graficos;
