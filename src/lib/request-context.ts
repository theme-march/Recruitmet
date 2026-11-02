export function requestContext(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded
    ? forwarded.split(",")[0].trim()
    : request.headers.get("x-real-ip")?.trim() || request.headers.get("cf-connecting-ip")?.trim() || undefined;

  return {
    ip: ip && ip.length <= 45 ? ip : undefined,
    userAgent: request.headers.get("user-agent")?.slice(0, 500) || undefined,
    device: request.headers.get("sec-ch-ua-platform")?.replace(/"/g, "")?.slice(0, 100) || undefined,
  };
}
