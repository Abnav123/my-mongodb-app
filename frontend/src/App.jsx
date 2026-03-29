import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://my-mongodb-app-wv5h.onrender.com";

function pickColor(index, palette) {
  const swatches = {
    nebula: ["#5a8bff", "#ff6ea8", "#31d3c6", "#ffc94a", "#b57bff", "#52a8ff"],
    citrus: ["#22c55e", "#f97316", "#eab308", "#14b8a6", "#0ea5e9", "#84cc16"],
    coral: ["#f43f5e", "#fb7185", "#f59e0b", "#f97316", "#06b6d4", "#a855f7"]
  };
  const colors = swatches[palette] || swatches.nebula;
  return colors[index % colors.length];
}

function toCsv(rows) {
  const headers = ["member_id", "owner_name", "make", "model", "year", "color", "status"];
  const escaped = (value) => {
    const text = String(value ?? "");
    if (text.includes(",") || text.includes('"') || text.includes("\n")) {
      return `"${text.replaceAll('"', '""')}"`;
    }
    return text;
  };

  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(headers.map((header) => escaped(row[header])).join(","));
  });
  return lines.join("\n");
}

export default function App() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("newest");
  const [yearMin, setYearMin] = useState("");
  const [yearMax, setYearMax] = useState("");
  const [palette, setPalette] = useState(() => localStorage.getItem("carsd-palette") || "nebula");
  const [recentOnly, setRecentOnly] = useState(false);
  const [viewMode, setViewMode] = useState("cards");

  const [form, setForm] = useState({
    member_id: "",
    owner_name: "",
    make: "",
    model: "",
    year: "",
    color: "",
    status: "ACTIVE"
  });

  const loadCars = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API_BASE_URL}/api/cars`);
      setCars(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Failed to fetch cars");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCars();
  }, []);

  useEffect(() => {
    localStorage.setItem("carsd-palette", palette);
  }, [palette]);

  const addCar = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    const payload = {
      member_id: form.member_id.trim(),
      owner_name: form.owner_name.trim(),
      make: form.make.trim(),
      model: form.model.trim(),
      year: Number(form.year),
      color: form.color.trim(),
      status: form.status
    };

    if (!payload.owner_name || !payload.make || !payload.model || !payload.year || !payload.color) {
      setError("Please fill Owner, Make, Model, Year, and Color.");
      setBusy(false);
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/api/cars`, payload);
      setForm({
        member_id: "",
        owner_name: "",
        make: "",
        model: "",
        year: "",
        color: "",
        status: "ACTIVE"
      });
      setShowForm(false);
      await loadCars();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Failed to add car");
    } finally {
      setBusy(false);
    }
  };

  const removeCar = async (id) => {
    if (!id) return;
    const confirmed = window.confirm("Remove this car from the collection?");
    if (!confirmed) return;

    setBusy(true);
    setError("");
    try {
      await axios.delete(`${API_BASE_URL}/api/cars/${id}`);
      setCars((prev) => prev.filter((car) => car._id !== id));
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Failed to remove car");
    } finally {
      setBusy(false);
    }
  };

  const addSampleCar = () => {
    const samples = [
      { owner_name: "Ariana Moss", make: "Hyundai", model: "Ioniq 5", year: "2024", color: "Matte Silver", status: "ACTIVE" },
      { owner_name: "Victor Dean", make: "Toyota", model: "Supra", year: "2023", color: "Graphite", status: "SERVICE" },
      { owner_name: "Nina Cole", make: "Kia", model: "EV6", year: "2025", color: "Aurora Green", status: "ACTIVE" }
    ];
    const item = samples[Math.floor(Math.random() * samples.length)];
    setShowForm(true);
    setForm((prev) => ({ ...prev, ...item }));
  };

  const filteredCars = useMemo(() => {
    const min = Number(yearMin) || 0;
    const max = Number(yearMax) || 9999;
    const normalizedQuery = query.trim().toLowerCase();
    const currentYear = new Date().getFullYear();

    const result = cars.filter((car) => {
      const haystack = [car.owner_name, car.make, car.model, car.color, car.member_id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const year = Number(car.year) || 0;
      const byQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      const byStatus = statusFilter === "ALL" || (car.status || "ACTIVE") === statusFilter;
      const byYear = year >= min && year <= max;
      const byRecent = !recentOnly || year >= currentYear - 2;
      return byQuery && byStatus && byYear && byRecent;
    });

    result.sort((a, b) => {
      if (sortBy === "newest") return (Number(b.year) || 0) - (Number(a.year) || 0);
      if (sortBy === "oldest") return (Number(a.year) || 0) - (Number(b.year) || 0);
      if (sortBy === "make") return String(a.make || "").localeCompare(String(b.make || ""));
      if (sortBy === "owner") return String(a.owner_name || "").localeCompare(String(b.owner_name || ""));
      if (sortBy === "color") return String(a.color || "").localeCompare(String(b.color || ""));
      return 0;
    });

    return result;
  }, [cars, query, statusFilter, sortBy, yearMin, yearMax, recentOnly]);

  const exportCsv = () => {
    const csv = toCsv(filteredCars);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "carsd-export.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const stats = useMemo(() => {
    const total = cars.length;
    const makes = new Set(cars.map((car) => car.make).filter(Boolean)).size;
    const latest = cars.reduce((max, car) => {
      const year = Number(car.year) || 0;
      return year > max ? year : max;
    }, 0);
    const active = cars.filter((car) => (car.status || "ACTIVE") === "ACTIVE").length;
    const topMake =
      Object.entries(
        cars.reduce((acc, car) => {
          const make = (car.make || "Unknown").trim() || "Unknown";
          acc[make] = (acc[make] || 0) + 1;
          return acc;
        }, {})
      ).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
    return { total, makes, latest, active, topMake };
  }, [cars]);

  const activeRate = stats.total ? Math.round((stats.active / stats.total) * 100) : 0;

  return (
    <div className={`app-shell theme-${palette}`}>
      <div className="bg-orb orb-a" />
      <div className="bg-orb orb-b" />
      <div className="bg-orb orb-c" />

      <aside className="sidebar">
        <div className="sidebar-head">
          <p className="logo-pill">Carsd Fleet Studio</p>
          <h1>Fleet Copilot</h1>
          <p>Manage your cars with a workspace inspired by conversational productivity tools.</p>
        </div>

        <div className="sidebar-actions">
          <button className="btn btn-primary" onClick={() => setShowForm((prev) => !prev)} disabled={busy || loading}>
            {showForm ? "Close Form" : "Add New Car"}
          </button>
          <button className="btn btn-soft" onClick={addSampleCar} disabled={busy}>
            Fill Sample Data
          </button>
          <button className="btn btn-soft" onClick={loadCars} disabled={busy || loading}>
            Refresh Fleet
          </button>
          <button className="btn btn-gradient" onClick={exportCsv} disabled={loading || filteredCars.length === 0}>
            Export CSV
          </button>
        </div>

        <div className="theme-stack" role="radiogroup" aria-label="Choose color theme">
          <button className={`theme-btn ${palette === "nebula" ? "active" : ""}`} onClick={() => setPalette("nebula")}>
            Nebula Mix
          </button>
          <button className={`theme-btn ${palette === "citrus" ? "active" : ""}`} onClick={() => setPalette("citrus")}>
            Citrus Pop
          </button>
          <button className={`theme-btn ${palette === "coral" ? "active" : ""}`} onClick={() => setPalette("coral")}>
            Coral Wave
          </button>
        </div>

        <section className="stats-stack">
          <article className="mini-stat">
            <h2>Fleet Size</h2>
            <strong>{loading ? "..." : stats.total}</strong>
          </article>
          <article className="mini-stat">
            <h2>Top Make</h2>
            <strong>{loading ? "..." : stats.topMake}</strong>
          </article>
          <article className="mini-stat">
            <h2>Active</h2>
            <strong>{loading ? "..." : `${activeRate}%`}</strong>
          </article>
        </section>
      </aside>

      <main className="workspace">
        <header className="workspace-header">
          <h2>Vehicle Threads</h2>
          <p>Search, filter, and curate your fleet in a colorful command center.</p>
        </header>

        <section className="control-panel" aria-label="Search and filters">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search owner, make, model, color, member ID"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="SERVICE">SERVICE</option>
          </select>
          <input type="number" placeholder="Min Year" value={yearMin} onChange={(e) => setYearMin(e.target.value)} />
          <input type="number" placeholder="Max Year" value={yearMax} onChange={(e) => setYearMax(e.target.value)} />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="newest">Sort: Newest</option>
            <option value="oldest">Sort: Oldest</option>
            <option value="make">Sort: Make A-Z</option>
            <option value="owner">Sort: Owner A-Z</option>
            <option value="color">Sort: Color A-Z</option>
          </select>
        </section>

        <section className="option-row">
          <button className={`chip-btn ${recentOnly ? "active" : ""}`} onClick={() => setRecentOnly((prev) => !prev)}>
            Recent 2 Years
          </button>
          <button className={`chip-btn ${viewMode === "cards" ? "active" : ""}`} onClick={() => setViewMode("cards")}>
            Cards View
          </button>
          <button className={`chip-btn ${viewMode === "compact" ? "active" : ""}`} onClick={() => setViewMode("compact")}>
            Compact View
          </button>
          <button
            className="chip-btn"
            onClick={() => {
              setQuery("");
              setStatusFilter("ALL");
              setYearMin("");
              setYearMax("");
              setSortBy("newest");
              setRecentOnly(false);
            }}
          >
            Reset Filters
          </button>
        </section>

        {showForm && (
          <form className="car-form" onSubmit={addCar}>
            <input
              type="text"
              placeholder="Member ID (optional)"
              value={form.member_id}
              onChange={(e) => setForm((prev) => ({ ...prev, member_id: e.target.value }))}
            />
            <input
              type="text"
              placeholder="Owner Name"
              value={form.owner_name}
              onChange={(e) => setForm((prev) => ({ ...prev, owner_name: e.target.value }))}
            />
            <input
              type="text"
              placeholder="Make"
              value={form.make}
              onChange={(e) => setForm((prev) => ({ ...prev, make: e.target.value }))}
            />
            <input
              type="text"
              placeholder="Model"
              value={form.model}
              onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
            />
            <input
              type="number"
              placeholder="Year"
              min="1900"
              max="2100"
              value={form.year}
              onChange={(e) => setForm((prev) => ({ ...prev, year: e.target.value }))}
            />
            <input
              type="text"
              placeholder="Color"
              value={form.color}
              onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
            />
            <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="SERVICE">SERVICE</option>
            </select>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "Saving..." : "Save Car"}
            </button>
          </form>
        )}

        {loading && <p className="state">Loading cars...</p>}
        {error && <p className="state error">{error}</p>}

        {!loading && !error && (
          <section className={`fleet-stream ${viewMode === "compact" ? "compact" : ""}`}>
            {filteredCars.map((car, index) => (
              <article key={car._id || index} className="car-thread" style={{ "--accent": pickColor(index, palette) }}>
                <div className="thread-head">
                  <p className="chip">{car.status || "ACTIVE"}</p>
                  <span className="thread-year">{car.year || "-"}</span>
                </div>
                <h3>{car.make || "Unknown Make"}</h3>
                <p className="model">{car.model || "Unknown Model"}</p>
                <p className="owner">Owner: {car.owner_name || "Unknown"}</p>
                <div className="thread-meta">
                  <span>{car.color || "N/A"}</span>
                  <span>{car.member_id || "No Member ID"}</span>
                </div>
                <button className="btn btn-remove" onClick={() => removeCar(car._id)} disabled={busy}>
                  Remove Car
                </button>
              </article>
            ))}

            {!filteredCars.length && (
              <article className="empty-state">
                <h3>No matching cars</h3>
                <p>Try another search phrase, switch status, or add a fresh vehicle entry.</p>
              </article>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
