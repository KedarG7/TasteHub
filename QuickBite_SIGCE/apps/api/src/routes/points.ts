import { Router } from "express";
import { z } from "zod";

import { env } from "../lib/env.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { User } from "../models/User.js";

export const pointsRouter = Router();

pointsRouter.use(requireAuth);

pointsRouter.get("/balance", async (req, res) => {
  const user = await User.findById(req.auth!.userId).lean();
  if (!user) return res.status(401).json({ error: "UNAUTHORIZED" });
  if (user.role !== "STUDENT") return res.status(403).json({ error: "FORBIDDEN" });

  return res.json({
    points: user.pointsBalance ?? 0,
    pointValuePaise: env.REWARD_POINT_VALUE_PAISE
  });
});

pointsRouter.post("/award", requireRole(["TEACHER", "ADMIN"]), async (req, res) => {
  const parsed = z
    .object({
      studentEmail: z.string().trim().toLowerCase().max(120),
      points: z.coerce.number().int().min(1).max(1000),
      note: z.string().trim().max(120).optional()
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_BODY" });

  const student = await User.findOne({ email: parsed.data.studentEmail, role: "STUDENT" });
  if (!student) return res.status(404).json({ error: "STUDENT_NOT_FOUND" });

  student.pointsBalance = (student.pointsBalance ?? 0) + parsed.data.points;
  await student.save();

  return res.json({
    ok: true,
    student: {
      id: String(student._id),
      email: student.email,
      pointsBalance: student.pointsBalance
    }
  });
});
