import mongoose from "mongoose";

export type UserRole = "STUDENT" | "TEACHER" | "ADMIN";

type UserDoc = {
  name: string;
  email: string;
  role: UserRole;
  passwordHash?: string;
  googleSub?: string;
  staffRoomNumber?: string;
  pointsBalance: number;
  createdAt: Date;
  updatedAt: Date;
};

const schema = new mongoose.Schema<UserDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    role: { type: String, required: true, enum: ["STUDENT", "TEACHER", "ADMIN"] },
    passwordHash: { type: String, required: false },
    googleSub: { type: String, required: false },
    staffRoomNumber: { type: String, required: false, trim: true, maxlength: 20 },
    pointsBalance: { type: Number, required: true, min: 0, default: 0 }
  },
  { timestamps: true }
);

export const User = mongoose.model<UserDoc>("User", schema);

