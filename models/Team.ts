import { Schema, model, models } from "mongoose";
import { SEASON } from "@/lib/config";

const TeamSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    logoUrl: String,
    season: { type: String, default: SEASON },
    rama: { type: String, enum: ["varonil", "femenil"], required: true },
    division: { type: Number, enum: [1, 2, 3], required: true },
    status: { type: String, enum: ["activo", "baja"], default: "activo" },
    stats: {
      g: { type: Number, default: 0 },
      p: { type: Number, default: 0 },
      j: { type: Number, default: 0 },
      pts: { type: Number, default: 0 },
      pf: { type: Number, default: 0 },
      pc: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

TeamSchema.index({ season: 1, rama: 1, division: 1, name: 1 }, { unique: true });

export default models.Team || model("Team", TeamSchema);