export const OTT_PLATFORMS = ['web', 'lg_webos', 'samsung_tizen', 'ios', 'tvos', 'androidtv', 'android'];

// Keep the identifier stable for the installation, not for the signed-in account.
export function getInstallationId(platform = 'web') {
  const key = `umbral.installation.${platform}`;
  let id = globalThis.localStorage?.getItem(key);
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    globalThis.localStorage?.setItem(key, id);
  }
  return id;
}

export function readEntitlementClaims(jwtClaims) {
  const claims = jwtClaims?.app_metadata ?? {};
  const customerType = claims.customerType === 'hostelería' ? 'hosteleria' : claims.customerType;
  const deviceLimit = Number(claims.deviceLimit);
  if (!['particular', 'hosteleria'].includes(customerType) || !Number.isInteger(deviceLimit) || deviceLimit < 1) {
    throw new Error('La sesión no tiene una suscripción válida.');
  }
  return { customerType, deviceLimit };
}
