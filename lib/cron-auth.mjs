export function isAuthorizedCronRequest(authorization, secret) {
  if (!secret) return false;
  return authorization === `Bearer ${secret}`;
}
