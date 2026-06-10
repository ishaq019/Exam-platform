process.on("message", (rows) => {
  const header = "Student Name,Email,Score,Total Marks,Status,Submitted At\n";

  const body = rows
    .map((r) =>
      [
        r.studentName,
        r.email,
        r.score,
        r.totalMarks,
        r.status,
        new Date(r.submittedAt).toLocaleString(),
      ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  process.send(header + body);
});
