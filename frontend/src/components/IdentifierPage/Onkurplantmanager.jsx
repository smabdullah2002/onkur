import { useEffect, useRef, useState } from "react";

const sunIcon = (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const shadeIcon = (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={2}>
    <path d="M12 3a9 9 0 1 0 9 9" />
    <path d="M12 3v9l4.5 4.5" />
  </svg>
);

const dropIcon = (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={2}>
    <path d="M12 2C12 2 5 9.5 5 14a7 7 0 0 0 14 0c0-4.5-7-12-7-12z" />
  </svg>
);

const leafIcon = (
  <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={1.8}>
    <path d="M12 22c0 0-8-4-8-12C4 4 12 2 12 2s8 2 8 8c0 8-8 12-8 12z" />
    <path d="M12 22V10" />
  </svg>
);

const cameraIcon = (
  <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8" stroke="currentColor" strokeWidth={1.5}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const plusIcon = (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={2.5}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const trashIcon = (
  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth={2}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
);

const WATER_FREQ_OPTIONS = [
  { label: "Every day", value: 1 },
  { label: "Every 2 days", value: 2 },
  { label: "Every 3 days", value: 3 },
  { label: "Twice a week", value: 3.5 },
  { label: "Once a week", value: 7 },
  { label: "Every 2 weeks", value: 14 },
  { label: "Once a month", value: 30 },
];

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function toApiPayload(plant) {
  return {
    name: plant.name,
    bangla_name: plant.banglaName || null,
    water_freq: Number(plant.waterFreq),
    direct_sunlight: Boolean(plant.directSunlight),
    last_watered: plant.lastWatered || null,
    image_url: plant.imageUrl || null,
  };
}

function fromApiPlant(plant) {
  return {
    id: plant.id,
    name: plant.name,
    banglaName: plant.bangla_name,
    waterFreq: Number(plant.water_freq),
    directSunlight: Boolean(plant.direct_sunlight),
    lastWatered: plant.last_watered,
    imageUrl: plant.image_url,
    createdAt: plant.created_at,
  };
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function identifyPlantFromImage(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/identify`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Identify failed: ${response.status}`);
  }

  return response.json();
}

function formatDisplayDate(dateValue) {
  if (!dateValue) return "Not set";
  const parsedDate = dateValue instanceof Date ? dateValue : new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return "Not set";
  return parsedDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getTodayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function getNextWaterDate(lastWatered, waterFreq) {
  if (!lastWatered) return null;
  const startDate = new Date(`${lastWatered}T12:00:00`);
  if (Number.isNaN(startDate.getTime())) return null;
  const nextDate = new Date(startDate);
  nextDate.setDate(nextDate.getDate() + Math.ceil(Number(waterFreq) || 0));
  return nextDate;
}

function PlantCard({ plant, onDelete, onOpenDetails, onWaterToday }) {
  const waterLabel =
    WATER_FREQ_OPTIONS.find((option) => option.value === plant.waterFreq)?.label ||
    `Every ${plant.waterFreq} days`;
  const nextWaterDate = getNextWaterDate(plant.lastWatered, plant.waterFreq);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetails(plant)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenDetails(plant);
        }
      }}
      className="group relative overflow-hidden rounded-xl border border-[#2a3d2a]/40 bg-[#192119] shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#5c9e4a] focus:ring-offset-2 focus:ring-offset-[#0f1a10]"
    >
      <div className="relative h-40 overflow-hidden">
        {plant.imageUrl ? (
          <img
            src={plant.imageUrl}
            alt={plant.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#1e2e1e]">
            <span className="text-[#8ab87a]/50">
              <svg viewBox="0 0 64 64" fill="currentColor" className="h-16 w-16">
                <path d="M32 4C32 4 10 18 10 36a22 22 0 0 0 44 0C54 18 32 4 32 4z" opacity={0.3} />
                <path d="M32 56V28" strokeWidth={2} stroke="currentColor" fill="none" />
              </svg>
            </span>
          </div>
        )}

        <div
          className={`absolute right-3 top-3 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold backdrop-blur-sm ${
            plant.directSunlight ? "bg-amber-400/85 text-amber-900" : "bg-slate-400/80 text-slate-800"
          }`}
        >
          {plant.directSunlight ? sunIcon : shadeIcon}
          {plant.directSunlight ? "Direct Sun" : "Shade"}
        </div>
      </div>

      <div className="p-3.5">
        <h3 className="mb-1 truncate font-serif text-base font-bold leading-tight text-[#e8f5e2]">
          {plant.name}
        </h3>
        {plant.banglaName && (
          <p className="mb-1 truncate text-xs text-[#9ecb8f]">{plant.banglaName}</p>
        )}

        <div className="mt-1.5 flex items-center gap-2 text-[#8ab87a]">
          {dropIcon}
          <span className="text-xs font-medium">{waterLabel}</span>
        </div>

        <div className="mt-1 text-xs text-[#7da56a]">Last watered: {formatDisplayDate(plant.lastWatered)}</div>
        <div className="mt-1 text-xs text-[#7da56a]">Next water: {formatDisplayDate(nextWaterDate)}</div>

        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#1e2e1e]">
          <div
            className="h-full rounded-full bg-linear-to-r from-[#5c9e4a] to-[#8ab87a] transition-all duration-700"
            style={{ width: `${Math.max(10, 100 - (plant.waterFreq / 30) * 100)}%` }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onWaterToday(plant.id);
            }}
            className="rounded-lg border border-[#2a3d2a] px-2 py-1 text-xs font-semibold text-[#8ab87a] transition-colors hover:border-[#5c9e4a] hover:text-[#b8e0a0]"
          >
            Watered today
          </button>

          <button
            onClick={(event) => {
              event.stopPropagation();
              onDelete(plant.id);
            }}
            className="flex items-center gap-1 text-xs text-[#7da56a] opacity-0 transition-opacity duration-200 group-hover:opacity-60 hover:opacity-100!"
          >
            {trashIcon} Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function AddPlantModal({ onClose, onAdd, onIdentify }) {
  const [name, setName] = useState("");
  const [banglaName, setBanglaName] = useState("");
  const [waterFreq, setWaterFreq] = useState(7);
  const [directSunlight, setDirectSunlight] = useState(false);
  const [lastWatered, setLastWatered] = useState(getTodayDateValue());
  const [imageUrl, setImageUrl] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [identifyMessage, setIdentifyMessage] = useState("");
  const fileRef = useRef();

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImageFile(file);
    setIdentifyMessage("");
    const reader = new FileReader();
    reader.onload = (event) => setImageUrl(event.target.result);
    reader.readAsDataURL(file);
  };

  const handleIdentify = async () => {
    if (!imageFile) {
      setIdentifyMessage("Upload an image first, then scan.");
      return;
    }

    try {
      setIsIdentifying(true);
      setIdentifyMessage("");
      const identified = await onIdentify(imageFile);
      if (identified?.plant_name) {
        setName(identified.plant_name);
        setBanglaName(identified.bangla_name || "");
        if (identified.suggested_water_freq) {
          setWaterFreq(Number(identified.suggested_water_freq));
        }
        if (typeof identified.suggested_direct_sunlight === "boolean") {
          setDirectSunlight(identified.suggested_direct_sunlight);
        }
        const confidenceText =
          typeof identified.confidence === "number"
            ? ` (${Math.round(identified.confidence * 100)}% confidence)`
            : "";
        setIdentifyMessage(
          `AI suggestion: ${identified.plant_name}${confidenceText}${
            identified.bangla_name ? ` | Bangla: ${identified.bangla_name}` : ""
          }`
        );
      } else {
        setIdentifyMessage("Could not detect plant name. You can enter it manually.");
      }
    } catch (error) {
      setIdentifyMessage(error.message || "Plant identification failed. You can enter the name manually.");
    } finally {
      setIsIdentifying(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    handleFile(event.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    const success = await onAdd({
      name: name.trim(),
      banglaName: banglaName.trim() || null,
      waterFreq: Number(waterFreq),
      directSunlight,
      lastWatered,
      imageUrl,
    });

    if (success) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0f190f]/70 p-4 py-6 backdrop-blur-md [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:items-center"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="my-auto w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-[#2a3d2a] bg-[#192119] shadow-2xl [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex items-center gap-3 border-b border-[#2a3d2a] px-6 pb-4 pt-6">
          <span className="text-[#5c9e4a]">{leafIcon}</span>
          <h2 className="font-serif text-xl font-bold text-[#e8f5e2]">Add a new plant</h2>
        </div>

        <div className="space-y-5 p-6">
          <div
            className={`relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-200 ${
              dragOver
                ? "border-[#5c9e4a] ring-2 ring-[#5c9e4a] ring-offset-2 ring-offset-[#192119]"
                : "border-[#2a3d2a]"
            } ${imageUrl ? "h-[180px]" : "h-[140px] bg-[#1e2e1e]"}`}
            onClick={() => fileRef.current.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {imageUrl ? (
              <img src={imageUrl} alt="preview" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-[#8ab87a]">
                {cameraIcon}
                <span className="text-sm font-medium">Drop photo or click to upload</span>
                <span className="text-xs opacity-60">JPG, PNG, WEBP</span>
              </div>
            )}
            {imageUrl && (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setImageUrl(null);
                  setImageFile(null);
                }}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-xs font-bold text-white"
              >
                ✕
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => handleFile(event.target.files[0])}
          />

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#7da56a]">
              Plant Name
            </label>
            <div className="mb-2 flex items-center justify-between gap-2">
              <button
                onClick={handleIdentify}
                disabled={isIdentifying}
                className="rounded-lg border border-[#2a3d2a] bg-[#1a2a1a] px-3 py-1.5 text-xs font-semibold text-[#8ab87a] transition-colors hover:border-[#5c9e4a] hover:text-[#b8e0a0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isIdentifying ? "Scanning..." : "Scan With AI"}
              </button>
              <span className="text-[11px] text-[#7da56a]">or enter it manually below</span>
            </div>

            <input
              type="text"
              placeholder="e.g. Monstera, Peace Lily..."
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl border-[1.5px] border-[#2a3d2a] bg-[#1a2a1a] px-4 py-2.5 text-sm text-[#e8f5e2] outline-none transition-all duration-200 placeholder:text-[#7da56a]/70 focus:border-[#5c9e4a]"
            />
            {identifyMessage && <p className="mt-1.5 text-xs text-[#8ab87a]">{identifyMessage}</p>}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#7da56a]">
              Bangla Name
            </label>
            <input
              type="text"
              placeholder="e.g. মানিপ্ল্যান্ট"
              value={banglaName}
              onChange={(event) => setBanglaName(event.target.value)}
              className="w-full rounded-xl border-[1.5px] border-[#2a3d2a] bg-[#1a2a1a] px-4 py-2.5 text-sm text-[#e8f5e2] outline-none transition-all duration-200 placeholder:text-[#7da56a]/70 focus:border-[#5c9e4a]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#7da56a]">
              Watering Frequency
            </label>
            <div className="relative">
              <select
                value={waterFreq}
                onChange={(event) => setWaterFreq(event.target.value)}
                className="w-full cursor-pointer appearance-none rounded-xl border-[1.5px] border-[#2a3d2a] bg-[#1a2a1a] px-4 py-2.5 text-sm text-[#e8f5e2] outline-none transition-all duration-200 focus:border-[#5c9e4a]"
              >
                {WATER_FREQ_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8ab87a]">
                {dropIcon}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[#7da56a]">
              Sunlight Tolerance
            </label>
            <div className="flex overflow-hidden rounded-xl border-[1.5px] border-[#2a3d2a]">
              {[
                { label: "Direct Sunlight", value: true, icon: sunIcon },
                { label: "Prefers Shade", value: false, icon: shadeIcon },
              ].map((option) => (
                <button
                  key={String(option.value)}
                  onClick={() => setDirectSunlight(option.value)}
                  className={`flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-medium transition-all duration-200 ${
                    directSunlight === option.value
                      ? "bg-[#5c9e4a] text-white"
                      : "bg-[#1a2a1a] text-[#7da56a]"
                  }`}
                >
                  {option.icon} {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#7da56a]">
              Last Watered
            </label>
            <input
              type="date"
              value={lastWatered}
              onChange={(event) => setLastWatered(event.target.value)}
              className="w-full rounded-xl border-[1.5px] border-[#2a3d2a] bg-[#1a2a1a] px-4 py-2.5 text-sm text-[#e8f5e2] outline-none transition-all duration-200 focus:border-[#5c9e4a]"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border-[1.5px] border-[#2a3d2a] bg-[#1a2a1a] py-2.5 text-sm font-semibold text-[#7da56a] transition-all duration-200 hover:border-[#5c9e4a]/80"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="flex-1 rounded-xl bg-linear-to-br from-[#5c9e4a] to-[#8ab87a] px-8 py-2.5 text-sm font-bold text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Add Plant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlantDetailsModal({ plant, onClose, onWaterToday, onUpdatePlant }) {
  const [editName, setEditName] = useState(plant?.name || "");
  const [editBanglaName, setEditBanglaName] = useState(plant?.banglaName || "");
  const [editWaterFreq, setEditWaterFreq] = useState(plant?.waterFreq ?? 7);
  const [editDirectSunlight, setEditDirectSunlight] = useState(plant?.directSunlight ?? false);
  const [editLastWatered, setEditLastWatered] = useState(plant?.lastWatered || "");

  if (!plant) return null;

  const waterLabel =
    WATER_FREQ_OPTIONS.find((option) => option.value === plant.waterFreq)?.label ||
    `Every ${plant.waterFreq} days`;
  const nextWaterDate = getNextWaterDate(plant.lastWatered, plant.waterFreq);

  const handleUpdate = () => {
    if (!editName.trim()) return;
    onUpdatePlant(plant.id, {
      name: editName.trim(),
      banglaName: editBanglaName.trim() || null,
      waterFreq: Number(editWaterFreq),
      directSunlight: editDirectSunlight,
      lastWatered: editLastWatered,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0f190f]/70 p-4 py-6 backdrop-blur-md [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:items-center"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="my-auto w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-[#2a3d2a] bg-[#192119] shadow-2xl [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="relative h-50 w-full bg-[#1e2e1e]">
          {plant.imageUrl ? (
            <img src={plant.imageUrl} alt={plant.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[#8ab87a]/50">
              <svg viewBox="0 0 64 64" fill="currentColor" className="h-20 w-20">
                <path d="M32 4C32 4 10 18 10 36a22 22 0 0 0 44 0C54 18 32 4 32 4z" opacity={0.3} />
                <path d="M32 56V28" strokeWidth={2} stroke="currentColor" fill="none" />
              </svg>
            </div>
          )}

          <button
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-sm font-bold text-white"
            aria-label="Close details"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <h3 className="font-serif text-2xl font-bold text-[#e8f5e2]">{plant.name}</h3>
            {plant.banglaName && <p className="mt-1 text-sm text-[#9ecb8f]">{plant.banglaName}</p>}
            <p className="mt-1 text-sm text-[#7da56a]">Plant profile and care snapshot</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#2a3d2a] bg-[#1a2a1a] p-3">
              <p className="text-xs uppercase tracking-wide text-[#7da56a]">Watering</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#e8f5e2]">
                <span className="text-[#8ab87a]">{dropIcon}</span>
                {waterLabel}
              </p>
            </div>

            <div className="rounded-xl border border-[#2a3d2a] bg-[#1a2a1a] p-3">
              <p className="text-xs uppercase tracking-wide text-[#7da56a]">Light Preference</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#e8f5e2]">
                <span className={plant.directSunlight ? "text-amber-300" : "text-slate-300"}>
                  {plant.directSunlight ? sunIcon : shadeIcon}
                </span>
                {plant.directSunlight ? "Direct sunlight" : "Prefers shade"}
              </p>
            </div>

            <div className="rounded-xl border border-[#2a3d2a] bg-[#1a2a1a] p-3 sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-[#7da56a]">Last Watered</p>
              <p className="mt-1 text-sm font-semibold text-[#e8f5e2]">{formatDisplayDate(plant.lastWatered)}</p>
            </div>

            <div className="rounded-xl border border-[#2a3d2a] bg-[#1a2a1a] p-3 sm:col-span-2">
              <p className="text-xs uppercase tracking-wide text-[#7da56a]">Next Water Date</p>
              <p className="mt-1 text-sm font-semibold text-[#e8f5e2]">{formatDisplayDate(nextWaterDate)}</p>
            </div>
          </div>

          <div className="rounded-xl border border-[#2a3d2a] bg-[#1a2a1a] p-3 text-sm text-[#8ab87a]">
            {plant.directSunlight
              ? "Best placed near a bright window. Rotate the pot weekly for even growth."
              : "Keep in indirect light and avoid strong afternoon sun to prevent leaf stress."}
          </div>

          <div className="space-y-3 rounded-xl border border-[#2a3d2a] bg-[#1a2a1a] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#7da56a]">Update Plant Info</p>

            <input
              type="text"
              value={editName}
              onChange={(event) => setEditName(event.target.value)}
              className="w-full rounded-lg border border-[#2a3d2a] bg-[#192119] px-3 py-2 text-sm text-[#e8f5e2] outline-none transition-colors focus:border-[#5c9e4a]"
              placeholder="Plant name"
            />

            <input
              type="text"
              value={editBanglaName}
              onChange={(event) => setEditBanglaName(event.target.value)}
              className="w-full rounded-lg border border-[#2a3d2a] bg-[#192119] px-3 py-2 text-sm text-[#e8f5e2] outline-none transition-colors focus:border-[#5c9e4a]"
              placeholder="Bangla name"
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select
                value={editWaterFreq}
                onChange={(event) => setEditWaterFreq(event.target.value)}
                className="w-full rounded-lg border border-[#2a3d2a] bg-[#192119] px-3 py-2 text-sm text-[#e8f5e2] outline-none transition-colors focus:border-[#5c9e4a]"
              >
                {WATER_FREQ_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={editLastWatered}
                onChange={(event) => setEditLastWatered(event.target.value)}
                className="w-full rounded-lg border border-[#2a3d2a] bg-[#192119] px-3 py-2 text-sm text-[#e8f5e2] outline-none transition-colors focus:border-[#5c9e4a]"
              />
            </div>

            <div className="flex overflow-hidden rounded-lg border border-[#2a3d2a]">
              <button
                onClick={() => setEditDirectSunlight(true)}
                className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors ${
                  editDirectSunlight ? "bg-[#5c9e4a] text-white" : "bg-[#192119] text-[#7da56a]"
                }`}
              >
                Direct Sun
              </button>
              <button
                onClick={() => setEditDirectSunlight(false)}
                className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors ${
                  !editDirectSunlight ? "bg-[#5c9e4a] text-white" : "bg-[#192119] text-[#7da56a]"
                }`}
              >
                Prefers Shade
              </button>
            </div>

            <button
              onClick={handleUpdate}
              disabled={!editName.trim()}
              className="w-full rounded-xl bg-linear-to-br from-[#5c9e4a] to-[#8ab87a] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Update Plant
            </button>
          </div>

          <button
            onClick={() => {
              onWaterToday(plant.id);
              setEditLastWatered(getTodayDateValue());
            }}
            className="w-full rounded-xl bg-[#5c9e4a] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#538d43]"
          >
            Mark as watered today
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OnkurPlantManager() {
  const [plants, setPlants] = useState([]);
  const [isLoadingPlants, setIsLoadingPlants] = useState(true);
  const [plantsError, setPlantsError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [view, setView] = useState("grid");

  useEffect(() => {
    const loadPlants = async () => {
      try {
        setIsLoadingPlants(true);
        setPlantsError("");
        const data = await apiRequest("/plants");
        setPlants((data || []).map(fromApiPlant));
      } catch (error) {
        setPlantsError(error.message || "Failed to load plants");
      } finally {
        setIsLoadingPlants(false);
      }
    };

    loadPlants();
  }, []);

  const handleDelete = async (id) => {
    try {
      await apiRequest(`/plants/${id}`, { method: "DELETE" });
      setPlants((items) => items.filter((plant) => plant.id !== id));
      setSelectedPlant((current) => (current && current.id === id ? null : current));
    } catch (error) {
      setPlantsError(error.message || "Failed to delete plant");
    }
  };

  const handleAdd = async (plant) => {
    try {
      const created = await apiRequest("/plants", {
        method: "POST",
        body: JSON.stringify(toApiPayload(plant)),
      });
      setPlants((items) => [fromApiPlant(created), ...items]);
      setPlantsError("");
      return true;
    } catch (error) {
      setPlantsError(error.message || "Failed to save plant");
      return false;
    }
  };

  const handleWaterToday = async (id) => {
    try {
      const updated = await apiRequest(`/plants/${id}/watered-today`, { method: "PATCH" });
      const normalized = fromApiPlant(updated);
      setPlants((items) => items.map((plant) => (plant.id === id ? normalized : plant)));
      setSelectedPlant((current) => (current && current.id === id ? normalized : current));
      setPlantsError("");
    } catch (error) {
      setPlantsError(error.message || "Failed to mark plant as watered");
    }
  };

  const handleUpdatePlant = async (id, updates) => {
    try {
      const updated = await apiRequest(`/plants/${id}`, {
        method: "PATCH",
        body: JSON.stringify(toApiPayload({ ...updates })),
      });
      const normalized = fromApiPlant(updated);
      setPlants((items) => items.map((plant) => (plant.id === id ? normalized : plant)));
      setSelectedPlant((current) => (current && current.id === id ? normalized : current));
      setPlantsError("");
    } catch (error) {
      setPlantsError(error.message || "Failed to update plant");
    }
  };

  const handleIdentifyFromImage = async (file) => {
    const result = await identifyPlantFromImage(file);
    setPlantsError("");
    return result;
  };

  return (
    <>
      <div className="relative min-h-screen overflow-x-hidden bg-[#0f1a10] font-sans text-[#e8f5e2]">
        <div className="pointer-events-none fixed inset-0 z-0 opacity-60 [background:radial-gradient(circle_at_15%_20%,rgba(138,184,122,0.08),transparent_45%),radial-gradient(circle_at_85%_0%,rgba(92,158,74,0.06),transparent_35%)]" />

        <div className="relative z-10">
          <header className="sticky top-0 z-40 flex items-center justify-between border-b border-[#2a3d2a] bg-[#0f1a10]/85 px-6 py-4 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="animate-pulse text-[#5c9e4a]">
                <svg viewBox="0 0 32 32" fill="currentColor" className="h-8 w-8">
                  <path d="M16 2C16 2 4 10 4 20a12 12 0 0 0 24 0C28 10 16 2 16 2z" opacity={0.25} />
                  <path d="M16 28V14" stroke="currentColor" strokeWidth={2} fill="none" strokeLinecap="round" />
                  <path d="M16 14C16 14 10 10 8 4c4 2 8 6 8 10z" />
                  <path d="M16 18C16 18 20 14 24 10c-2 4-6 8-8 8z" opacity={0.7} />
                </svg>
              </div>
              <div>
                <h1 className="font-serif text-xl font-bold leading-none text-[#b8e0a0]">onkur</h1>
                <p className="text-xs text-[#7da56a]">home garden companion</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex gap-0.5 overflow-hidden rounded-xl border border-[#2a3d2a] bg-[#1e2e1e] p-0.5">
                {["grid", "list"].map((currentView) => (
                  <button
                    key={currentView}
                    onClick={() => setView(currentView)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                      view === currentView ? "bg-[#5c9e4a] text-white" : "text-[#7da56a]"
                    }`}
                  >
                    {currentView === "grid" ? (
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                        <rect x="1" y="1" width="6" height="6" rx="1" />
                        <rect x="9" y="1" width="6" height="6" rx="1" />
                        <rect x="1" y="9" width="6" height="6" rx="1" />
                        <rect x="9" y="9" width="6" height="6" rx="1" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                        <rect x="1" y="2" width="14" height="3" rx="1" />
                        <rect x="1" y="7" width="14" height="3" rx="1" />
                        <rect x="1" y="12" width="14" height="3" rx="1" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 rounded-xl bg-linear-to-br from-[#5c9e4a] to-[#8ab87a] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_15px_rgba(92,158,74,0.3)] transition-all duration-200 hover:opacity-90 active:scale-95"
              >
                {plusIcon}
                <span className="hidden sm:inline">Add Plant</span>
              </button>
            </div>
          </header>

          <main className="mx-auto max-w-5xl px-4 py-8">
            {plantsError && (
              <div className="mb-4 rounded-xl border border-red-400/40 bg-red-900/20 px-4 py-3 text-sm text-red-200">
                {plantsError}
              </div>
            )}

            <div className="mb-8 flex flex-wrap items-center gap-6 rounded-2xl border border-[#2a3d2a] bg-[#141f14] p-4">
              {[
                { label: "Total Plants", value: plants.length, color: "#5c9e4a" },
                { label: "Direct Sun", value: plants.filter((plant) => plant.directSunlight).length, color: "#e8a030" },
                { label: "Shade Lovers", value: plants.filter((plant) => !plant.directSunlight).length, color: "#8ab87a" },
                { label: "Daily Waterers", value: plants.filter((plant) => plant.waterFreq <= 2).length, color: "#60a5fa" },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center gap-3">
                  <div className="h-8 w-2 rounded-full" style={{ background: stat.color }} />
                  <div>
                    <div className="font-serif text-xl font-bold leading-none" style={{ color: stat.color }}>
                      {stat.value}
                    </div>
                    <div className="mt-0.5 text-xs text-[#7da56a]">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {isLoadingPlants ? (
              <div className="py-16 text-center text-sm text-[#8ab87a]">Loading plants...</div>
            ) : plants.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-4 py-24">
                <div className="text-[#2a3d2a]/60">
                  <svg viewBox="0 0 80 80" fill="currentColor" className="h-20 w-20">
                    <path d="M40 8C40 8 16 24 16 44a24 24 0 0 0 48 0C64 24 40 8 40 8z" opacity={0.2} />
                    <path d="M40 68V36" stroke="currentColor" strokeWidth={2.5} fill="none" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="font-serif text-lg font-semibold text-[#7da56a]">Your garden is empty</p>
                <p className="text-sm text-[#7da56a]/70">Add your first plant to get started</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-2 flex items-center gap-2 rounded-2xl bg-[#5c9e4a] px-6 py-3 font-semibold text-white transition-all duration-200 hover:bg-[#538d43]"
                >
                  {plusIcon} Add your first plant
                </button>
              </div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {plants.map((plant) => (
                  <PlantCard
                    key={plant.id}
                    plant={plant}
                    onDelete={handleDelete}
                    onOpenDetails={setSelectedPlant}
                    onWaterToday={handleWaterToday}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {plants.map((plant) => (
                  <div
                    key={plant.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedPlant(plant)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedPlant(plant);
                      }
                    }}
                    className="group flex items-center gap-3 rounded-xl border border-[#2a3d2a] bg-[#192119] px-3 py-2.5 transition-all duration-200 hover:translate-x-1 hover:border-[#5c9e4a] focus:outline-none focus:ring-2 focus:ring-[#5c9e4a] focus:ring-offset-2 focus:ring-offset-[#0f1a10]"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#1e2e1e]">
                      {plant.imageUrl ? (
                        <img src={plant.imageUrl} alt={plant.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[#8ab87a]/50">
                          {leafIcon}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate font-serif text-sm font-semibold text-[#e8f5e2]">{plant.name}</div>
                      {plant.banglaName && (
                        <div className="mt-0.5 truncate text-xs text-[#9ecb8f]">{plant.banglaName}</div>
                      )}
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-[#7da56a]">
                        {dropIcon}
                        {WATER_FREQ_OPTIONS.find((option) => option.value === plant.waterFreq)?.label ||
                          `Every ${plant.waterFreq} days`}
                      </div>
                      <div className="mt-0.5 text-xs text-[#7da56a]">Last watered: {formatDisplayDate(plant.lastWatered)}</div>
                      <div className="mt-0.5 text-xs text-[#7da56a]">
                        Next water: {formatDisplayDate(getNextWaterDate(plant.lastWatered, plant.waterFreq))}
                      </div>
                    </div>

                    <div
                      className={`flex shrink-0 items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                        plant.directSunlight
                          ? "border-amber-300/30 bg-amber-400/15 text-amber-300"
                          : "border-[#2a3d2a] bg-slate-400/10 text-[#7da56a]"
                      }`}
                    >
                      {plant.directSunlight ? sunIcon : shadeIcon}
                      {plant.directSunlight ? "Direct Sun" : "Shade"}
                    </div>

                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleWaterToday(plant.id);
                      }}
                      className="rounded-lg border border-[#2a3d2a] px-2 py-1 text-xs font-semibold text-[#8ab87a] transition-colors hover:border-[#5c9e4a] hover:text-[#b8e0a0]"
                    >
                      Watered
                    </button>

                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDelete(plant.id);
                      }}
                      className="rounded-lg p-2 text-[#7da56a] opacity-0 transition-opacity group-hover:opacity-50 hover:opacity-100!"
                    >
                      {trashIcon}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {showModal && (
        <AddPlantModal
          onClose={() => setShowModal(false)}
          onAdd={handleAdd}
          onIdentify={handleIdentifyFromImage}
        />
      )}
      {selectedPlant && (
        <PlantDetailsModal
          key={selectedPlant.id}
          plant={selectedPlant}
          onClose={() => setSelectedPlant(null)}
          onWaterToday={handleWaterToday}
          onUpdatePlant={handleUpdatePlant}
        />
      )}
    </>
  );
}
