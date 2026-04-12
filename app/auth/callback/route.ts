import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/connexion?error=missing_code`);
  }

  // Déléguer l'échange de code au client browser (localStorage)
  return NextResponse.redirect(`${origin}/auth/confirm?code=${code}`);
}
