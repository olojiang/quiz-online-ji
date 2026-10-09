# Quiz Online Ji · 活动问答

Slido 风格的活动互动应用（互动类型：提问 / 选择题 / 测验 / 评分 / 开放话题）：会前收集问题 → 嘉宾只填姓名即可提问（无需账号/邮箱/登录） → 自动过滤 + 人工预审 → 全员可见、点赞热度排序 → 大屏投屏与现场操作 → 活动报告。界面支持 中文 / English。

Production: https://quiz-online-ji.vercel.app

## Stack
- Next.js 15 (App Router) + TypeScript + Tailwind CSS 3
- Neon Postgres via `@neondatabase/serverless`（表结构在首次请求时自动创建，`src/lib/db.ts`，全部 `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`）
- Auth: bcryptjs + JWT（`jose`，httpOnly cookie `qoj_token`，30 天）
- 二维码 `qrcode`、图表 `recharts`，全部打包在本站，无任何外部 CDN / 字体 / 统计脚本（便于国内访问，可直接用自定义域名代理）
- 实时：轮询（大屏 2s、嘉宾端 2.5s、控制台 3–4s），无 WebSocket

Env vars (Vercel project `quiz-online-ji`): `DATABASE_URL` (Neon), `JWT_SECRET`.

## Routes
| Page | 用途 |
|---|---|
| `/` | 首页 |
| `/setup` | 一次性初始化：系统没有任何用户时创建第一个超级管理员 |
| `/login`, `/register` | 登录 / 自助注册（注册用户 = 活动管理员，只管理自己的活动）|
| `/dashboard` | 我的活动（全部 / 进行中 / 未开始 / 已结束 筛选 + 搜索）|
| `/dashboard/events/[id]` | 活动控制台：互动、提问审核、活动报告、链接管理、成员、设置抽屉 |
| `/dashboard/users` | 用户管理（超级管理员）|
| `/dashboard/profile` | 个人信息：昵称、修改密码 |
| `/help` | 帮助中心（按角色）|
| `/g/{hash}` | 嘉宾端（手机）|
| `/s/{hash}` | 投屏端（大屏）|
| `/embed/{hash}` | iframe 嵌入用嘉宾端 |
| `/r/{hash}` | 只读报告分享 |

所有分享链接都是 10 位 base62 随机 hash，存于 `qoj_links`（类型 guest/screen/report/embed、标签、创建人、访问次数、失效时间）。不同类型互不通用；嘉宾 API 不返回投屏/控制台信息。失效链接返回 410 并显示「链接已失效」。数据属于活动，与链接无关。

## Roles
- 超级管理员 `super_admin`：管理所有用户与角色、所有活动
- 活动管理员 `event_admin`：创建/管理自己的活动、互动、链接、成员
- 审核员 `moderator`（按活动分配）：通过/拒绝/归档/删除、自动审核开关
- 主持人/投屏操作员 `presenter`（按活动分配）：频道切换、当前互动、上墙/置顶/精选/已回答、测验控制
- 嘉宾：无需账号（localStorage 中的随机参与者 id + 姓名）

权限在每个 API 路由服务端校验（`src/lib/auth.ts` → `eventPerms`），UI 同时隐藏无权操作。

## 活动状态快捷控制
- 状态 `qoj_events.status`：`upcoming` 未开始 / `live` 进行中 / `ended` 已结束（已结束时嘉宾端关闭提问、作答、评分）。
- `src/components/console/StatusControl.tsx`：控制台顶部状态标签（点开为三态下拉）+ 随状态变化的主按钮（开始活动 / 结束活动〔确认框〕/ 重新开放）；「我的活动」卡片右下角同样的快捷按钮 + ⋯ 菜单。改后 toast，并重新加载；嘉宾端、投屏端下次轮询生效；「设置 → 功能设置」的活动状态读同一字段，保持同步。
- 权限（`PATCH /api/events/[id]` 服务端校验）：活动管理员（owner）/ 超级管理员可设任意状态；主持人只能设 `live` / `ended`（开始、结束、重新开放）；审核员 403。

## 评分（rate）
- 配置：标题、1–10 个评分项、评分方式 星级 / 分数、满分 3–10、允许评论、匿名展示（`validate.ts`）。
- 存储复用 `qoj_responses`（`question_index = 0`，`answer = {scores, comment}`），每位嘉宾一份，可在结束前更新；`state.closed` 控制开启/结束（`/api/interactions/[id]/rating`，主持人/活动管理员）。
- 统计 `live.ts → rateStats`：平均分（1 位小数）、分布、评论；匿名时大屏/控制台/报告/导出不含姓名。CSV：`/api/interactions/[id]/export`。
- 报告：互动类型分布、互动贡献总数（评分计为作答）、「评分结果」板块、Excel「评分结果」工作表。

## 功能开关（`src/lib/features.ts`）
- `FEATURE_GROUPS = false`：暂时没有「组别」概念。嘉宾端只填姓名；控制台不显示组别列表、组别过滤；报告/评分/导出不含按组别统计和组别列；帮助中心不提组别。服务端忽略传入的 `group` / `groups`。
- 数据库列保留不动（`qoj_events.groups`、`qoj_questions.group_name`、`qoj_participants.group_name`、评分 `answer.group`），改回 `true` 即可恢复（帮助中心文案需另行补回组别说明）。

## 大屏幕适配
- 控制台类页面（`.qoj-console`）在 ≥1600px 根字号 17px、≥2200px 18px；内容区最大宽度 1440–1600px 居中。
- 投屏端按 1920×1080 设计，按实际窗口等比缩放（0.7–2.2 倍），再叠加手动缩放。

## 预审 / 垃圾过滤
每个活动可配置敏感词、最少字数、每分钟提问上限；重复内容和链接自动标记。命中规则的问题即使开启「自动审核」也进入「待审核」，并显示原因标签。

## Themes
`src/lib/palette.ts` 从主题色推导整套配色（背景、卡片、文字、次要文字、边框、强调色、徽章、悬停），按 WCAG 对比度自动加深/选择黑白文字；投屏端 7 个预设 + 自定义，嘉宾端 6 个预设 + 自定义。`?theme=orange` 或 `?theme=%23ffd400` 可临时预览。

## Deploy
GitHub 未连接，直接从目录部署（CLI 的 `--token` 与代理 token 不兼容，使用 REST API 上传）：
```
python3 ../work/deploy.py      # uploads files via /v2/files and creates a production deployment
```
Smoke test (creates its own super admin, events, users, and deletes everything at the end so /setup reopens):
```
python3 ../work/smoke.py https://quiz-online-ji.vercel.app   # ⚠ 仅限空系统，会删除全部数据
python3 ../work/rating_test.py                               # 评分 API 测试，只创建 qa-rating-* 测试账号/活动（需事后清理）
```
