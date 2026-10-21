import React, { useState } from "react";
import apiClient from "../api/apiClient";
import LanguageSelector from "../components/LanguageSelector";
import { useLanguage } from "../contexts/LanguageContext";
import "./GuestPortal.css";

const messages = {
  en: { forgot: "Forgot your password?", reset: "Choose a new password", intro: "We’ll help you get back to your reservations.", email: "Email address", password: "New password", confirm: "Confirm password", send: "Send reset link", save: "Save password", wait: "Please wait…", sent: "If an account exists for this email, a reset link has been sent.", done: "Your password has been updated. You can sign in now.", invalid: "Use at least 6 characters and make sure both passwords match.", error: "Unable to complete the request. Please try again.", back: "Back to guest login" },
  it: { forgot: "Password dimenticata?", reset: "Scegli una nuova password", intro: "Ti aiutiamo a ritrovare le tue prenotazioni.", email: "Indirizzo email", password: "Nuova password", confirm: "Conferma password", send: "Invia il link", save: "Salva password", wait: "Attendi…", sent: "Se esiste un account per questa email, è stato inviato un link di recupero.", done: "Password aggiornata. Ora puoi accedere.", invalid: "Usa almeno 6 caratteri e verifica che le password coincidano.", error: "Impossibile completare la richiesta. Riprova.", back: "Torna all’accesso ospiti" },
  zh: { forgot: "忘记密码？", reset: "设置新密码", intro: "我们将帮助您重新查看预订。", email: "电子邮箱", password: "新密码", confirm: "确认密码", send: "发送重置链接", save: "保存密码", wait: "请稍候…", sent: "如果此邮箱已注册，重置链接已发送。", done: "密码已更新，现在可以登录。", invalid: "密码至少6位，并确保两次输入一致。", error: "无法完成请求，请重试。", back: "返回住客登录" },
};

const GuestPasswordForm: React.FC<{ reset?: boolean }> = ({ reset = false }) => {
  const { language } = useLanguage();
  const t = messages[language];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (reset && (password.length < 6 || password !== confirm)) { setError(t.invalid); return; }
    setBusy(true);
    try {
      if (reset) {
        const token = new URLSearchParams(window.location.search).get("token") || "";
        await apiClient.post("/guest-auth/reset-password", { token, password });
      } else {
        await apiClient.post("/guest-auth/forgot-password", { email: email.trim() });
      }
      setDone(true);
      setPassword("");
      setConfirm("");
    } catch { setError(t.error); }
    finally { setBusy(false); }
  };
  return <div className="guest-portal">
    <header className="guest-header"><div className="max-w-5xl mx-auto p-6 flex justify-between flex-wrap gap-4"><a href="/guest">{t.back}</a><LanguageSelector /></div></header>
    <main className="guest-main max-w-xl mx-auto px-6 py-10">
      <div className="guest-auth-card bg-white rounded-2xl shadow-sm">
        <h1 className="text-3xl font-serif mb-3">{reset ? t.reset : t.forgot}</h1>
        <p className="text-gray-600 mb-6">{t.intro}</p>
        {done ? <p role="status" className="text-green-800 mb-6">{reset ? t.done : t.sent}</p> :
          <form onSubmit={submit} className="space-y-4">
            {reset ? <>
              <label className="block" htmlFor="reset-password">{t.password}</label>
              <input id="reset-password" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={e => setPassword(e.target.value)} className="w-full" />
              <label className="block" htmlFor="confirm-password">{t.confirm}</label>
              <input id="confirm-password" type="password" autoComplete="new-password" minLength={6} required value={confirm} onChange={e => setConfirm(e.target.value)} className="w-full" />
            </> : <>
              <label className="block" htmlFor="recovery-email">{t.email}</label>
              <input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full" />
            </>}
            {error && <p role="alert" className="text-red-700">{error}</p>}
            <button type="submit" disabled={busy} className="w-full bg-green-900 text-white">{busy ? t.wait : reset ? t.save : t.send}</button>
          </form>}
        <a href="/guest" className="block mt-6 underline">{t.back}</a>
      </div>
    </main>
  </div>;
};
export default GuestPasswordForm;
