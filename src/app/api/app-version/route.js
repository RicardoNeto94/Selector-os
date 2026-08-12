// src/app/api/app-version/route.js

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const version =
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_DEPLOYMENT_ID ||
    process.env.VERCEL_URL ||
    "local";

  return Response.json(
    {
      version,
      deployedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    },
  );
}