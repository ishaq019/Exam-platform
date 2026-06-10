import React, { useContext, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import Loader from "../../components/Loader";
import ReportTable from "../../components/ReportTable";
import api from "../../services/api";
import { AuthContext } from "../../context/AuthContext";

const completionColors = ["#2563eb", "#10b981", "#f59e0b"];
const scoreColors = ["#0f766e", "#0891b2", "#6366f1", "#be185d"];

const METRIC_CONFIG = {
  assigned:               { label: "Assigned",       accent: "primary" },
  attempted:              { label: "Attempted",       accent: "success" },
  totalSubmittedAttempts: { label: "Submitted",       accent: "success" },
  pending:                { label: "Pending",         accent: "warning" },
  highest:                { label: "Highest Score",   accent: "primary" },
  lowest:                 { label: "Lowest Score",    accent: "error"   },
  average:                { label: "Average Score",   accent: "warning" },
};

const camelToLabel = (key) =>
  key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());

const getDifficultyClass = (difficulty) => {
  if (!difficulty) return "";
  const d = difficulty.toLowerCase();
  if (d === "easy") return "difficulty-easy";
  if (d === "medium") return "difficulty-medium";
  if (d === "hard") return "difficulty-hard";
  return "";
};

const getPerfBadgeClass = (label) => {
  if (!label || label === "-") return "perf-badge perf-badge-default";
  const l = label.toLowerCase();
  if (l.includes("easy") || l.includes("good") || l.includes("high")) return "perf-badge perf-badge-good";
  if (l.includes("medium") || l.includes("average") || l.includes("moderate")) return "perf-badge perf-badge-average";
  if (l.includes("hard") || l.includes("poor") || l.includes("low")) return "perf-badge perf-badge-poor";
  return "perf-badge perf-badge-default";
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatPercent = (value) => `${toNumber(value)}%`;

const cleanQuestionText = (text) => {
  if (!text) return "";
  return String(text).replace(/<\/?p>/gi, "").trim();
};

export default function ExamReport() {
  const { examId } = useParams();
  const { token } = useContext(AuthContext);
  const completionChartRef = useRef(null);
  const scoreChartRef = useRef(null);
  const questionChartRef = useRef(null);

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completionWidth, setCompletionWidth] = useState(0);
  const [scoreWidth, setScoreWidth] = useState(0);
  const [questionWidth, setQuestionWidth] = useState(0);


  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true);

        const res = await api.get(`/reports/exams/${examId}`);
        setReport(res.data);
      } catch (error) {
        void error;
        setReport(null);
      } finally {
        setLoading(false);
      }
    };

    if (examId && token) {
      fetchReport();
    }
  }, [examId, token]);

  useEffect(() => {
    const chartRefs = [
      [completionChartRef, setCompletionWidth],
      [scoreChartRef, setScoreWidth],
      [questionChartRef, setQuestionWidth],
    ];

    const measure = (element, setWidth) => {
      if (!element) return;
      setWidth(Math.floor(element.getBoundingClientRect().width));
    };

    chartRefs.forEach(([ref, setWidth]) => {
      measure(ref.current, setWidth);
    });

    if (typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(() => {
      chartRefs.forEach(([ref, setWidth]) => {
        measure(ref.current, setWidth);
      });
    });

    chartRefs.forEach(([ref]) => {
      if (ref.current) observer.observe(ref.current);
    });

    return () => observer.disconnect();
  }, [report]);

  const download = async () => {
    try {
      const res = await api.get(`/reports/exams/${examId}/export`, {
        responseType: "blob",
      });

      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");

      a.href = url;
      a.download = "exam-report.csv";
      a.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      void error;
    }
  };

  if (loading) return <Loader />;

  if (!report) {
    return (
      <div className="card">
        <h3>Unable to load report</h3>
        <p className="muted">
          Please check whether the backend server is running and the report API
          is returning data.
        </p>
      </div>
    );
  }

  const summary = report.summary || {};
  const charts = report.charts || {};
  const rows = Array.isArray(report.rows) ? report.rows : [];
  const questionAnalysis = Array.isArray(report.questionAnalysis)
    ? report.questionAnalysis
    : [];

  const completionData =
    Array.isArray(charts.completion) && charts.completion.length
      ? charts.completion.map((item) => ({
          name: item.name || item.label || item.status || "Unknown",
          value: toNumber(item.value ?? item.count ?? item.total),
        }))
      : [
          {
            name: "Assigned",
            value: toNumber(summary.assigned),
          },
          {
            name: "Attempted",
            value: toNumber(summary.attempted),
          },
          {
            name: "Pending",
            value: Math.max(
              toNumber(summary.assigned) - toNumber(summary.attempted),
              0
            ),
          },
        ];

  const scoreBands =
    Array.isArray(charts.scoreBands) && charts.scoreBands.length
      ? charts.scoreBands.map((item) => ({
          name: item.name || item.label || item.range || "Unknown",
          value: toNumber(item.value ?? item.count ?? item.students),
        }))
      : (() => {
          const bands = [
            { name: "0-39%", value: 0 },
            { name: "40-59%", value: 0 },
            { name: "60-79%", value: 0 },
            { name: "80-100%", value: 0 },
          ];

          rows.forEach((row) => {
            const score = toNumber(row.score);
            const totalMarks = toNumber(row.totalMarks);

            if (!totalMarks) return;

            const percentage = (score / totalMarks) * 100;

            if (percentage < 40) bands[0].value += 1;
            else if (percentage < 60) bands[1].value += 1;
            else if (percentage < 80) bands[2].value += 1;
            else bands[3].value += 1;
          });

          return bands;
        })();

  const questionAccuracy =
    Array.isArray(charts.questionAccuracy) && charts.questionAccuracy.length
      ? charts.questionAccuracy.map((item, index) => ({
          name:
            item.name ||
            item.label ||
            `Q${item.questionNo || item.questionNumber || index + 1}`,
          accuracy: toNumber(
            item.accuracy ?? item.accuracyRate ?? item.percentage
          ),
        }))
      : questionAnalysis.map((item, index) => ({
          name: `Q${item.questionNo || index + 1}`,
          accuracy: toNumber(item.accuracyRate ?? item.accuracy),
        }));

  const hasCompletionData = completionData.some((entry) => entry.value > 0);
  const hasScoreData = scoreBands.some((entry) => entry.value > 0);
  const hasQuestionAccuracyData = questionAccuracy.length > 0;

  return (
    <div className="report-layout">
      <div className="page-header">
        <div>
          <p className="eyebrow">Exam Analytics</p>
          <h2>Exam Report</h2>
        </div>
        <div className="actions">
          <button onClick={download}>Download CSV</button>
          <Link className="text-link" to="/admin/exams">
            Back to exams
          </Link>
        </div>
      </div>

      <div className="stat-grid report-stat-grid">
        {Object.entries(summary).map(([key, value]) => {
          const config = METRIC_CONFIG[key] || {};
          const label = config.label || camelToLabel(key);
          const accent = config.accent || "primary";
          return (
            <div className={`stat-card stat-card-accent-${accent}`} key={key}>
              <div className="stat-card-label">{label}</div>
              <div className="stat-card-value">{value}</div>
            </div>
          );
        })}
      </div>

      <div className="chart-grid">
        <div className="card chart-card">
          <h3>Completion Status</h3>
          <div className="chart-scroll" ref={completionChartRef}>
            {hasCompletionData && completionWidth > 0 ? (
              <PieChart width={completionWidth} height={300}>
                <Pie
                  data={completionData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={80}
                  outerRadius={135}
                  paddingAngle={4}
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {completionData.map((entry, index) => (
                    <Cell
                      key={`${entry.name}-${index}`}
                      fill={completionColors[index % completionColors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            ) : hasCompletionData ? (
              <div className="chart-empty-state">
                <p className="muted">Loading chart…</p>
              </div>
            ) : (
              <div className="chart-empty-state">
                <p className="muted">No assignment data available</p>
                <div className="chart-empty-state-items">
                  {completionData.map((item) => (
                    <div key={item.name}>
                      {item.name}: <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card chart-card">
          <h3>Score Distribution</h3>
          <div className="chart-scroll" ref={scoreChartRef}>
            {hasScoreData && scoreWidth > 0 ? (
              <BarChart
                width={scoreWidth}
                height={300}
                data={scoreBands}
                margin={{ top: 24, right: 20, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="value"
                  name="Students"
                  fill={scoreColors[0]}
                  radius={[8, 8, 0, 0]}
                  maxBarSize={70}
                >
                  <LabelList dataKey="value" position="top" />
                </Bar>
              </BarChart>
            ) : hasScoreData ? (
              <div className="chart-empty-state">
                <p className="muted">Loading chart…</p>
              </div>
            ) : (
              <div className="chart-empty-state">
                <p className="muted">No score data available</p>
                <div className="chart-empty-state-items">
                  {scoreBands.map((item) => (
                    <div key={item.name}>
                      {item.name}: <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card chart-card question-chart-card">
          <h3>Question-wise Accuracy</h3>
          <div className="chart-scroll" ref={questionChartRef}>
            {hasQuestionAccuracyData && questionWidth > 0 ? (
              <BarChart
                width={questionWidth}
                height={320}
                data={questionAccuracy}
                margin={{ top: 28, right: 24, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="accuracy"
                  name="Accuracy %"
                  fill={scoreColors[2]}
                  radius={[8, 8, 0, 0]}
                  maxBarSize={60}
                >
                  <LabelList
                    dataKey="accuracy"
                    position="top"
                    formatter={formatPercent}
                  />
                </Bar>
              </BarChart>
            ) : hasQuestionAccuracyData ? (
              <div className="chart-empty-state chart-empty-state-tall">
                <p className="muted">Loading chart…</p>
              </div>
            ) : (
              <div className="chart-empty-state chart-empty-state-tall">
                <div>
                  <p className="muted">No question accuracy data available</p>
                  {questionAnalysis.length > 0 && (
                    <div className="chart-empty-state-items chart-empty-state-scroll">
                      {questionAnalysis.map((item, index) => (
                        <div key={item.questionId || index}>
                          Q{item.questionNo || index + 1}:{" "}
                          <strong>
                            {toNumber(item.accuracyRate ?? item.accuracy)}%
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card report-section-card">
        <div className="report-section-header">
          <h3>Question Performance Analysis</h3>
        </div>
        {questionAnalysis.length ? (
          <div className="table-scroll">
            <table className="question-analysis-table">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Difficulty</th>
                  <th>Attended</th>
                  <th>Correct</th>
                  <th>Wrong</th>
                  <th>Skipped</th>
                  <th>Marked</th>
                  <th>Work Area</th>
                  <th>Accuracy</th>
                  <th>Performance</th>
                </tr>
              </thead>
              <tbody>
                {questionAnalysis.map((item, index) => (
                  <tr key={item.questionId || index}>
                    <td>
                      <strong>Q{item.questionNo || index + 1}</strong>
                      <span className="muted question-cell-text">
                        {cleanQuestionText(item.questionText)}
                      </span>
                    </td>
                    <td>
                      <span className={`question-difficulty ${getDifficultyClass(item.difficulty)}`}>
                        {item.difficulty || "—"}
                      </span>
                    </td>
                    <td>
                      {toNumber(item.attended)}/{toNumber(item.totalAttempts)}
                    </td>
                    <td className="cell-success">{toNumber(item.correct)}</td>
                    <td className="cell-error">{toNumber(item.wrong)}</td>
                    <td>{toNumber(item.skipped)}</td>
                    <td>{toNumber(item.markedForReview)}</td>
                    <td>{toNumber(item.workAreaUsed)}</td>
                    <td>
                      <strong>{toNumber(item.accuracyRate ?? item.accuracy)}%</strong>
                    </td>
                    <td>
                      <span className={getPerfBadgeClass(item.performanceLabel)}>
                        {item.performanceLabel || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No questions are available for this exam.</p>
        )}
      </div>

      <div className="card report-section-card">
        <div className="report-section-header">
          <h3>Attempt Details</h3>
        </div>
        <ReportTable rows={rows} />
      </div>
    </div>
  );
}