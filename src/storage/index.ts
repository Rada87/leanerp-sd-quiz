import type { ScoreStorage } from "./ScoreStorage";
import { ApiScoreStorage } from "./ApiScoreStorage";
import { LocalStorageScoreStorage } from "./LocalStorageScoreStorage";
import { FallbackScoreStorage } from "./FallbackScoreStorage";

export const scoreStorage: ScoreStorage = new FallbackScoreStorage(
  new ApiScoreStorage(),
  new LocalStorageScoreStorage()
);
