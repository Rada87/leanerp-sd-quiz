import type { ScoreStorage } from "./ScoreStorage";
import { SupabaseScoreStorage } from "./SupabaseScoreStorage";
import { LocalStorageScoreStorage } from "./LocalStorageScoreStorage";
import { FallbackScoreStorage } from "./FallbackScoreStorage";

export const scoreStorage: ScoreStorage = new FallbackScoreStorage(
  new SupabaseScoreStorage(),
  new LocalStorageScoreStorage()
);
