import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AuthConfirm({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const v of value) qs.append(key, v);
    } else if (typeof value === "string") {
      qs.append(key, value);
    }
  }
  const query = qs.toString();
  redirect(query ? `/auth/callback?${query}` : "/auth/callback");
}
