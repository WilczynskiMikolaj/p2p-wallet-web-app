import { StrictMode, useEffect, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import { configured, supabase } from "./client";
import { isAdmin, safeNext, validateSignup } from "./policy";
import "./style.css";


function Home() {
  return (
    <>
      <header>
        <Link className="brand" to="/">
          ◈ P2P Wallet
        </Link>
        <Link className="button secondary" to="/login">
          Zaloguj się ↗
        </Link>
      </header>
      <main className="landing">
        <div>
          <span className="eyebrow">WSPÓLNE WYDATKI. JEDNO MIEJSCE.</span>
          <h1>
            Rozliczenia,
            <br />
            które nie dzielą.
          </h1>
          <p>
            Twój portfel w przeglądarce.
          </p>
          <Link className="button" to="/register">
            Utwórz konto →
          </Link>
          <Link className="textlink" to="/login">
            Mam już konto
          </Link>
        </div>
        <section className="hero-card">
          <span className="eyebrow">P2P WALLET / WEB</span>
          <div className="orb">◈</div>
          <h2>
            Jedno konto.
            <br />
            Dwa sposoby dostępu.
          </h2>
          <p>
            Zaloguj się danymi z telefonu.
            <br />
            Nie musisz zakładać kolejnego portfela.
          </p>
          <div className="cardline">
            Mobile <span>↔</span> Web
          </div>
        </section>
      </main>
    </>
  );
}


function AuthForm({ register = false }: { register?: boolean }) {
  const { session, ready } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  if (ready && session) return <Navigate to={next} replace />;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!supabase || busy) return;
    const values = new FormData(e.currentTarget);
    const email = String(values.get("email")).trim();
    const password = String(values.get("password"));
    const name = String(values.get("name") ?? "").trim();
    const invalid = register ? validateSignup(name, password) : null;
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = register
        ? await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { display_name: name },
              emailRedirectTo: window.location.origin + "/auth/callback",
            },
          })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) {
        setError(
          register
            ? "Nie udało się utworzyć konta. Sprawdź dane, wymagania hasła lub spróbuj później."
            : "Nie udało się zalogować. Sprawdź dane i potwierdzenie e-mail.",
        );
      } else if (register && !result.data.session)
        setMessage(
          "Sprawdź skrzynkę i potwierdź adres e-mail. Jeśli konto już istnieje, przejdź do logowania.",
        );
    } catch {
      setError("Brak połączenia. Spróbuj ponownie.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth">
      <Link className="brand" to="/">
        ◈ P2P Wallet
      </Link>
      <span className="eyebrow">TWOJE WSPÓLNE KONTO</span>
      <h1>{register ? "Zacznijmy." : "Dobrze Cię widzieć."}</h1>
      <form onSubmit={submit}>
        {register && (
          <label>
            Nazwa wyświetlana
            <input
              name="name"
              required
              maxLength={60}
              autoComplete="nickname"
            />
          </label>
        )}
        <label>
          E-mail
          <input name="email" type="email" required autoComplete="email" />
        </label>
        <label>
          Hasło
          <input
            name="password"
            type="password"
            required
            minLength={register ? 12 : 1}
            autoComplete={register ? "new-password" : "current-password"}
          />
        </label>
        {register && (
          <p className="muted">
            Minimum 12 znaków. Konto otrzymuje rolę użytkownika.
          </p>
        )}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
        <button disabled={!configured || busy}>
          {busy
            ? "Proszę czekać…"
            : register
              ? "Utwórz konto"
              : "Zaloguj się →"}
        </button>
      </form>
      <p>
        <Link to={register ? "/login" : "/register"}>
          {register
            ? "Masz konto? Zaloguj się"
            : "Nie masz konta? Zarejestruj się"}
        </Link>
      </p>
    </main>
  );
}



function Guard() {
  const { session, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <p role="status">Przywracanie sesji…</p>;
  return session ? (
    <Outlet />
  ) : (
    <Navigate
      replace
      to={"/login?next=" + encodeURIComponent(location.pathname)}
    />
  );
}




type Account = { id: string; name: string; role: "user" | "admin" };

function Shell() {
  const { session } = useAuth();
  const id = session!.user.id;
  const [account, setAccount] = useState<Account | null>(null);
  const [failure, setFailure] = useState("");
  const [retry, setRetry] = useState(0);
  const [signing, setSigning] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    const client = supabase!;
    Promise.all([
      client.from("profiles").select("display_name").eq("id", id).single(),
      client.from("user_roles").select("role").eq("user_id", id).single(),
    ])
      .then(([profile, role]) => {
        if (!active) return;
        if (
          profile.error ||
          role.error ||
          !["user", "admin"].includes(role.data?.role)
        ) {
          setFailure(
            "Nie można odczytać profilu lub roli. Sprawdź migracje, trigger rejestracji i RLS wspólnego backendu.",
          );
          return;
        }
        setFailure("");
        setAccount({
          id,
          name: profile.data.display_name,
          role: role.data.role,
        });
      })
      .catch(() => {
        if (active) setFailure("Nie udało się połączyć z backendem.");
      });
    return () => {
      active = false;
    };
  }, [id, retry]);


  async function logout() {
    setSigning(true);
    try {
      const { error } = await supabase!.auth.signOut({ scope: "local" });
      if (error) {
        setFailure("Wylogowanie nie powiodło się. Spróbuj ponownie.");
        return;
      }
      setAccount(null);
      navigate("/login", { replace: true });
    } catch {
      setFailure("Brak połączenia podczas wylogowania.");
    } finally {
      setSigning(false);
    }
  }


  const current = account?.id === id ? account : null;

  
  return (
    <div className="workspace">
      <aside>
        <Link className="brand" to="/">
          ◈ P2P Wallet
        </Link>
        <span className="eyebrow">TWOJA PRZESTRZEŃ</span>
        <nav>
          <NavLink end to="/app">
            ◉ Przegląd
          </NavLink>
          <NavLink to="/app/profile">◎ Profil</NavLink>
          <NavLink to="/app/transfers">↗ Przelewy</NavLink>
          <NavLink to="/app/history">≡ Historia</NavLink>
          <NavLink to="/app/requests">▦ Prośby o płatność</NavLink>
          {isAdmin(current?.role) && (
            <NavLink to="/app/admin">◇ Administracja</NavLink>
          )}
        </nav>
      </aside>
      <section className="content">
        <header>
          <span>Panel użytkownika</span>
          <button className="secondary" disabled={signing} onClick={logout}>
            {signing ? "Wylogowywanie…" : "Wyloguj się"}
          </button>
        </header>
        {failure ? (
          <div role="alert" className="notice">
            {failure}
            <button onClick={() => setRetry((v) => v + 1)}>Ponów odczyt</button>
          </div>
        ) : !current ? (
          <p role="status">Pobieranie profilu i roli…</p>
        ) : (
          <Outlet context={current} />
        )}
      </section>
    </div>
  );
}




import { useOutletContext } from "react-router-dom";


function Overview() {
  const a = useOutletContext<Account>();
  return (
    <>
      <span className="eyebrow">Twoje konto</span>
      <h1>Cześć, {a.name}.</h1>
      <div className="grid">
        <section className="panel accent">
          <span>STATUS KONTA</span>
          <h2>Zalogowany.</h2>
          <p>Rola: {a.role === "admin" ? "administrator" : "użytkownik"}</p>
          <Link to="/app/profile">Zobacz profil →</Link>
        </section>
        <section className="panel">
          <span>TWÓJ PORTFEL</span>
        </section>
      </div>
    </>
  );
}


function Profile() {
  const a = useOutletContext<Account>();
  const { session } = useAuth();
  return (
    <>
      <h1>Twój profil</h1>
      <section className="panel">
        <dl>
          <dt>Nazwa</dt>
          <dd>{a.name}</dd>
          <dt>E-mail</dt>
          <dd>{session?.user.email}</dd>
          <dt>Rola z bazy</dt>
          <dd>{a.role}</dd>
        </dl>
      </section>
    </>
  );
}


function Later({ title }: { title: string;}) {
  return (
    <>
      <h1>{title}</h1>
      <section className="panel">
        <h2>Tu pojawią się kolejne funkcje.</h2>
        <Link to="/app">Wróć do przeglądu →</Link>
      </section>
    </>
  );
}



function Admin() {
  const a = useOutletContext<Account>();
  return isAdmin(a.role) ? (
    <Later title="Administracja"/>
  ) : (
    <>
      <h1>Brak uprawnień</h1>
      <p>Ten widok jest dostępny tylko dla administratora.</p>
    </>
  );
}



function Callback() {
  const { ready, session } = useAuth();
  return !ready ? (
    <p>Potwierdzanie sesji…</p>
  ) : session ? (
    <Navigate replace to="/app" />
  ) : (
    <main className="auth">
      <h1>Potwierdzenie konta</h1>
      <p>
        Jeżeli adres został potwierdzony, możesz się zalogować. Link otwarty w
        innej przeglądarce może wymagać ponownego logowania.
      </p>
      <Link to="/login">Przejdź do logowania</Link>
    </main>
  );
}



function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<AuthForm />} />
      <Route path="/register" element={<AuthForm register />} />
      <Route path="/auth/callback" element={<Callback />} />
      <Route element={<Guard />}>
        <Route path="/app" element={<Shell />}>
          <Route index element={<Overview />} />
          <Route path="profile" element={<Profile />} />
          <Route path="transfers" element={<Later title="Przelewy" />} />
          <Route path="history" element={<Later title="Historia" />} />
          <Route
            path="requests"
            element={<Later title="Prośby o płatność"/>}
          />
          <Route path="admin" element={<Admin />} />
        </Route>
      </Route>
      <Route
        path="*"
        element={
          <main className="auth">
            <h1>Nie ma takiej strony.</h1>
            <Link to="/">Wróć na stronę główną</Link>
          </main>
        }
      />
    </Routes>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
