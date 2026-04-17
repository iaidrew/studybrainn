import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import TopBar from "@/components/TopBar";
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function Quiz() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState(null);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]); // {correct, correct_index, explanation}
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const loadQuiz = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`/topics/${topicId}/quiz`);
      setQuiz(data);
    } catch {
      toast.error("Could not generate quiz");
      navigate(`/topic/${topicId}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadQuiz(); /* eslint-disable-next-line */ }, [topicId]);

  const submit = async () => {
    if (selected === null || submitting) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/quiz/answer`, {
        quiz_id: quiz.quiz_id,
        question_index: current,
        selected_index: selected,
      });
      setAnswers((prev) => [...prev, { ...data, selected_index: selected }]);
    } catch {
      toast.error("Could not submit answer");
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (current + 1 >= (quiz?.questions?.length || 0)) {
      setDone(true);
    } else {
      setCurrent(current + 1);
      setSelected(null);
    }
  };

  const currentAnswer = answers[current];
  const q = quiz?.questions?.[current];
  const score = answers.filter((a) => a.correct).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <button
          onClick={() => navigate(`/topic/${topicId}`)}
          className="brut-btn brut-btn-ghost text-sm mb-8"
          data-testid="quiz-back-btn"
        >
          <ArrowLeft className="w-4 h-4" /> Back to topic
        </button>

        {loading ? (
          <div className="border border-foreground bg-card p-10 text-center" data-testid="quiz-loading">
            <Sparkles className="w-6 h-6 mx-auto mb-3" />
            <div className="font-display font-black text-2xl tracking-tighter">Generating quiz…</div>
            <div className="font-sans text-sm text-muted-foreground mt-2">
              Focusing on your weakest concepts.
            </div>
          </div>
        ) : done ? (
          <div className="border border-foreground bg-card p-8" data-testid="quiz-done">
            <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">§ result</span>
            <h1 className="font-display font-black text-5xl tracking-tighter mt-2 mb-6">
              {score}/{quiz.questions.length}
            </h1>
            <p className="font-sans text-base text-muted-foreground mb-8">
              {score === quiz.questions.length
                ? "Perfect. Your mastery just jumped."
                : score >= quiz.questions.length / 2
                ? "Solid run. Weak concepts have been flagged for the tutor to revisit."
                : "Bumpy ride — the tutor now knows exactly what to focus on."}
            </p>
            <div className="space-y-3 mb-8" data-testid="quiz-review">
              {quiz.questions.map((qq, i) => {
                const a = answers[i];
                return (
                  <div key={i} className={`border-l-2 pl-3 py-1 ${a?.correct ? "border-primary" : "border-destructive"}`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      {a?.correct ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <XCircle className="w-4 h-4 text-destructive" />}
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{qq.concept}</span>
                    </div>
                    <div className="font-sans text-sm font-medium">{qq.question}</div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate(`/topic/${topicId}`)}
                className="brut-btn brut-btn-primary"
                data-testid="quiz-return-btn"
              >
                Return to tutor <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setQuiz(null); setCurrent(0); setAnswers([]); setSelected(null); setDone(false);
                  loadQuiz();
                }}
                className="brut-btn brut-btn-ghost"
                data-testid="quiz-retry-btn"
              >
                New quiz
              </button>
            </div>
          </div>
        ) : q ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                § question {current + 1} of {quiz.questions.length}
              </span>
              <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {q.concept}
              </span>
            </div>
            <h1 className="font-display font-black text-3xl md:text-4xl tracking-tighter mb-8" data-testid="quiz-question">
              {q.question}
            </h1>
            <div className="space-y-3 mb-8" data-testid="quiz-options">
              {q.options.map((opt, i) => {
                const isSelected = selected === i;
                const answered = !!currentAnswer;
                const isCorrect = answered && i === currentAnswer.correct_index;
                const isWrongSelected = answered && isSelected && !currentAnswer.correct;
                return (
                  <button
                    key={i}
                    onClick={() => !answered && setSelected(i)}
                    disabled={answered}
                    className={`w-full text-left border border-foreground p-4 transition-all ${
                      isCorrect
                        ? "bg-primary text-primary-foreground"
                        : isWrongSelected
                        ? "bg-destructive text-destructive-foreground"
                        : isSelected
                        ? "bg-foreground text-background"
                        : "bg-card hover:bg-accent"
                    }`}
                    data-testid={`quiz-option-${i}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="font-mono text-xs opacity-70 mt-0.5">{String.fromCharCode(65 + i)}</span>
                      <span className="font-sans text-base">{opt}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {currentAnswer && (
              <div className="border border-foreground bg-card p-5 mb-6" data-testid="quiz-explanation">
                <div className="flex items-center gap-2 mb-2">
                  {currentAnswer.correct ? (
                    <><CheckCircle2 className="w-5 h-5 text-primary" /><span className="font-display font-black text-lg">Correct</span></>
                  ) : (
                    <><XCircle className="w-5 h-5 text-destructive" /><span className="font-display font-black text-lg">Not quite</span></>
                  )}
                </div>
                <p className="font-sans text-sm text-muted-foreground leading-relaxed">
                  {currentAnswer.explanation || "Moving on."}
                </p>
              </div>
            )}

            <div className="flex justify-end">
              {!currentAnswer ? (
                <button
                  onClick={submit}
                  disabled={selected === null || submitting}
                  className="brut-btn brut-btn-primary"
                  data-testid="quiz-submit-btn"
                >
                  {submitting ? "Checking…" : "Submit answer"}
                </button>
              ) : (
                <button
                  onClick={next}
                  className="brut-btn brut-btn-primary"
                  data-testid="quiz-next-btn"
                >
                  {current + 1 === quiz.questions.length ? "See results" : "Next question"} <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
