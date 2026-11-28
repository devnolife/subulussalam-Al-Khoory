import type { Role } from "@/lib/permissions";

type LoginValues = { username: string; password: string };

export async function trialLoginValues(
  role: Role,
  form: FormData,
  pick: (() => Promise<Credential | null>) | null,
): Promise<LoginValues | null> {
  const username = form.get("username");
  const password = form.get("password");
  if (typeof username === "string" && username.trim().toLowerCase() === role && typeof password === "string" && password) {
    return { username: role, password };
  }
  const saved = await pick?.();
  if (!saved || saved.type !== "password" || saved.id.trim().toLowerCase() !== role) return null;
  if (!("password" in saved) || typeof saved.password !== "string" || !saved.password) return null;
  return { username: role, password: saved.password };
}

export function browserPasswordPicker(): (() => Promise<Credential | null>) | null {
  if (!window.isSecureContext || !("PasswordCredential" in window) || !navigator.credentials?.get) return null;
  const options: CredentialRequestOptions & { password: true } = { password: true, mediation: "optional" };
  return () => navigator.credentials.get(options);
}
