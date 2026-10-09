// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export function validateInteraction(type: string, titleIn: unknown, cfgIn: unknown): { title: string; config: Any } | { error: string } {
  const title = String(titleIn || "").trim().slice(0, 120);
  const cfg: Any = cfgIn && typeof cfgIn === "object" ? cfgIn : {};
  if (!["qa", "poll", "quiz", "open", "rate", "lottery"].includes(type)) return { error: "不支持的互动类型" };
  if (!title) return { error: "请输入标题" };
  if (type === "qa") return { title, config: { autoApprove: !!cfg.autoApprove } };
  if (type === "open") {
    const prompt = String(cfg.prompt || title).trim().slice(0, 300);
    return { title, config: { prompt } };
  }
  if (type === "lottery") {
    const raw = Array.isArray(cfg.prizes) ? cfg.prizes : [];
    const prizes = raw
      .map((p: Any) => ({ name: String(p?.name ?? "").trim().slice(0, 40), count: Math.round(Number(p?.count)), desc: String(p?.desc ?? "").trim().slice(0, 120) }))
      .filter((p: Any) => p.name || p.desc);
    if (!prizes.length) return { error: "抽奖至少需要 1 个奖项" };
    if (prizes.length > 20) return { error: "奖项最多 20 个" };
    for (let i = 0; i < prizes.length; i++) {
      if (!prizes[i].name) return { error: `第 ${i + 1} 个奖项缺少名称` };
      if (!Number.isInteger(prizes[i].count) || prizes[i].count < 1 || prizes[i].count > 200) return { error: `「${prizes[i].name}」的名额需在 1 到 200 之间` };
    }
    if (new Set(prizes.map((p: Any) => p.name)).size !== prizes.length) return { error: "奖项名称不能重复" };
    const exclude = [...new Set((Array.isArray(cfg.exclude) ? cfg.exclude : []).map((x: unknown) => String(x ?? "").slice(0, 64)).filter(Boolean))].slice(0, 2000);
    return { title, config: { prizes, participatedOnly: !!cfg.participatedOnly, allowRepeat: !!cfg.allowRepeat, exclude } };
  }
  if (type === "rate") {
    const items = (Array.isArray(cfg.items) ? cfg.items : []).map((o: unknown) => String(o ?? "").trim().slice(0, 60)).filter(Boolean);
    if (!items.length) return { error: "评分至少需要 1 个评分项" };
    if (items.length > 10) return { error: "评分项最多 10 个" };
    if (new Set(items).size !== items.length) return { error: "评分项不能重复" };
    const scale = cfg.scale === "score" ? "score" : "star";
    const def = scale === "star" ? 5 : 10;
    const max = Math.round(Number(cfg.max) || def);
    if (max < 3 || max > 10) return { error: "满分需在 3 到 10 之间" };
    return { title, config: { items, scale, max, allowComment: !!cfg.allowComment, anonymous: !!cfg.anonymous } };
  }
  if (type === "poll") {
    const question = String(cfg.question || title).trim().slice(0, 300);
    const options = (Array.isArray(cfg.options) ? cfg.options : []).map((o: unknown) => String(o).trim().slice(0, 100)).filter(Boolean);
    if (options.length < 2) return { error: "选择题至少需要 2 个选项" };
    if (options.length > 12) return { error: "选项最多 12 个" };
    return { title, config: { question, options, multi: !!cfg.multi } };
  }
  // quiz
  const qs = Array.isArray(cfg.questions) ? cfg.questions : [];
  if (!qs.length) return { error: "测验至少需要 1 道题" };
  const questions = [];
  for (let i = 0; i < qs.length; i++) {
    const q = qs[i] || {};
    const text = String(q.text || "").trim().slice(0, 300);
    const options = (Array.isArray(q.options) ? q.options : []).map((o: unknown) => String(o).trim().slice(0, 100)).filter(Boolean);
    const correct = (Array.isArray(q.correct) ? q.correct : []).map(Number).filter((n: number) => n >= 0 && n < options.length);
    const timeLimit = Math.min(300, Math.max(5, Number(q.timeLimit) || 20));
    if (!text) return { error: `第 ${i + 1} 题缺少题目` };
    if (options.length < 2) return { error: `第 ${i + 1} 题至少需要 2 个选项` };
    if (!correct.length) return { error: `第 ${i + 1} 题请标记正确答案` };
    questions.push({ text, options, correct, timeLimit });
  }
  return { title, config: { questions } };
}
