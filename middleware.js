// middleware.js

import { NextResponse } from 'next/server';

/**
 * Middleware to handle CORS for API routes.
 */
export function middleware(request) {
  const response = NextResponse.next();

  // Only apply CORS headers to API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', '*'); // Adjust as needed
    response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  return response;
}

/**
 * Configure middleware to match API routes.
 */
export const config = {
  matcher: '/api/:path*',
};
