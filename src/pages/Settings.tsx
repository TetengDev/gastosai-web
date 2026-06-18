import { createElement, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { AVATAR_COLORS, getAvatarGradient, getInitials } from "../lib/formatters";
import { AVATAR_ICONS, avatarIconFor } from "../lib/avatarIcons";
import AiKeySection from "../components/AiKeySection";
import { startTour } from "../components/FirstRunTour";
import { Button } from "../components/ui";

export default function Settings() {
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [selectedColor, setSelectedColor] = useState<string | null>(user?.avatarColor ?? null);
  const [avatar, setAvatar] = useState<string | null>(user?.avatar ?? null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gradient = getAvatarGradient(selectedColor);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSaving(true);
    setSuccess(false);
    setError(null);
    try {
      await updateProfile({ name: name.trim(), nickname: nickname.trim(), email: email.trim(), avatarColor: selectedColor, defaultCategory: user?.defaultCategory ?? null, avatar });
      setSuccess(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string; message?: string } } })?.response?.data?.detail ??
        (err as { response?: { data?: { detail?: string; message?: string } } })?.response?.data?.message ??
        "Failed to save changes.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-edge-input bg-input px-3.5 py-3 text-sm text-ink";
  const labelClass = "mb-2 block text-sm font-medium text-ink";

  return (
    <div className="mx-auto max-w-[640px]">
      <h1 className="m-0 font-display text-4xl font-medium tracking-tight text-ink-hi md:text-[44px]">
        Settings
      </h1>
      <p className="mt-2 text-[15px] text-ink-2">Manage your profile preferences.</p>

      <section className="mt-8 rounded-2xl border border-edge bg-surface p-8">
        <div className="flex items-center gap-4 border-b border-edge-2 pb-6">
          <div className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient}`} style={{ height: 52, width: 52 }}>
            {avatarIconFor(avatar)
              ? createElement(avatarIconFor(avatar)!, { className: "h-6 w-6 text-white" })
              : <span className="select-none text-xl font-semibold text-white">{getInitials(user?.name ?? "")}</span>}
          </div>
          <div>
            <div className="font-semibold text-ink-hi">{user?.nickname || user?.name}</div>
            <div className="text-sm text-ink-2">{user?.email}</div>
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-3.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">Avatar color</p>
          <div className="flex gap-3.5">
            {AVATAR_COLORS.map(({ key, from, to }) => {
              const active = selectedColor === key || (!selectedColor && key === "violet-indigo");
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedColor(key)}
                  aria-label={`Avatar color: ${key}`}
                  className={`h-8 w-8 rounded-full bg-gradient-to-br ${from} ${to} transition-transform ${
                    active ? "ring-2 ring-ink-hi ring-offset-2 ring-offset-surface" : "opacity-60 hover:opacity-100"
                  }`}
                />
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-3.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-3">Avatar icon</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAvatar(null)}
              aria-label="No icon (use initials)"
              title="Use initials"
              className={`flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-semibold text-ink-2 transition-colors ${avatar === null ? "border-[#1f8a5b] ring-1 ring-[#1f8a5b]" : "border-edge hover:bg-surface-2"}`}
            >
              {getInitials(user?.name ?? "")}
            </button>
            {Object.entries(AVATAR_ICONS).map(([key, Ic]) => (
              <button
                key={key}
                type="button"
                onClick={() => setAvatar(key)}
                aria-label={`Avatar icon: ${key}`}
                title={key}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${avatar === key ? "border-[#1f8a5b] text-[#1f8a5b] ring-1 ring-[#1f8a5b]" : "border-edge text-ink-2 hover:bg-surface-2"}`}
              >
                <Ic className="h-[18px] w-[18px]" />
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label htmlFor="profile-email" className={labelClass}>
              Email <span className="text-alert">*</span>
            </label>
            <input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={200}
              required
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="profile-name" className={labelClass}>
              Name <span className="text-alert">*</span>
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
              placeholder="Your full name"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="profile-nickname" className={labelClass}>
              Nickname <span className="font-normal text-ink-3">(optional)</span>
            </label>
            <input
              id="profile-nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={50}
              placeholder="How the app should call you"
              className={inputClass}
            />
            <p className="mt-2 text-[13px] text-ink-3">
              When set, this is shown in the navbar and used by the chatbot to greet you.
            </p>
          </div>
          {success && <p className="text-sm font-medium text-[#1f8a5b]">Profile saved.</p>}
          {error && <p className="text-sm font-medium text-[#b30000]">{error}</p>}

          <Button type="submit" disabled={saving || !name.trim() || !email.trim()}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </section>

      <AiKeySection />

      <section className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-edge bg-surface p-8">
        <div>
          <div className="font-display text-[21px] font-medium tracking-tight text-ink-hi">Product tour</div>
          <p className="mt-1 text-sm text-ink-2">Replay the quick walkthrough of the app.</p>
        </div>
        <Button variant="secondary" type="button" onClick={startTour} className="shrink-0">
          Replay tour
        </Button>
      </section>
    </div>
  );
}
