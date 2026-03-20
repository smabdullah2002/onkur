import { useEffect, useState } from "react";
import "./App.css";
import OnkurPlantManager from "./components/IdentifierPage/Onkurplantmanager";
import OnkurRoutinePage from "./components/RoutinePage/OnkurRoutinePage";
import OnkurHealthAssessmentPage from "./components/HealthPage/OnkurHealthAssessmentPage";
import { supabase } from "./lib/supabaseClient";

function AuthScreen({ onAuthSuccess }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setMessage("Email and password are required.");
      return;
    }

    try {
      setIsSubmitting(true);
      setMessage("");

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        setMessage("Signup successful. Check your email for confirmation, then sign in.");
        setMode("signin");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (data.session) {
          onAuthSuccess?.(data.session);
        }
      }
    } catch (error) {
      setMessage(error.message || "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1a10] px-3 py-6 text-[#e8f5e2] sm:px-4 sm:py-10">
      <div className="mx-auto max-w-md rounded-2xl border border-[#2a3d2a] bg-[#141f14] p-5 sm:p-6">
        <h1 className="font-serif text-2xl font-bold text-[#b8e0a0]">onkur</h1>
        <p className="mt-1 text-sm text-[#7da56a]">Sign in to sync your plants with Supabase.</p>

        <div className="mt-5 mx-auto flex w-fit gap-1 rounded-lg border border-[#2a3d2a] bg-[#1a2a1a] p-0.5">
          <button
            onClick={() => setMode("signin")}
            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              mode === "signin" ? "bg-[#5c9e4a] text-white" : "text-[#8ab87a]"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              mode === "signup" ? "bg-[#5c9e4a] text-white" : "text-[#8ab87a]"
            }`}
          >
            Sign Up
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-[#2a3d2a] bg-[#1a2a1a] px-3 py-2 text-sm outline-none focus:border-[#5c9e4a]"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-[#2a3d2a] bg-[#1a2a1a] px-3 py-2 text-sm outline-none focus:border-[#5c9e4a]"
          />
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full rounded-xl bg-linear-to-br from-[#5c9e4a] to-[#8ab87a] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Please wait..." : mode === "signup" ? "Create Account" : "Sign In"}
          </button>
          {message && <p className="text-sm text-[#8ab87a]">{message}</p>}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [page, setPage] = useState("plants");
  const [session, setSession] = useState(null);
  const accessToken = session?.access_token || "";

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) setSession(data.session || null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!session) {
    return <AuthScreen onAuthSuccess={setSession} />;
  }

  return (
    <>
      <button
        onClick={async () => {
          await supabase.auth.signOut();
        }}
        className="fixed bottom-3 right-3 z-50 rounded-lg border border-[#2a3d2a] bg-[#1a2a1a] px-3 py-1.5 text-xs font-semibold text-[#8ab87a] sm:bottom-4 sm:right-4"
      >
        Sign Out
      </button>

      {page === "plants" ? (
        <OnkurPlantManager activePage={page} onChangePage={setPage} accessToken={accessToken} />
      ) : page === "routine" ? (
        <OnkurRoutinePage activePage={page} onChangePage={setPage} accessToken={accessToken} />
      ) : (
        <OnkurHealthAssessmentPage activePage={page} onChangePage={setPage} accessToken={accessToken} />
      )}
    </>
  );
}

export default App;
