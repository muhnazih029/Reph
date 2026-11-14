import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { useAccount, useAccountStatus, useLogin, useRegister } from "../api/hooks";
import { sessionToken } from "../api/client";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import { Input } from "../components/ui/Input";

// Sign in — the instance's owner account. The first visit creates the
// account (one per self-hosted instance, PRD-API §2); after that it is a
// plain email + password sign-in that mints a session token.

export function LoginScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const status = useAccountStatus();
  const account = useAccount();
  const login = useLogin();
  const register = useRegister();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const creating = status.data ? !status.data.accountExists : false;
  const pending = login.isPending || register.isPending;
  const error = login.error ?? register.error;

  if (sessionToken() && account.data) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-sm text-text-muted">
          {t("account.signedInAs", { name: account.data.name })}
        </p>
        <Button onClick={() => void navigate({ to: "/" })}>{t("auth.backToApp")}</Button>
      </div>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (creating) {
      void register.mutate({ name: name.trim(), email: email.trim(), password });
      return;
    }
    void login.mutate({ email: email.trim(), password });
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-8 py-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
          <Icon name="dumbbell" size={22} />
        </span>
        <h1 className="text-2xl font-semibold md:text-[28px]">
          {creating ? t("auth.createTitle") : t("auth.title")}
        </h1>
      </div>

      <form onSubmit={submit} className="flex w-full max-w-[380px] flex-col gap-3">
        {creating ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium">{t("auth.name")}</span>
            <Input
              type="text"
              name="name"
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="bg-surface-2 text-[13px]"
            />
          </label>
        ) : null}

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium">{t("auth.email")}</span>
          <Input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="bg-surface-2 text-[13px]"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium">{t("auth.password")}</span>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete={creating ? "new-password" : "current-password"}
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="bg-surface-2 pr-10 text-[13px]"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
            >
              <Icon name={showPassword ? "eye-off" : "eye"} size={16} />
            </button>
          </div>
          <div className="min-h-[1.25rem] text-[11px] text-text-muted">
            {error ? t("auth.passwordHint") : null}
          </div>
        </label>

        <div className="min-h-[1.25rem]">
          {error ? <p className="text-sm text-danger">{error.message}</p> : null}
        </div>

        <Button
          type="submit"
          className="mt-1 min-h-13 w-full rounded-full text-base"
          loading={pending}
          disabled={pending}
        >
          {creating ? t("auth.createAccount") : t("auth.signIn")}
        </Button>
      </form>
    </div>
  );
}
