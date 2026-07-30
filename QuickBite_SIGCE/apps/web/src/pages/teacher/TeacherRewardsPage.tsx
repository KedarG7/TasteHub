import { useState } from "react";

import { apiFetch, ApiError } from "../../api/client";

export function TeacherRewardsPage() {
  const [studentEmail, setStudentEmail] = useState("");
  const [points, setPoints] = useState(10);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <div className="stack">
      <div className="card">
        <h1 className="h1">Award Points</h1>
        <p className="muted">Assign points to students for completed assignments or achievements.</p>
      </div>

      <div className="card">
        <div className="stack">
          <div className="field">
            <label>Student email</label>
            <input
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              placeholder="student@sigce.edu.in"
              type="email"
            />
          </div>

          <div className="field">
            <label>Points</label>
            <input
              value={points}
              onChange={(e) => setPoints(Math.max(1, Number(e.target.value)))}
              type="number"
              min={1}
              max={1000}
            />
          </div>

          <div className="field">
            <label>Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Assignment completion, quiz bonus, etc."
            />
          </div>

          {error ? <div className="notice danger">{error}</div> : null}
          {success ? <div className="notice">{success}</div> : null}

          <button
            className="btn primary"
            disabled={busy || !studentEmail.trim() || !points}
            onClick={async () => {
              setError(null);
              setSuccess(null);
              setBusy(true);
              try {
                const res = await apiFetch<{ student: { email: string; pointsBalance: number } }>("/api/points/award", {
                  method: "POST",
                  body: JSON.stringify({
                    studentEmail: studentEmail.trim(),
                    points,
                    note: note.trim() || undefined
                  })
                });
                setSuccess(`Awarded points. ${res.student.email} now has ${res.student.pointsBalance} points.`);
                setStudentEmail("");
                setPoints(10);
                setNote("");
              } catch (e: any) {
                setError(e instanceof ApiError ? e.message : "Failed to award points");
              } finally {
                setBusy(false);
              }
            }}
          >
            Award points
          </button>
        </div>
      </div>
    </div>
  );
}
