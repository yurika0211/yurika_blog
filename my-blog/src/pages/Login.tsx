import { useState, type FormEvent } from "react";
import { AlertCircle, Loader2, LogIn, LogOut } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { loginApi } from "../services/api_login";
import { useAuth } from "../hooks/useAuth";

type LoginResult = {
  status: "success" | "error";
  message: string;
  raw?: unknown;
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
  const redirectPath = redirect && redirect.startsWith("/") ? redirect : "/posts";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    if (!trimmedUsername || !trimmedPassword) {
      setResult({
        status: "error",
        message: "用户名和密码不能为空",
      });
      return;
    }
    if (trimmedUsername === "admin" && trimmedPassword === "admin123") {
      setResult({
        status: "error",
        message: "检测到弱口令 admin/admin123，请先在后端修改为强密码后再登录。",
      });
      return;
    }

    try {
      setLoading(true);
      setResult(null);
      const response = await loginApi.login({
        username: trimmedUsername,
        password: trimmedPassword,
      });

      setResult({
        status: "success",
        message: "登录成功，正在跳转...",
        raw: response,
      });
      login(trimmedUsername);
      setTimeout(() => {
        navigate(redirectPath, { replace: true });
      }, 250);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "登录失败，请稍后重试";
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
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white/80 shadow-sm backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/70">
        <div className="border-b border-gray-200/80 px-6 py-5 dark:border-gray-800">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white">
            <LogIn className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            登录
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            调用接口 <code>POST http://localhost:3001/login</code>
          </p>
        </div>

        {isLoggedIn && (
          <div className="mx-6 mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
            <p>当前已登录：{currentUsername}</p>
            <div className="mt-3 flex gap-2">
              <Link
                to={redirectPath}
                className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-white hover:bg-green-700"
              >
                继续访问
              </Link>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1 rounded-md border border-green-400 px-3 py-1.5 hover:bg-green-100 dark:border-green-700 dark:hover:bg-green-900/30"
              >
                <LogOut className="h-4 w-4" />
                退出登录
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <div className="space-y-2">
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              用户名
            </label>
            <input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              placeholder="请输入用户名"
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              placeholder="请输入密码"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                登录中...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                登录
              </>
            )}
          </button>

          {result && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                result.status === "success"
                  ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300"
                  : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
              }`}
            >
              {result.status === "error" && (
                <div className="mb-2 flex items-center gap-1.5 font-medium">
                  <AlertCircle className="h-4 w-4" />
                  登录失败
                </div>
              )}

              <p>{result.message}</p>

              {result.raw !== undefined && (
                <pre className="mt-2 overflow-auto rounded bg-black/10 p-2 text-xs dark:bg-black/30">
                  {JSON.stringify(result.raw, null, 2)}
                </pre>
              )}
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
