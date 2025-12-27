// Clerk middleware placeholder - will implement later

export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
