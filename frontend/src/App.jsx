import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://my-mongodb-app-wv5h.onrender.com";

function pickColor(index) {
  const colors = ["#ff006e", "#ff9f1c", "#00c2ff", "#2ceaa3", "#fb5607", "#3a86ff"];
  return colors[index % colors.length];
}

export default function App() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [showForm, setShowForm] = useState(false);
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

  const stats = useMemo(() => {
    const total = cars.length;
    const makes = new Set(cars.map((car) => car.make).filter(Boolean)).size;
    const latest = cars.reduce((max, car) => {
      const year = Number(car.year) || 0;
      return year > max ? year : max;
    }, 0);
    return { total, makes, latest };
  }, [cars]);

  return (
    <div className="page">
      <div className="glow glow-a" />
      <div className="glow glow-b" />

      <header className="hero">
        <p className="badge">MongoDB Atlas x React</p>
        <h1>Carsd Neon Dashboard</h1>
        <p className="subtitle">Bright, fast, and connected to your live Carsd collection.</p>
        <div className="actions">
          <button className="btn btn-add" onClick={() => setShowForm((prev) => !prev)} disabled={busy || loading}>
            {showForm ? "Close Form" : "Add New Car"}
          </button>
          <button className="btn btn-refresh" onClick={loadCars} disabled={busy || loading}>
            Refresh
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
          <h2>Total Cars</h2>
          <strong>{loading ? "..." : stats.total}</strong>
        </article>
        <article className="stat-card">
          <h2>Unique Makes</h2>
          <strong>{loading ? "..." : stats.makes}</strong>
        </article>
        <article className="stat-card">
          <h2>Latest Year</h2>
          <strong>{loading ? "..." : stats.latest || "-"}</strong>
        </article>
      </section>

      {loading && <p className="state">Loading cars...</p>}
      {error && <p className="state error">{error}</p>}

      {!loading && !error && (
        <section className="grid">
          {cars.map((car, index) => (
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
        </section>
      )}
    </div>
  );
}
