import { useRef, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

async function healthAssessPlantFromImage(file, accessToken, latitude = 0, longitude = 0) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("latitude", String(latitude));
  formData.append("longitude", String(longitude));
  formData.append("similar_images", "true");
  formData.append("health", "only");

  const response = await fetch(`${API_BASE_URL}/identify/health-assessment-test-upload`, {
    method: "POST",
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Health assessment failed: ${response.status}`);
  }

  return response.json();
}

function HealthAssessmentPanel({ data }) {
  if (!data) return null;

  const status = data?.status || "UNKNOWN";
  const modelVersion = data?.model_version || "N/A";
  const isHealthy = data?.result?.is_healthy?.binary;
  const healthyProbability = Number(data?.result?.is_healthy?.probability ?? 0);
  const diseaseSuggestions = data?.result?.disease?.suggestions || [];
  const followUpQuestion = data?.result?.disease?.question;
  const geminiTips = data?.gemini_care_tips;
  const carePlan = geminiTips?.care_plan || {};
  const immediateActions = carePlan?.immediate_actions || [];
  const medicineAndTreatment = carePlan?.medicine_and_treatment || [];
  const prevention = carePlan?.prevention || [];

  return (
    <div className="mt-5 space-y-3 rounded-xl border border-[#2a3d2a] bg-[#192119] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[#2a3d2a] bg-[#1a2a1a] px-2 py-0.5 text-[11px] text-[#8ab87a]">
          Status: {status}
        </span>
        <span className="rounded-full border border-[#2a3d2a] bg-[#1a2a1a] px-2 py-0.5 text-[11px] text-[#8ab87a]">
          Model: {modelVersion}
        </span>
      </div>

      <div className="rounded-lg border border-[#2a3d2a] bg-[#1a2a1a] px-3 py-2">
        <p className="text-xs uppercase tracking-wide text-[#7da56a]">Plant Health</p>
        <p className="mt-1 font-semibold text-[#e8f5e2]">
          {isHealthy === true ? "Likely healthy" : "Likely unhealthy"}
          <span className="ml-2 text-[#8ab87a]">({Math.round(healthyProbability * 100)}% confidence)</span>
        </p>
      </div>

      {diseaseSuggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#7da56a]">Top Suggestions</p>
          {diseaseSuggestions.slice(0, 3).map((item) => (
            <div key={item.id || item.name} className="rounded-lg border border-[#2a3d2a] bg-[#1a2a1a] px-3 py-2">
              <p className="font-semibold text-[#e8f5e2]">{item.name}</p>
              <p className="text-xs text-[#8ab87a]">Probability: {Math.round(Number(item.probability || 0) * 100)}%</p>
            </div>
          ))}
        </div>
      )}

      {followUpQuestion?.text && (
        <div className="rounded-lg border border-[#2a3d2a] bg-[#1a2a1a] px-3 py-2">
          <p className="text-xs uppercase tracking-wide text-[#7da56a]">Follow-up Question</p>
          <p className="mt-1 text-[#d8e7d2]">{followUpQuestion.text}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#8ab87a]">
            {Object.entries(followUpQuestion.options || {}).map(([key, value]) => (
              <span key={key} className="rounded-full border border-[#2a3d2a] bg-[#141f14] px-2 py-0.5">
                {key}: {value?.name || value?.translation || "-"}
              </span>
            ))}
          </div>
        </div>
      )}

      {geminiTips && (
        <div className="space-y-3 rounded-lg border border-[#2a3d2a] bg-[#1a2a1a] px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#7da56a]">Gemini Care Tips</p>

          {geminiTips?.selected_disease && (
            <p className="text-sm text-[#d8e7d2]">
              Most probable disease: <span className="font-semibold text-[#e8f5e2]">{geminiTips.selected_disease}</span>
              <span className="ml-2 text-[#8ab87a]">
                ({Math.round(Number(geminiTips?.selected_probability || 0) * 100)}%)
              </span>
            </p>
          )}

          {immediateActions.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-[#7da56a]">Immediate Actions</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-[#d8e7d2]">
                {immediateActions.map((tip, index) => (
                  <li key={`immediate-${index}`}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {medicineAndTreatment.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-[#7da56a]">Medicine and Treatment</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-[#d8e7d2]">
                {medicineAndTreatment.map((tip, index) => (
                  <li key={`medicine-${index}`}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {prevention.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wide text-[#7da56a]">Prevention</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-[#d8e7d2]">
                {prevention.map((tip, index) => (
                  <li key={`prevention-${index}`}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {geminiTips?.note && <p className="text-xs text-[#8ab87a]">{geminiTips.note}</p>}
        </div>
      )}
    </div>
  );
}

export default function OnkurHealthAssessmentPage({ activePage = "health", onChangePage, accessToken = "" }) {
  const fileRef = useRef(null);
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [isAssessing, setIsAssessing] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImageFile(file);
    setMessage("");
    setResult(null);

    const reader = new FileReader();
    reader.onload = (event) => setImageUrl(event.target.result);
    reader.readAsDataURL(file);
  };

  const handleAssess = async () => {
    if (!imageFile) {
      setMessage("Upload an image first.");
      return;
    }

    try {
      setIsAssessing(true);
      setMessage("");
      const data = await healthAssessPlantFromImage(imageFile, accessToken);
      setResult(data);

      const binary = data?.result?.is_healthy?.binary;
      const probability = Number(data?.result?.is_healthy?.probability ?? 0);
      setMessage(
        `Health check completed: ${binary ? "Likely healthy" : "Likely unhealthy"} (${Math.round(
          probability * 100
        )}% confidence)`
      );
    } catch (error) {
      setResult(null);
      setMessage(error.message || "Health assessment failed.");
    } finally {
      setIsAssessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1a10] text-[#e8f5e2]">
      <header className="sticky top-0 z-40 flex flex-col gap-3 border-b border-[#2a3d2a] bg-[#0f1a10]/85 px-3 py-3 backdrop-blur-xl sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-serif text-xl font-bold leading-none text-[#b8e0a0]">onkur</h1>
          <p className="text-xs text-[#7da56a]">home garden companion</p>
        </div>

        <div className="flex w-full flex-wrap justify-center gap-2 rounded-xl border border-[#2a3d2a] bg-[#1a2a1a] p-1 sm:w-auto sm:justify-start">
          <button
            onClick={() => onChangePage?.("plants")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activePage === "plants" ? "bg-[#5c9e4a] text-white" : "text-[#8ab87a]"
            }`}
          >
            Plant Manager
          </button>
          <button
            onClick={() => onChangePage?.("routine")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activePage === "routine" ? "bg-[#5c9e4a] text-white" : "text-[#8ab87a]"
            }`}
          >
            Routine
          </button>
          <button
            onClick={() => onChangePage?.("health")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activePage === "health" ? "bg-[#5c9e4a] text-white" : "text-[#8ab87a]"
            }`}
          >
            Health
          </button>
        </div>

        <div className="hidden lg:block" />
      </header>

      <main className="mx-auto max-w-4xl px-3 py-6 sm:px-4 sm:py-8">
        <section className="rounded-2xl border border-[#2a3d2a] bg-[#141f14] p-5">
          <h2 className="font-serif text-xl font-bold text-[#b8e0a0] sm:text-2xl">Plant Health Assessment</h2>
          <p className="mt-1 text-sm text-[#7da56a]">
            Upload a plant image to run disease and health analysis with Plant.id.
          </p>

          <div
            className={`mt-5 relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-200 ${
              dragOver ? "border-[#5c9e4a]" : "border-[#2a3d2a]"
            } ${imageUrl ? "h-[180px] sm:h-[220px]" : "h-[150px] bg-[#1e2e1e] sm:h-[170px]"}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              handleFile(event.dataTransfer.files[0]);
            }}
          >
            {imageUrl ? (
              <img src={imageUrl} alt="health-assessment-preview" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-[#8ab87a]">
                <span className="text-sm font-medium">Drop photo or click to upload</span>
                <span className="text-xs opacity-60">JPG, PNG, WEBP</span>
              </div>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />

          <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              onClick={handleAssess}
              disabled={isAssessing}
              className="rounded-xl bg-linear-to-br from-[#5c9e4a] to-[#8ab87a] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAssessing ? "Checking..." : "Run Health Check"}
            </button>

            {message && <p className="text-sm text-[#8ab87a]">{message}</p>}
          </div>

          <HealthAssessmentPanel data={result} />
        </section>
      </main>
    </div>
  );
}
