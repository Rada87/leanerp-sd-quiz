/**
 * Identity of one running page instance, used to gate the play queue.
 *
 * Deliberately held in memory and never persisted. Both Web Storage areas
 * leak this identity between tabs -- localStorage is shared by every tab,
 * and sessionStorage is *copied* into a duplicated tab -- which let two
 * tabs claim one identity and hand the play slot to each other, so both
 * played at once.
 *
 * Nothing is lost by not persisting it: the quiz keeps no state across a
 * reload either, so a refreshed player starts over regardless. The page's
 * pagehide handler releases the slot on the way out, and any slot that
 * escapes that expires on the server.
 */
const instanceId = crypto.randomUUID();

export function getClientId(): string {
  return instanceId;
}
