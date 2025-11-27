// src/app/api/create-portal/route.js

export async function POST() {
  // simple test to prove the route exists
  return Response.json({
    url: "https://example.com",
  });
}
