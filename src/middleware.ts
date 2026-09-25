import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // 1. Tenta pegar o parâmetro 'ref' da URL (ex: ?ref=JOAO123)
  const refCode = request.nextUrl.searchParams.get("ref");

  // 2. Se existir um código, gravamos no Cookie
  if (refCode) {
    // Definimos o cookie 'affiliate_code'
    response.cookies.set({
      name: "affiliate_code",
      value: refCode,
      path: "/", // Disponível em todo o site
      maxAge: 60 * 60 * 24 * 30, // 30 dias em segundos
      httpOnly: true, // Segurança: o JavaScript do front não consegue alterar manualmente
      secure: process.env.NODE_ENV === "production", // Só https em produção
      sameSite: "lax",
    });
  }

  return response;
}

// Configuração para não rodar o middleware em arquivos estáticos (imagens, css, etc)
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};