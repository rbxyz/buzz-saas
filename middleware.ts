import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const publicPages = ['/'] // A página de login é a única página pública

export async function middleware(req: NextRequest) {
  try {
    const token = req.cookies.get('auth_token')?.value
    const isPublicPage = publicPages.includes(req.nextUrl.pathname)

    if (!token && !isPublicPage) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    // Proteger as rotas de documentação
    if (req.nextUrl.pathname.startsWith('/docs') && !token) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    const response = NextResponse.next()

    // Configurar headers de cache para assets estáticos
    if (req.nextUrl.pathname.startsWith("/_next/static/")) {
      response.headers.set("Cache-Control", "public, max-age=31536000, immutable")
    }

    // Configurar headers de compressão
    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("X-Frame-Options", "DENY")
    response.headers.set("X-XSS-Protection", "1; mode=block")

    // Headers de performance
    response.headers.set("X-DNS-Prefetch-Control", "on")

    return response
  } catch (error) {
    console.error('Erro no middleware:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
    // Adiciona as rotas de documentação ao matcher
    '/docs/:path*',
  ],
}
