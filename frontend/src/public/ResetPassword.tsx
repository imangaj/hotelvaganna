import React, { useEffect, useState } from "react";
import { guestAuthAPI, hotelProfileAPI } from "../api/endpoints";

const ResetPassword: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Get token from URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await hotelProfileAPI.get();
        setProfile(res.data || null);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      await guestAuthAPI.resetPassword({ token, newPassword });
      setSuccess(true);
      // Redirect to guest portal after 3 seconds
      setTimeout(() => {
        window.location.href = "/guest-portal";
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to reset password. The link may have expired.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const title = profile?.websiteTitle || profile?.name || "Guest Portal";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="font-bold text-lg" style={{ color: profile?.primaryColor || "#2E5D4B" }}>
            {title}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="/" className="text-gray-600 hover:text-gray-900">Back to website</a>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="bg-white p-6 rounded-lg shadow-sm max-w-md mx-auto">
          <h2 className="text-2xl font-bold mb-2">Reset Password</h2>
          <p className="text-sm text-gray-500 mb-6">
            Enter your new password below.
          </p>

          {success ? (
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <p className="text-green-800 text-sm font-semibold mb-2">Password reset successful!</p>
              <p className="text-green-700 text-sm">You can now login with your new password. Redirecting...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  className="w-full border rounded px-3 py-2"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  className="w-full border rounded px-3 py-2"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={submitting}
                />
              </div>
              {error && <div className="text-red-600 text-sm">{error}</div>}
              <button
                type="submit"
                className="w-full py-2 rounded text-white font-semibold disabled:opacity-50"
                style={{ background: profile?.primaryColor || "#2E5D4B" }}
                disabled={submitting}
              >
                {submitting ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default ResetPassword;
