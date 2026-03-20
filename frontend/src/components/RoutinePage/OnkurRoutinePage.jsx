import { useEffect, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

async function fetchDailyRoutine(accessToken) {
  const response = await fetch(`${API_BASE_URL}/routine/daily`, {
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to fetch routine: ${response.status}`);
  }
  return response.json();
}

export default function OnkurRoutinePage({ activePage = "routine", onChangePage, accessToken = "" }) {
  const [routineData, setRoutineData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRoutine = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await fetchDailyRoutine(accessToken);
      setRoutineData(data);
    } catch (err) {
      setError(err.message || "Failed to load daily routine");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoutine();
  }, [accessToken]);

  const routineLines = (routineData?.routine || "").split("\n").filter(Boolean);
  const cleanedLines = routineLines.map((line) => line.trim()).filter(Boolean);
  const isSectionLine = (line) => {
    const normalized = line.toLowerCase().replace(/[:\-]/g, "").trim();
    return line.endsWith(":") || ["morning", "afternoon", "evening"].includes(normalized);
  };
  const isTaskLine = (line) => /^[-*]\s+/.test(line);

  const groupedRoutine = [];
  let currentSection = null;

  cleanedLines.forEach((line) => {
    if (isSectionLine(line)) {
      const title = line.replace(/[:\s]+$/, "");
      currentSection = { title, plain: [], tasks: [] };
      groupedRoutine.push(currentSection);
      return;
    }

    if (!currentSection) {
      currentSection = { title: "Routine", plain: [], tasks: [] };
      groupedRoutine.push(currentSection);
    }

    if (isTaskLine(line)) {
      currentSection.tasks.push(line.replace(/^[-*]\s*/, ""));
    } else {
      currentSection.plain.push(line);
    }
  });

  return (
    <div className="min-h-screen bg-[#0f1a10] text-[#e8f5e2]">
      <header className="sticky top-0 z-40 flex flex-col gap-3 border-b border-[#2a3d2a] bg-[#0f1a10]/85 px-3 py-3 backdrop-blur-xl sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div>
            <h1 className="font-serif text-xl font-bold leading-none text-[#b8e0a0]">onkur</h1>
            <p className="text-xs text-[#7da56a]">home garden companion</p>
          </div>
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

      <div className="mx-auto max-w-4xl space-y-5 px-3 py-6 sm:px-4 sm:py-8">
        <div className="rounded-2xl border border-[#2a3d2a] bg-[#141f14] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#b8e0a0]">Daily Routine</h2>
              <p className="mt-1 text-sm text-[#7da56a]">
                AI-generated plan for your current garden, refreshed daily.
              </p>
            </div>
            <button
              onClick={loadRoutine}
              className="rounded-xl border border-[#2a3d2a] bg-[#1a2a1a] px-4 py-2 text-sm font-semibold text-[#8ab87a] transition-colors hover:border-[#5c9e4a] hover:text-[#b8e0a0]"
            >
              Refresh Routine
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-400/40 bg-red-900/20 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-[#2a3d2a] bg-[#192119] p-8 text-center text-sm text-[#8ab87a]">
            Generating today&apos;s routine...
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-[#2a3d2a] bg-[#192119] p-5">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-[#7da56a]">
                <span className="rounded-full border border-[#2a3d2a] bg-[#1a2a1a] px-2 py-1">
                  Date: {routineData?.date || "N/A"}
                </span>
                <span className="rounded-full border border-[#2a3d2a] bg-[#1a2a1a] px-2 py-1">
                  Source: {routineData?.source || "N/A"}
                </span>
                <span className="rounded-full border border-[#2a3d2a] bg-[#1a2a1a] px-2 py-1">
                  Plants: {(routineData?.plants || []).length}
                </span>
              </div>

              <div className="space-y-2">
                {routineLines.length > 0 ? (
                  <>
                    <div className="space-y-4">
                      {groupedRoutine.map((section, sectionIndex) => (
                        <div key={`${section.title}-${sectionIndex}`} className="space-y-2">
                          {section.title && (
                            <h3 className="text-sm font-semibold text-[#b8e0a0]">{section.title}</h3>
                          )}

                          {section.plain.length > 0 && (
                            <div className="space-y-1">
                              {section.plain.map((line, lineIndex) => (
                                <p
                                  key={`${line}-${lineIndex}`}
                                  className="text-sm leading-relaxed text-[#d8e7d2]"
                                >
                                  {line}
                                </p>
                              ))}
                            </div>
                          )}

                          {section.tasks.length > 0 && (
                            <ol className="space-y-2.5">
                              {section.tasks.map((task, taskIndex) => (
                                <li
                                  key={`${task}-${taskIndex}`}
                                  className="grid grid-cols-[1.75rem_1fr] items-start gap-3 rounded-lg bg-[#1a2a1a]/60 px-2.5 py-2 text-sm leading-relaxed text-[#d8e7d2]"
                                >
                                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#77b967] bg-[#5c9e4a] text-xs font-bold tabular-nums text-white">
                                    {taskIndex + 1}
                                  </span>
                                  <span className="pt-0.5">{task}</span>
                                </li>
                              ))}
                            </ol>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[#8ab87a]">No routine generated yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[#2a3d2a] bg-[#141f14] p-5">
              <h3 className="mb-2 text-sm font-semibold text-[#b8e0a0]">Plants Used For Routine</h3>
              {routineData?.plants?.length ? (
                <div className="flex flex-wrap gap-2">
                  {routineData.plants.map((plant) => (
                    <span
                      key={`${plant.name}-${plant.last_watered || "na"}`}
                      className="rounded-full border border-[#2a3d2a] bg-[#1a2a1a] px-3 py-1 text-xs text-[#8ab87a]"
                    >
                      {plant.name} 
                      <span className="text-[#7da56a]">
                        (last watered: {plant.last_watered || "unknown"}, next water: {plant.next_water_date || "unknown"})
                      </span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#7da56a]">No plants found in your garden yet.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
