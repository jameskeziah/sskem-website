function publicationDay(now) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new TypeError("Programme publication checks require a valid Date.");
  }

  return now.toISOString().slice(0, 10);
}

/**
 * @param {{ validUntil: string | null }} profile
 * @param {Date} [now]
 */
export function isProgrammeProfileCurrent(profile, now = new Date()) {
  return profile.validUntil === null || profile.validUntil >= publicationDay(now);
}

/**
 * @template {{ validUntil: string | null }} T
 * @param {readonly T[]} profiles
 * @param {Date} [now]
 * @returns {T[]}
 */
export function getCurrentProgrammeProfiles(profiles, now = new Date()) {
  return profiles.filter((profile) => isProgrammeProfileCurrent(profile, now));
}

export function getProgrammePublicationDay(now = new Date()) {
  return publicationDay(now);
}
