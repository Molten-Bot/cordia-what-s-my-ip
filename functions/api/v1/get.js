function readCallerIp(request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    ""
  );
}

export function getCallerIp(request) {
  const ip = readCallerIp(request);
  return ip || "Unknown";
}

export function createIpResponse(request) {
  return Response.json(
    { ip: getCallerIp(request) },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

export function onRequestGet({ request }) {
  return createIpResponse(request);
}
