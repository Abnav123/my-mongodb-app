import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://my-mongodb-app-wv5h.onrender.com";

function pickColor(index) {
  const colors = ["#f5f5f5", "#d4d4d4", "#a3a3a3", "#737373", "#e5e5e5", "#bdbdbd"];
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
  const [palette, setPalette] = useState(() => localStorage.getItem("carsd-palette") || "black");

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

    const result = cars.filter((car) => {
      const haystack = [car.owner_name, car.make, car.model, car.color, car.member_id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const year = Number(car.year) || 0;
      const byQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      const byStatus = statusFilter === "ALL" || (car.status || "ACTIVE") === statusFilter;
      const byYear = year >= min && year <= max;
      return byQuery && byStatus && byYear;
    });

    result.sort((a, b) => {
      if (sortBy === "newest") return (Number(b.year) || 0) - (Number(a.year) || 0);
      if (sortBy === "oldest") return (Number(a.year) || 0) - (Number(b.year) || 0);
      if (sortBy === "make") return String(a.make || "").localeCompare(String(b.make || ""));
      if (sortBy === "owner") return String(a.owner_name || "").localeCompare(String(b.owner_name || ""));
      return 0;
    });

    return result;
  }, [cars, query, statusFilter, sortBy, yearMin, yearMax]);

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
    <div className={`page theme-${palette}`}>
      <div className="glow glow-a" />
      <div className="glow glow-b" />
      <div className="mesh mesh-a" />
      <div className="mesh mesh-b" />

      <header className="hero">
        <p className="badge">Carsd Fleet Studio</p>
        <h1>Drive Your Collection Like a Pro</h1>
        <p className="subtitle">One visual command center for inventory, owners, and instant fleet insights.</p>

        <div className="palette-row" role="radiogroup" aria-label="Choose color theme">
          <button className={`swatch swatch-black ${palette === "black" ? "active" : ""}`} onClick={() => setPalette("black")}>
            Black Theme
          </button>
        </div>

        <div className="actions">
          <button className="btn btn-add" onClick={() => setShowForm((prev) => !prev)} disabled={busy || loading}>
            {showForm ? "Close Form" : "Add New Car"}
          </button>
          <button className="btn btn-ghost" onClick={addSampleCar} disabled={busy}>
            Fill Sample
          </button>
          <button className="btn btn-refresh" onClick={loadCars} disabled={busy || loading}>
            Refresh
          </button>
          <button className="btn btn-export" onClick={exportCsv} disabled={loading || filteredCars.length === 0}>
            Export CSV
          </button>
        </div>
      </header>

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
          <button className="btn btn-add" type="submit" disabled={busy}>
            {busy ? "Saving..." : "Save Car"}
          </button>
        </form>
      )}

      <section className="stats-grid">
        <article className="stat-card">
          <h2>Fleet Size</h2>
          <strong>{loading ? "..." : stats.total}</strong>
        </article>
        <article className="stat-card">
          <h2>Unique Makes</h2>
          <strong>{loading ? "..." : stats.makes}</strong>
        </article>
        <article className="stat-card">
          <h2>Newest Model Year</h2>
          <strong>{loading ? "..." : stats.latest || "-"}</strong>
        </article>
        <article className="stat-card">
          <h2>Top Make</h2>
          <strong>{loading ? "..." : stats.topMake}</strong>
        </article>
        <article className="stat-card">
          <h2>Active Vehicles</h2>
          <strong>{loading ? "..." : `${activeRate}%`}</strong>
        </article>
      </section>

      <section className="toolbar" aria-label="Search and filters">
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
        </select>
      </section>

      {loading && <p className="state">Loading cars...</p>}
      {error && <p className="state error">{error}</p>}

      {!loading && !error && (
        <section className="grid">
          {filteredCars.map((car, index) => (
            <article key={car._id || index} className="card" style={{ "--accent": pickColor(index) }}>
              <p className="chip">{car.status || "ACTIVE"}</p>
              <h3>{car.make || "Unknown Make"}</h3>
              <p className="model">{car.model || "Unknown Model"}</p>
              <div className="meta">
                <span>{car.year || "-"}</span>
                <span>{car.color || "N/A"}</span>
              </div>
              <p className="owner">Owner: {car.owner_name || "Unknown"}</p>
              <button className="btn btn-remove" onClick={() => removeCar(car._id)} disabled={busy}>
                Remove Car
              </button>
            </article>
          ))}
          {!filteredCars.length && (
            <article className="empty-state">
              <h3>No matching cars</h3>
              <p>Try clearing filters, adjusting years, or adding a new vehicle.</p>
              <button
                className="btn btn-refresh"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("ALL");
                  setYearMin("");
                  setYearMax("");
                  setSortBy("newest");
                }}
              >
                Reset Filters
              </button>
            </article>
          )}
        </section>
      )}
    </div>
  );
}
