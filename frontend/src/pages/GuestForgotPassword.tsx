import React, { useState } from "react";
import axios from "axios";

const GuestForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await axios.post("/api/guest-auth/forgot-password", { email });
      setSent(true);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send reset email.");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Forgot Password</h2>
      {sent ? (
        <p className="text-green-600">If the email exists, a reset link has been sent.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            className="border p-2 w-full rounded"
            placeholder="Enter your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button type="submit" className="w-full py-2 bg-primary-600 text-white rounded font-bold">Send Reset Link</button>
        </form>
      )}
    </div>
  );
};

export default GuestForgotPassword;
