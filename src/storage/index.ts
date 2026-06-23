import type { ScoreStorage } from "./ScoreStorage";
import { LocalStorageScoreStorage } from "./LocalStorageScoreStorage";

export const scoreStorage: ScoreStorage = new LocalStorageScoreStorage();
