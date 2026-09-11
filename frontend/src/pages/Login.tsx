import { useState, type FormEvent } from "react";
import { AlertCircle, Loader2, LogIn, LogOut } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getApiErrorMessage } from "../services/api";
import { loginApi } from "../services/api_login";
import { useAuth } from "../hooks/useAuth";

type LoginResult = {
 status: "success" | "error";
 message: string;
};

export default function Login() {
 const navigate = useNavigate();
 const [searchParams] = useSearchParams();
 const { isLoggedIn, username: currentUsername, login, logout } = useAuth();

 const [username, setUsername] = useState("");
 const [password, setPassword] = useState("");
 const [loading, setLoading] = useState(false);
 const [result, setResult] = useState<LoginResult | null>(null);
 const redirect = searchParams.get("redirect");
 const redirectPath =
 redirect && redirect.startsWith("/") && !redirect.startsWith("//")
      ? redirect
      : "/posts";

 const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
 event.preventDefault();

 const trimmedUsername = username.trim();
 if (!trimmedUsername || !password) {
 setResult({
 status: "error",
 message: "Username and password are required.",
      });
 return;
    }
 try {
 setLoading(true);
 setResult(null);
 const response = await loginApi.login({
 username: trimmedUsername,
 password,
      });
 const token =
 typeof response.token === "string" ? response.token.trim() : "";
 if (!token) {
 throw new Error("The login API did not return a valid token. Please check the backend configuration.");
      }

 setResult({
 status: "success",
 message: "Signed in successfully. Redirecting...",
      });
 login(trimmedUsername, token);
 setPassword("");
 setTimeout(() => {
 navigate(redirectPath, { replace: true });
      }, 250);
    } catch (error) {
 const message = getApiErrorMessage(error, "Sign-in failed. Please try again.");
 setResult({
 status: "error",
 message,
      });
    } finally {
 setLoading(false);
    }
  };

 return (
    <section className="mx-auto w-full max-w-2xl animate-fade-in">
      <div className="paper-sheet overflow-hidden">
        <div className="border-b border-[color:var(--hair)] px-6 py-5 dark:border-[color:var(--hair)]">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-[color:var(--ink)] ">
            <LogIn className="h-6 w-6 text-[color:var(--seal)] dark:text-[color:var(--seal)]" />
            Sign In
          </h1>
        </div>

        {isLoggedIn && (
          <div className="mx-6 mt-6 rounded-[0.14rem] border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
            <p>Signed in as: {currentUsername}</p>
            <div className="mt-3 flex gap-2">
              <Link
 to={redirectPath}
 className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-white hover:bg-green-700"
              >
                Continue
              </Link>
              <button
 type="button"
 onClick={logout}
 className="inline-flex items-center gap-1 rounded-md border border-green-400 px-3 py-1.5 hover:bg-green-100 dark:border-green-700 dark:hover:bg-green-900/30"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <div className="space-y-2">
            <label
 htmlFor="username"
 className="block text-sm font-medium text-[color:var(--ink)] "
            >
              Username
            </label>
            <input
 id="username"
 value={username}
 onChange={(event) => setUsername(event.target.value)}
 className="w-full rounded-[0.14rem] border border-[color:var(--hair)] bg-[color:var(--paper)] px-3 py-2 text-sm text-[color:var(--ink)] outline-none transition-colors focus:border-[color:var(--hair)] dark:border-[color:var(--hair)]  "
 placeholder="Enter your username"
 autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <label
 htmlFor="password"
 className="block text-sm font-medium text-[color:var(--ink)] "
            >
              Password
            </label>
            <input
 id="password"
 type="password"
 value={password}
 onChange={(event) => setPassword(event.target.value)}
 className="w-full rounded-[0.14rem] border border-[color:var(--hair)] bg-[color:var(--paper)] px-3 py-2 text-sm text-[color:var(--ink)] outline-none transition-colors focus:border-[color:var(--hair)] dark:border-[color:var(--hair)]  "
 placeholder="Enter your password"
 autoComplete="current-password"
            />
          </div>

          <button
 type="submit"
 disabled={loading}
 className="inline-flex w-full items-center justify-center gap-2 rounded-[0.14rem] bg-[color:var(--seal)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[color:var(--seal)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Sign In
              </>
            )}
          </button>

          {result && (
            <div
 className={`rounded-[0.14rem] border px-4 py-3 text-sm ${
 result.status === "success"
                  ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"
                  : "border-red-200 bg-[color:var(--seal)] text-[color:var(--seal)] dark:border-red-800 dark:bg-[color:var(--seal)]/20 dark:text-[color:var(--seal)]"
              }`}
            >
              {result.status === "error" && (
                <div className="mb-2 flex items-center gap-1.5 font-medium">
                  <AlertCircle className="h-4 w-4" />
                  Sign-in failed
                </div>
              )}

              <p>{result.message}</p>

            </div>
          )}
        </form>
      </div>
    </section>
  );
}
