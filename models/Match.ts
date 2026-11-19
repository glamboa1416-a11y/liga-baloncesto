import { Schema, model, models } from "mongoose";
import { SEASON } from "@/lib/config";

const SideSchema = new Schema(
  {
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    teamName: { type: String, required: true },
    score: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const PlayerLineSchema = new Schema(
  {
    playerId: { type: Schema.Types.ObjectId, ref: "Player", required: true },
    name: { type: String, required: true },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    pts: { type: Number, default: 0, min: 0 },
    t3: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const MatchSchema = new Schema(
  {
    season: { type: String, default: SEASON },
    rama: { type: String, enum: ["varonil", "femenil"], required: true },
    division: { type: Number, enum: [1, 2, 3], required: true },
    jornada: { type: Number, required: true, min: 1 },
    date: { type: String, default: "" }, // YYYY-MM-DD
    home: { type: SideSchema, required: true },
    away: { type: SideSchema, required: true },
    players: { type: [PlayerLineSchema], default: [] },
  },
  { timestamps: true }
);

MatchSchema.index({ season: 1, rama: 1, division: 1, jornada: 1 });

export default models.Match || model("Match", MatchSchema);
