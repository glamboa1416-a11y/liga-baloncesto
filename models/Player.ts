import { Schema, model, models } from "mongoose";
import { SEASON } from "@/lib/config";

const PlayerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    number: Number,
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    teamName: { type: String, required: true },
    season: { type: String, default: SEASON },
    rama: { type: String, enum: ["varonil", "femenil"], required: true },
    division: { type: Number, enum: [1, 2, 3], required: true },
    demo: { type: Boolean, default: false },
    stats: {
      gp: { type: Number, default: 0 },
      pts: { type: Number, default: 0 },
      t3: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

PlayerSchema.index({ season: 1, rama: 1, division: 1, "stats.pts": -1 });
PlayerSchema.index({ season: 1, rama: 1, division: 1, "stats.t3": -1 });
PlayerSchema.index({ teamId: 1 });

export default models.Player || model("Player", PlayerSchema);