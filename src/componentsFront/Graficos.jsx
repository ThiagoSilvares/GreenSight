import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell
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

function useIsMobile(bp = 480) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth <= bp : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= bp);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [bp]);
  return isMobile;
}

const MUNICIPIOS_ORDER = [
  { key: "sao_caetano_do_sul", label: "São Caetano do Sul",     color: "#86F773"},
  { key: "sao_bernardo_do_campo", label: "São Bernardo do Campo", color: "#37E727" },
  { key: "santo_andre", label: "Santo André",                   color: "#00AC00" },
  { key: "diadema",     label: "Diadema",                       color: "#00721C" },
];

function LegendMunicipios() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16, marginTop: 12 }}>
      {MUNICIPIOS_ORDER.map(m => (
        <div key={m.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 12, height: 12, background: m.color,
              display: "inline-block", borderRadius: 2
            }}
          />
          <span>{m.label}</span>
        </div>
      ))}
    </div>
  );
}

function onlyDate(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function buildConfHistFromArray(arr, field = "conf") {
  const buckets = [
    { key: "0-20",   label: "0–20%",   min: 0.0,  max: 0.2,  count: 0 },
    { key: "20-40",  label: "20–40%",  min: 0.2,  max: 0.4,  count: 0 },
    { key: "40-60",  label: "40–60%",  min: 0.4,  max: 0.6,  count: 0 },
    { key: "60-80",  label: "60–80%",  min: 0.6,  max: 0.8,  count: 0 },
    { key: "80-100", label: "80–100%", min: 0.8,  max: 1.01, count: 0 },
  ];

  for (const it of arr || []) {
    const v = Number(it?.[field]);
    if (!Number.isFinite(v)) continue;
    if (v < 0 || v > 1.01) continue;
    const b =
      v < 0.2 ? 0 :
      v < 0.4 ? 1 :
      v < 0.6 ? 2 :
      v < 0.8 ? 3 : 4;
    buckets[b].count += 1;
  }

  const total = buckets.reduce((s, b) => s + b.count, 0) || 1;
  return {
    total,
    data: buckets.map(b => ({
      faixa: b.label,
      count: b.count,
      pct: Math.round((b.count / total) * 100),
      key: b.key,
    }))
  };
}

const CONF_COLORS = {
  "0-20":   "#90FF17",
  "20-40":  "#00C16C",
  "40-60":  "#00755C",
  "60-80":  "#016B2B",
  "80-100": "#365415",
};

const CONF_ORDER = [
  { key: "0-20",   label: "0–20%" },
  { key: "20-40",  label: "20–40%" },
  { key: "40-60",  label: "40–60%" },
  { key: "60-80",  label: "60–80%" },
  { key: "80-100", label: "80–100%" },
];

function LegendConfianca() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16, marginTop: 12 }}>
      {CONF_ORDER.map(item => (
        <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 12, height: 12, background: CONF_COLORS[item.key],
              display: "inline-block", borderRadius: 2
            }}
          />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

const Graficos = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile(480);
  const CHART_HEIGHT = isMobile ? 260 : 340;

  const [resumo, setResumo] = useState(null);
  const [bueiros, setBueiros] = useState([]);
  const [serieAPI, setSerieAPI] = useState(null);

  const [municipiosData, setMunicipiosData] = useState(null);
  const [municipiosErr, setMunicipiosErr] = useState(null);

  const [confData, setConfData] = useState(null);
  const [confErr, setConfErr] = useState(null);

  const [navOpen, setNavOpen] = useState(false);
  const [mostrarConfirmacaoLogout, setMostrarConfirmacaoLogout] = useState(false);

  const isUsuarioLogado = !!localStorage.getItem("usuarioLogado");

  const isActive = (path) =>
    location.pathname === path ? "text-green-500" : "hover:text-green-500";

  useEffect(() => {
    fetch(`${API}/resumo`)
      .then((r) => r.json())
      .then(setResumo)
      .catch((e) => console.error("Erro /resumo:", e));
  }, []);

  useEffect(() => {
    fetch(`${API}/bueiros_por_dia`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Não foi possível obter dados de bueiros por dia.");
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
    fetch(`${API}/bueiros/por-municipio`)
      .then(async (r) => {
        if (!r.ok) throw new Error("Não foi possível obter dados de bueiros por município.");
        const data = await r.json();
        setMunicipiosData(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        console.error("Erro /bueiros/por-municipio:", e);
        setMunicipiosErr("Não foi possível obter dados de bueiros por município.");
        setMunicipiosData(null);
      });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function getConf() {
      const tries = [
        `${API}/analiticos/deteccoes/conf-hist`,
        `${API}/deteccoes/resumo_conf`,
      ];

      for (const url of tries) {
        try {
          const r = await fetch(url);
          if (!r.ok) continue;
          const data = await r.json();
          if (cancelled) return;
          if (Array.isArray(data)) {
            const built = buildConfHistFromArray(data, "conf");
            setConfData(built);
            setConfErr(null);
            return;
          }
          if (data?.data && Array.isArray(data.data)) {
            setConfData({
              total: Number(data.total ?? data.data.reduce((s, d) => s + Number(d.count || 0), 0)),
              data: data.data.map(d => ({
                faixa: d.faixa || d.label,
                count: Number(d.count || 0),
                pct: Number(d.pct || Math.round(((d.count || 0) / (data.total || 1)) * 100)),
                key: d.key || String(d.faixa || d.label || ""),
              })),
            });
            setConfErr(null);
            return;
          }
        } catch (_) {}
      }

      try {
        const r = await fetch(`${API}/deteccoes?limit=2000`);
        if (r.ok) {
          const list = await r.json();
          if (!cancelled) {
            const built = buildConfHistFromArray(Array.isArray(list) ? list : [], "conf");
            setConfData(built);
            setConfErr(null);
            return;
          }
        }
      } catch (_) {}

      try {
        const r = await fetch(`${API}/bueiros`);
        if (r.ok) {
          const list = await r.json();
          if (!cancelled) {
            const built = buildConfHistFromArray(Array.isArray(list) ? list : [], "conf");
            setConfData(built);
            setConfErr(null);
            return;
          }
        }
      } catch (e) {}

      if (!cancelled) setConfErr("Não foi possível obter dados de confiança.");
    }

    getConf();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onScroll = () => setNavOpen(false);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const mapeadosSerie = useMemo(() => {
    if (Array.isArray(serieAPI) && serieAPI.length) {
      return serieAPI.map((p) => {
        const d = (p.dia || p.DIA || p.date || "").toString().slice(0, 10);
        const [, mm, dd] = d.split("-");
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
      const [, mm, dd] = d.split("-");
      return { dia: `${dd}/${mm}`, mapeados: base[d] };
    });
  }, [serieAPI, bueiros]);

  const totalAcumulado = Number(
    resumo?.total_mapeados ?? resumo?.total_monitorados ?? (bueiros?.length ?? 0)
  );
  const hasMapeados = mapeadosSerie.some((p) => p.mapeados > 0);

  const municipiosAll = useMemo(() => {
    if (!Array.isArray(municipiosData)) return [];

    const acc = Object.fromEntries(MUNICIPIOS_ORDER.map(m => [m.key, 0]));

    for (const row of municipiosData) {
      const nome = String(row?.municipio ?? row?.nome ?? "").toLowerCase().trim();
      const valor = Number(row?.total ?? row?.total_bueiros ?? 0);

      let key = null;
      if (nome.includes("são caetano")) key = "sao_caetano_do_sul";
      else if (nome.includes("bernardo")) key = "sao_bernardo_do_campo";
      else if (nome.includes("santo andr") || nome.includes("santo andré")) key = "santo_andre";
      else if (nome.includes("diadema")) key = "diadema";

      if (key && Number.isFinite(valor)) acc[key] += valor;
    }

    return MUNICIPIOS_ORDER.map(cfg => ({
      key: cfg.key,
      name: cfg.label,
      value: acc[cfg.key] ?? 0,
      color: cfg.color,
    }));
  }, [municipiosData]);

  const municipiosChart = useMemo(
    () => municipiosAll.filter(m => m.value > 0),
    [municipiosAll]
  );

  const totalMunicipios = useMemo(
    () => municipiosAll.reduce((acc, m) => acc + (Number.isFinite(m.value) ? m.value : 0), 0),
    [municipiosAll]
  );

  const handleLogout = () => {
    localStorage.removeItem("usuarioLogado");
    localStorage.removeItem("usuario");
    navigate("/");
  };

  const tickStyle = { fontSize: isMobile ? 10 : 12 };
  const dateTickGap = isMobile ? 24 : 8;

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

        <nav className="hidden md:flex space-x-8 text-base font-medium tracking-wide text-zinc-100 items-center">
          {isUsuarioLogado && (
            <Link to="/mapa" className={`${isActive("/mapa")} transition-all duration-200`}>
              <FaMapMarkedAlt className="inline mr-1" /> Mapa
            </Link>
          )}
          <Link to="/relatos" className={`${isActive("/relatos")} transition-all duration-200`}>
            <FaRegCommentDots className="inline mr-1" /> Relatos
          </Link>
          <Link to="/graficos" className={`${isActive("/graficos")} transition-all duration-200`}>
            <FaChartBar className="inline mr-1" /> Gráficos
          </Link>

          {isUsuarioLogado ? (
            <>
              <Link
                to="/cadastro-bueiros"
                className={`${isActive("/cadastro-bueiros")} transition-all duration-200`}
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
                className={`flex items-center gap-2 py-2 ${isActive("/graficos")}`}
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
                    className={`w-full text-left flex items-center gap-2 py-2 ${isActive("/cadastro-bueiros")}`}
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

      <main className="pt-20 md:pt-24 px-4 md:px-10 pb-20 max-w-5xl mx-auto">
        <h1 className="text-3xl md:text-5xl font-bold mb-6 md:mb-10 text-left">
          Indicadores de Mapeamento
        </h1>

        <section className="bg-zinc-800 p-4 md:p-6 rounded-lg shadow-lg mb-8 md:mb-10">
          <div className="flex items-start md:items-center justify-between mb-3 md:mb-4">
            <h2 className="text-xl md:text-2xl font-semibold">
              Bueiros mapeados por dia (últimos 30 dias)
            </h2>
            <span className="text-xs md:text-sm text-zinc-300">
              Total mapeados:{" "}
              <span className="font-bold text-white">{totalAcumulado}</span>
            </span>
          </div>

          <div className="w-full" style={{ height: CHART_HEIGHT }}>
            {hasMapeados ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={mapeadosSerie}
                  margin={{ top: 8, right: isMobile ? 8 : 16, left: isMobile ? 0 : 8, bottom: 8 }}
                >
                  <defs>
                    <linearGradient id="gMap" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dia" tick={tickStyle} minTickGap={dateTickGap} />
                  <YAxis allowDecimals={false} tick={tickStyle} />
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
              <div className="h-full flex items-center justify-center text-zinc-300 text-sm md:text-base">
                Sem mapeamentos nesse período.
              </div>
            )}
          </div>
        </section>

        <section className="bg-zinc-800 p-4 md:p-6 rounded-lg shadow-lg mb-8 md:mb-10">
          <div className="flex items-start md:items-center justify-between mb-3 md:mb-4">
            <h2 className="text-xl md:text-2xl font-semibold">
              Distribuição de confiança (qualidade das detecções)
            </h2>
            <span className="text-xs md:text-sm text-zinc-300">
              Total de detecções:{" "}
              <span className="font-bold text-white">{confData?.total ?? 0}</span>
            </span>
          </div>

          <div className="w-full" style={{ height: CHART_HEIGHT }}>
            {confErr ? (
              <div className="h-full flex items-center justify-center text-zinc-300 text-sm md:text-base">
                {confErr}
              </div>
            ) : confData?.data?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={confData.data}
                  margin={{ top: 8, right: isMobile ? 8 : 16, left: isMobile ? 0 : 8, bottom: 8 }}
                  barCategoryGap={isMobile ? "30%" : "20%"}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="faixa" tick={tickStyle} interval={isMobile ? 0 : 0} />
                  <YAxis allowDecimals={false} tick={tickStyle} />
                  <Tooltip
                    formatter={(value, name, props) => {
                      const pct = props?.payload?.pct ?? 0;
                      return [`${value} detecções (${pct}%)`, "Contagem"];
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                    {confData.data.map((d) => (
                      <Cell key={d.key} fill={CONF_COLORS[d.key] || "#22c55e"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-300 text-sm md:text-base">
                Sem dados de confiança disponíveis.
              </div>
            )}
          </div>

          <LegendConfianca />
        </section>

        <section className="bg-zinc-800 p-4 md:p-6 rounded-lg shadow-lg">
          <div className="flex items-start md:items-center justify-between mb-3 md:mb-4">
            <h2 className="text-xl md:text-2xl font-semibold">Bueiros por município</h2>
            <span className="text-xs md:text-sm text-zinc-300">
              Total somado:{" "}
              <span className="font-bold text-white">{totalMunicipios}</span>
            </span>
          </div>

          <div className="w-full" style={{ height: CHART_HEIGHT }}>
            {municipiosErr ? (
              <div className="h-full flex items-center justify-center text-zinc-300 text-sm md:text-base">
                {municipiosErr}. Certifique-se de expor <code>/bueiros/por-municipio</code> no backend.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={municipiosChart}
                  margin={{ top: 8, right: isMobile ? 8 : 16, left: isMobile ? 0 : 8, bottom: 8 }}
                  barCategoryGap={isMobile ? "30%" : "20%"}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={tickStyle} interval={isMobile ? 0 : 0} />
                  <YAxis allowDecimals={false} tick={tickStyle} />
                  <Tooltip formatter={(v) => `${v} bueiro(s)`} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                    {municipiosChart.map((item) => (
                      <Cell key={item.key} fill={item.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <LegendMunicipios />
        </section>
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
