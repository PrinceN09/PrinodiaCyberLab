/**
 * Provider registration. Import `registerAllProviders` once at the
 * start of any ingestion entry point (pipeline, CLI, admin route).
 *
 * Roadmap (Phase 2+):
 *   ✅ greenhouse — official public board API
 *   ✅ lever      — official public postings API
 *   ◻ ashby, smartrecruiters — official, upcoming
 *   ◻ jobbank    — Job Bank Canada RSS (no official API; documented)
 *   ◻ hiringcafe — EXPERIMENTAL unofficial endpoint. Will only ever
 *      run when HIRING_CAFE_ENABLED=true (see registry.isProviderAllowed);
 *      the application must keep working when it is unavailable.
 *   ◻ workday    — EXPERIMENTAL unofficial per-tenant endpoint, same rule.
 */
import { registerProvider } from "../registry";
import { greenhouseProvider } from "./greenhouse";
import { leverProvider } from "./lever";

let registered = false;

export function registerAllProviders(): void {
  if (registered) return;
  registered = true;
  registerProvider(greenhouseProvider);
  registerProvider(leverProvider);
}
