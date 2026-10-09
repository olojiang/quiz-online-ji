export type HelpRole = "super_admin" | "event_admin" | "moderator" | "presenter" | "guest";
export interface HelpSection { title: string; steps: string[] }
/**
 * One help page per role. Layout on /help: intro (你是谁/你负责什么) → can (你能做什么, 3–5 bullets)
 * → quick (第一次使用, 3–6 numbered steps) → sections (常用操作) → faq → tips.
 * Wrap exact UI button / tab labels in **…** — they render bold.
 */
export interface HelpPage { role: HelpRole; name: string; intro: string; can: string[]; quick: string[]; sections: HelpSection[]; faq: [string, string][]; tips: string[]; links: { label: string; href: string }[] }

export const FLOW = {
  zh: [["会前开放", "分享嘉宾链接或二维码"], ["扫码提交", "嘉宾填写姓名 + 问题"], ["预审", "自动过滤 + 人工审核"], ["展示点赞", "大家都能看到，按点赞排序"], ["大屏", "投屏展示，现场聚焦"]],
  en: [["Open early", "Share the guest link or QR code"], ["Scan & submit", "Guests enter name + question"], ["Review", "Auto filter + manual review"], ["Show & like", "Everyone sees it, ranked by likes"], ["Big screen", "Project and spotlight live"]],
};

const ZH: HelpPage[] = [
  {
    role: "super_admin", name: "超级管理员",
    intro: "你管理整个系统：给工作人员开账号、分配身份，也能查看所有活动。",
    can: ["创建工作人员账号，分配身份", "停用或启用账号、重置密码", "查看和管理所有活动"],
    quick: [
      "系统里还没有任何账号时，打开 /setup 页面。",
      "填写你的姓名、邮箱和密码，点 **创建**，你就是第一位超级管理员。",
      "完成后会自动登录，进入「我的活动」。",
      "点顶部导航的 **用户管理**，为同事开账号（见下方「创建用户并分配身份」）。",
    ],
    sections: [
      { title: "创建用户并分配身份", steps: ["点顶部导航 **用户管理**。", "点 **新建用户**，填写姓名、邮箱和初始密码。", "勾选身份：活动管理员、审核员、主持人，可以多选。", "把邮箱和初始密码告诉对方，提醒他登录后在「个人信息」里改密码。"] },
      { title: "停用账号、重置密码", steps: ["在用户列表里找到这个人。", "点 **停用**，对方马上不能登录。", "点 **重置密码**，为对方设一个新密码。"] },
    ],
    faq: [["别人可以自己注册吗？", "可以。自己注册的人是活动管理员，只能管理自己创建的活动。"], ["审核员为什么看不到活动？", "还需要活动管理员在这个活动的「成员」里把他加进去。"], ["忘了超级管理员密码怎么办？", "请另一位超级管理员帮你重置。建议系统里至少有两位超级管理员。"]],
    tips: ["每位工作人员单独开一个账号，方便知道谁审核了什么。", "活动结束后，停用临时人员的账号。"],
    links: [{ label: "用户管理", href: "/dashboard/users" }, { label: "我的活动", href: "/dashboard" }],
  },
  {
    role: "event_admin", name: "活动管理员",
    intro: "你负责一场活动的全过程：创建活动、发链接、安排互动，会后看报告。",
    can: ["创建活动，设置大屏和手机端的颜色", "开放会前提问，分享链接和二维码", "添加选择题、测验、评分、开放话题和抽奖", "一键开始、结束或重新开放活动", "安排审核员和主持人", "查看并下载活动报告"],
    quick: [
      "在「我的活动」点 **创建活动**，填写活动名称（日期可选），点 **创建**。系统会自动建好「提问」、嘉宾链接和投屏链接。",
      "点右上角齿轮或左侧 **活动设置** →「功能设置」，打开 **允许会前提问**，点 **确定**。",
      "点顶部 **嘉宾端** → **嘉宾端二维码** 或 **复制链接到剪贴板**，发到群里或印在海报上。",
      "想先看看嘉宾看到的样子？在 **嘉宾端** 菜单里选 **模拟器中打开**。",
      "活动当天，点控制台顶部活动名称旁的 **开始活动**（状态变为「进行中」），再点 **投屏端** 打开大屏。",
    ],
    sections: [
      { title: "开始、结束活动", steps: ["活动名称旁边的彩色标签就是活动状态：**未开始**、**进行中**、**已结束**。", "旁边只有一个主按钮，按当前状态变化：未开始时是 **开始活动**，进行中时是 **结束活动**，已结束时是 **重新开放**。", "点 **结束活动** 会先弹出确认框：结束后嘉宾不能再提问、投票、作答或评分，已有内容和报告都还在。点 **结束活动** 确认。", "想直接选某个状态（比如改回「未开始」），点状态标签旁的小箭头，在下拉菜单里选。", "在「我的活动」列表里也能操作：每张活动卡片右下角有同样的按钮，**⋯** 菜单里可以选三种状态。", "改完顶部会提示「活动已开始」等，嘉宾手机和大屏几秒内自动更新。**活动设置** →「功能设置」里的「活动状态」也会同步。"] },
      { title: "审核提问", steps: ["左侧点 **提问**。上方有四个标签：展示中、待审核、审核记录、已归档，旁边的数字是数量。", "右上角 **自动审核** 关闭时，新问题先进「待审核」，你点 **通过** 或 **拒绝**。打开时，新问题直接展示（被系统标记的仍要人工审核）。", "**搜索** 找问题或姓名，**过滤** 按状态筛选，**归档全部** 一次收起展示中的问题。", "每个问题右侧有现场按钮：上墙（橙色）、精选（星标）、置顶、已回答（绿色勾）。右下角 **⋯** 可以归档、拒绝或删除。"] },
      { title: "修改活动信息和颜色", steps: ["**活动设置** →「基本信息」：改活动名称、日期和简介。", "「功能设置」：自动审核、屏蔽词、最少字数、每分钟提问上限。", "「皮肤主题」：分别给大屏和嘉宾手机选颜色，可以用预设，也可以 **自定义**。系统会自动搭配文字颜色，保证看得清。", "点 **确定** 后，大屏和嘉宾手机会自动换上新颜色。"] },
      { title: "添加其他互动", steps: ["左侧「互动内容」旁点 **+**，或点 **创建互动**。", "选择题型：选择题、测验、评分或开放话题，填好后点 **创建**。", "每个活动只有一个「提问」，创建活动时已自动建好。"] },
      { title: "创建评分", steps: ["点 **创建互动**，选 **评分**。", "填写标题，在「评分项」里写要打分的内容（如「演讲内容」）。点 **添加评分项** 可以加，最多 10 个。", "「评分方式」选 **星级** 或 **分数**，再选满分（3–10 分）。", "想要文字反馈，打开 **允许嘉宾填写评论**；不想显示评分人姓名，打开 **匿名展示**。", "点 **创建**。轮到这个环节时点 **设为当前互动**，嘉宾手机和大屏会一起切换过去。", "页面上能看到每项的平均分、分布和评论。点 **结束评分** 停止收集，**导出 CSV** 下载全部评分。"] },
      { title: "创建抽奖", steps: ["点 **创建互动**，选 **抽奖**。", "填写标题，再填奖项：奖项名称（如「一等奖」）、名额（几个人中奖），奖品说明可以不填。点 **添加奖项** 可以加更多奖项。", "**仅限参与过互动的嘉宾**：打开后，只有提过问、点过赞、评论、投票、答题或评分的嘉宾才能被抽中。关闭时，所有填了姓名进入活动的嘉宾都能被抽中。", "**允许重复中奖**：默认关闭，同一个人在这个抽奖里最多中一个奖。", "点 **创建**。抽奖页面右侧是「抽奖池」，有人不在现场，点他名字旁的 **移出** 就不会被抽到，点 **恢复** 可以放回来。", "抽奖时点 **设为当前互动**，再在奖项旁点 **开始抽奖**，大屏开始滚动名字；点 **停止并揭晓**，系统随机选出获奖者并显示在大屏上。具体怎么抽见「主持人」帮助里的「现场抽奖」。", "获奖名单会显示在抽奖页面、活动报告和导出的 Excel 里，也可以点 **导出 CSV** 单独下载。"] },
      { title: "管理链接", steps: ["左侧点 **链接管理**，可以为不同渠道（如微信群、邮件、海报）各生成一个带标签的嘉宾链接。", "链接外泄或想换掉时，点 **失效** 或 **重置链接**。之前的数据不会丢。", "报告里会显示每个链接带来了多少嘉宾。"] },
      { title: "安排审核员和主持人", steps: ["左侧点 **成员**。", "在 **添加成员** 里选一个已有账号，再选「审核员」或「主持人/投屏操作员」。", "对方还没有账号？请超级管理员在「用户管理」里创建。"] },
      { title: "会后看报告", steps: ["左侧点 **活动报告**。", "这里有参与人数、互动分布、参与趋势、贡献排行、热门问题、评分结果和抽奖结果（获奖名单）。", "点 **下载全部** 导出 Excel，也可以在每个板块单独导出 CSV。", "要发给领导看？在「链接管理」生成一个 **报告分享** 链接（只能看，不能改）。", "活动结束后，点顶部 **结束活动** 并确认，嘉宾就不能再提交了。"] },
    ],
    faq: [["嘉宾需要下载 App 吗？", "不需要。手机扫码打开网页就行，国内网络可以直接打开。"], ["可以同时开多个提问吗？", "每个活动只有一个提问，但可以有多个选择题、测验、评分、开放话题和抽奖。"], ["抽奖公平吗？", "公平。获奖者在点 **停止并揭晓** 的那一刻由服务器随机选出，大屏上滚动的名字只是动画效果，谁也不能提前知道或指定结果。"], ["以前的活动在哪里看？", "在「我的活动」里，可以按 全部 / 进行中 / 未开始 / 已结束 筛选和搜索。"], ["换了链接，之前的问题会丢吗？", "不会。数据属于活动本身，和链接无关。"], ["不小心点了结束活动怎么办？", "点 **重新开放**，活动回到「进行中」，嘉宾可以继续提交，之前的内容都在。"], ["谁能改活动状态？", "活动管理员和超级管理员可以选任意状态；主持人可以开始、结束和重新开放；审核员只能看到状态，不能修改。"]],
    tips: ["会前一两天就把链接发出去，能收到更多好问题。", "在「功能设置」里加几个屏蔽词，减少垃圾提问。"],
    links: [{ label: "我的活动", href: "/dashboard" }, { label: "个人信息", href: "/dashboard/profile" }],
  },
  {
    role: "moderator", name: "审核员",
    intro: "你负责把关：先看嘉宾的问题，只让合适的问题出现在大屏和手机上。",
    can: ["通过或拒绝嘉宾的问题", "打开或关闭自动审核", "归档、删除问题，查看审核记录", "按状态或关键词找问题", "查看评分结果和抽奖结果"],
    quick: [
      "用工作人员账号登录，在「我的活动」里打开分配给你的活动（卡片上有「审核员」标记）。",
      "左侧点 **提问**，再点上方的 **待审核** 标签。",
      "合适的问题点绿色 **通过**，它会马上出现在嘉宾手机和大屏上。",
      "不合适的问题点 **拒绝**。",
      "点错了？在 **审核记录** 里点 **改为通过** 即可。",
    ],
    sections: [
      { title: "自动审核和垃圾过滤", steps: ["右上角 **自动审核** 打开后，新问题会直接展示。", "就算开着自动审核，带屏蔽词、太短、重复或带链接的问题仍会进「待审核」，并显示红色的系统标记原因。", "提问太频繁的嘉宾会被暂时拦住。"] },
      { title: "整理问题", steps: ["点问题右下角 **⋯**，可以归档、拒绝或删除。", "**归档全部** 一次收起所有展示中的问题，适合换话题时用。", "**过滤** 可以按状态筛选：精选、置顶、已回答、被系统标记。", "**搜索** 可以按问题内容或姓名查找。"] },
    ],
    faq: [["我能置顶或上墙吗？", "置顶、精选、已回答和上墙是主持人的操作，你需要同时有主持人身份。"], ["嘉宾能看到被拒绝的问题吗？", "不能。被拒绝的问题不会再显示。"], ["我能看评分结果吗？", "可以。在左侧点评分互动，就能看到平均分、分布和评论，也能 **导出 CSV**。创建和结束评分由活动管理员或主持人操作。"], ["我能抽奖吗？", "不能。审核员只能查看抽奖结果和导出名单，抽奖由主持人或活动管理员操作。"]],
    tips: ["活动开始前多看几次「待审核」，开场时大屏就有内容。", "意思相近的问题只通过一个，其余归档，大屏更清爽。"],
    links: [{ label: "我的活动", href: "/dashboard" }],
  },
  {
    role: "presenter", name: "主持人 / 投屏操作员",
    intro: "你负责现场大屏：打开投屏、切换内容，把正在讨论的问题放大给大家看。",
    can: ["打开大屏并全屏", "在欢迎页和互动之间切换", "把一个问题「上墙」放大显示", "置顶、精选、标记已回答", "开始、结束或重新开放活动", "控制测验和评分的开始与结束", "现场抽奖：开始、揭晓、补抽"],
    quick: [
      "用工作人员账号登录，在「我的活动」里打开分配给你的活动（卡片上有「主持人」标记）。",
      "点顶部 **投屏端**。有第二块屏幕选 **在新窗口中打开**，把窗口拖到投影上；只有一块屏选 **当前窗口打开**。",
      "点大屏左下角的 **全屏**。",
      "开场前在 **投屏端** 菜单选 **切换至欢迎页**，大屏显示活动名称和二维码。",
      "开始互动时选 **切换至互动频道**。",
    ],
    sections: [
      { title: "开始、结束活动", steps: ["活动名称旁边的标签显示当前状态：**未开始**、**进行中** 或 **已结束**。", "开场时点 **开始活动**，状态变为「进行中」，嘉宾可以参与所有互动。", "散场时点 **结束活动**，在确认框里再点 **结束活动**。之后嘉宾不能再提交，已有内容仍可查看。", "需要继续收集时点 **重新开放**。", "也可以点状态标签旁的小箭头选状态。改回「未开始」只有活动管理员能操作。"] },
      { title: "现场操作问题", steps: ["在「展示中」的问题右侧，点橙色 **上墙**，大屏会放大显示这个问题。再点一次取消。", "点星标设为 **精选**。", "点蓝色按钮 **置顶**，问题固定在最上面。", "点绿色勾标记 **已回答**，大屏和嘉宾手机都会显示「已回答」。"] },
      { title: "翻页、缩放、全屏", steps: ["问题多时，用大屏左下角的翻页按钮切换（显示如「1/2」）。", "用 **−** / **+** 调整大小，适应不同的屏幕。", "点 **全屏** 进入或退出全屏。控制栏不用时会变淡，动一下鼠标就会出现。", "大屏顶部可以切换「热门」或「时间顺序」排序。"] },
      { title: "切换互动和测验", steps: ["在左侧选一个互动，点 **设为当前互动**，大屏和嘉宾手机一起切换。", "测验：点 **开始测验** → 嘉宾答题 → **公布答案** → **下一题**，最后显示排行榜。"] },
      { title: "现场评分", steps: ["在左侧选评分互动，点 **设为当前互动**。嘉宾手机出现打分页，大屏显示每项的平均分、星级、人数和分布图，会自动刷新。", "收集完点 **结束评分**，嘉宾就不能再提交或修改。", "还要继续收集，点 **重新开放评分**。"] },
      { title: "现场抽奖", steps: ["在左侧选抽奖，点 **设为当前互动**。抽奖前大屏显示奖项和二维码，提醒大家扫码加入。", "在要抽的奖项旁点 **开始抽奖**，大屏开始滚动参与嘉宾的名字。想一次只抽几个人，先在「本轮 _ 人」里填人数。", "点 **停止并揭晓**，系统当场随机选出获奖者，大屏放大显示名字，中奖嘉宾的手机上会出现「恭喜你获得 …」。", "名额没抽完，点 **再抽一次** 继续抽剩下的名额。", "获奖者不在场？在名单里点 **作废**，记录会保留并标记「已作废」，这个人不会再被抽到；再点 **补抽** 把空出的名额抽出来。", "想从头再来，点右上角 **重置**，会清空这个抽奖的全部中奖记录。", "点错了「开始抽奖」，点 **取消** 就行，不会产生中奖记录。"] },
    ],
    faq: [["大屏多久更新一次？", "每 2 秒自动刷新，不用手动刷新页面。"], ["大屏会出现没审核的问题吗？", "不会。大屏只显示已通过的问题。"]],
    tips: ["开场前先打开大屏，检查颜色和字的大小。", "答完一个问题就点「已回答」，观众能看到进度。"],
    links: [{ label: "我的活动", href: "/dashboard" }],
  },
  {
    role: "guest", name: "嘉宾",
    intro: "你是参会者：用手机扫一扫，填上自己的姓名就能提问、点赞和参与互动。不用注册账号，不用填邮箱，也不用登录。",
    can: ["会前或现场提交问题", "给喜欢的问题点赞、评论", "参与投票、测验、评分和开放话题", "参加抽奖，看看自己有没有中奖"],
    quick: [
      "用手机扫描现场或群里的二维码，也可以直接打开链接。",
      "只需填写你的姓名（这是唯一要填的信息），点 **进入活动**。",
      "点 **点击输入您的问题**，写好后点 **提交问题**。",
      "问题先显示「审核中」（只有你能看到），通过后大家都能看到。",
    ],
    sections: [
      { title: "点赞和评论", steps: ["在「热门问题」或「最新问题」里看大家的问题。", "点问题右侧的 👍 点赞，再点一次取消。", "点 **⋯** → **评论** 可以留言。"] },
      { title: "参与其他互动", steps: ["主持人发起投票、测验、评分或开放话题时，页面会自动切换过去。", "顶部的标签可以随时回到「提问」。"] },
      { title: "评分", steps: ["给每一项点星星（星级）或点数字（分数）。如果有「评论（选填）」，可以写几句看法。", "点 **提交评分**。系统用你进入活动时填的姓名提交，每人一份。", "评分结束前可以点 **修改评分**，改好后点 **更新评分**。"] },
      { title: "抽奖", steps: ["主持人开始抽奖时，页面会显示抽奖卡片：有哪些奖项、每个奖几个名额、抽奖池里有多少人。", "你不用做任何操作，只要用姓名进入了活动，就在抽奖池里（如果主办方选了「仅限参与过互动的嘉宾」，需要先提问、点赞或参加投票等）。", "抽奖时请看大屏。揭晓后，获奖名单会显示在手机上；如果你中奖了，页面顶部会出现「恭喜你获得 …」。"] },
    ],
    faq: [["需要注册、登录或下载 App 吗？", "都不需要。打开网页，填上姓名就能参与。"], ["我的问题为什么没出现？", "可能还在审核，请稍等；也可能内容不符合活动要求。"], ["可以改姓名吗？", "可以，点页面底部的 **修改信息**。"], ["评分是匿名的吗？", "如果主办方打开了「匿名展示」，就不会显示你的姓名；否则评论旁会显示姓名。"], ["我中奖了怎么领奖？", "请听主持人安排，中奖提示会一直显示在你的页面上。"], ["打开链接提示「链接已失效」？", "主办方换了链接，请扫描最新的二维码。"], ["可以看英文吗？", "可以，点页面顶部的「中 / EN」。"]],
    tips: ["问题写具体一点，更容易被选中回答。", "想问的问题已经有人问了？点个赞就好，赞多的问题会排在前面。"],
    links: [],
  },
];

const EN: HelpPage[] = [
  {
    role: "super_admin", name: "Super admin",
    intro: "You run the whole system: create staff accounts, give them roles, and see every event.",
    can: ["Create staff accounts and assign roles", "Disable or enable accounts, reset passwords", "See and manage every event"],
    quick: [
      "While the system has no accounts yet, open the /setup page.",
      "Enter your name, email and password and click **Create**. You are now the first super admin.",
      "You are signed in and taken to My events.",
      "Click **Users** in the top bar to add your colleagues (see below).",
    ],
    sections: [
      { title: "Create users and roles", steps: ["Click **Users** in the top bar.", "Click **New user** and enter a name, email and first password.", "Tick the roles: Event admin, Moderator, Presenter. You can pick more than one.", "Send them the email and password, and ask them to change it under Profile."] },
      { title: "Disable an account or reset a password", steps: ["Find the person in the list.", "Click **Disable** — they can no longer sign in.", "Click **Reset password** to give them a new one."] },
    ],
    faq: [["Can people sign up on their own?", "Yes. People who sign up are event admins of their own events only."], ["Why can't a moderator see an event?", "The event admin must also add them under Members in that event."], ["I forgot the super admin password.", "Ask another super admin to reset it. It's best to have at least two."]],
    tips: ["Give each staff member their own account.", "Disable temporary accounts after the event."],
    links: [{ label: "User management", href: "/dashboard/users" }, { label: "My events", href: "/dashboard" }],
  },
  {
    role: "event_admin", name: "Event admin",
    intro: "You own one event from start to finish: set it up, share the links, plan the interactions and read the report.",
    can: ["Create events and pick colours for the screen and phones", "Open questions before the event and share the link/QR", "Add polls, quizzes, ratings, open topics and lucky draws", "Start, end or reopen the event in one click", "Add moderators and presenters", "View and download the report"],
    quick: [
      "In My events click **Create event**, enter a name (the date is optional) and click **Create**. Q&A, a guest link and a screen link are made for you.",
      "Click the gear or **Settings** → Features, turn on **Allow pre-event questions** and click **OK**.",
      "Click **Guest** at the top → **Guest QR code** or **Copy link to clipboard**, and share it in WeChat or on a poster.",
      "Want to see what guests see? Choose **Open in simulator** in the **Guest** menu.",
      "On the day, click **Start event** next to the event name at the top of the console (the status becomes Live), then click **Screen** to open the big screen.",
    ],
    sections: [
      { title: "Start and end the event", steps: ["The coloured tag next to the event name is its status: **Upcoming**, **Live** or **Ended**.", "Next to it is one main button that follows the status: **Start event** when Upcoming, **End event** when Live, **Reopen** when Ended.", "**End event** asks first: once ended, guests can no longer ask, vote, answer or rate; everything already there and the report stay. Click **End event** to confirm.", "To pick a status directly (e.g. back to Upcoming), click the small arrow next to the status tag and choose from the menu.", "You can do the same in My events: each event card has the same button at the bottom right, and the **⋯** menu lists all three statuses.", "A message such as \"Event started\" confirms the change; phones and the screen update within seconds. The Event status under **Settings** → Features stays in sync."] },
      { title: "Review questions", steps: ["Click **Q&A** on the left. The tabs are Showing, Pending, History and Archived.", "With **Auto-review** off, new questions wait in Pending until you click **Approve** or **Reject**. With it on, they show straight away (flagged ones still wait).", "**Search** finds a question or name, **Filter** narrows by status, **Archive all** clears the showing list.", "Live buttons on each question: spotlight (orange), feature (star), pin, answered (green tick). **⋯** archives, rejects or deletes."] },
      { title: "Event details and colours", steps: ["**Settings** → Basics: name, date and description.", "Features: auto-review, blocked words, minimum length, questions per minute.", "Themes: pick colours for the screen and for phones, from presets or **Custom**. Text colours are matched automatically so everything stays readable.", "Click **OK** — the screen and phones switch to the new colours."] },
      { title: "Add other interactions", steps: ["Click **+** next to Interactions, or **New interaction**.", "Pick Poll, Quiz, Rating or Open topic, fill it in and click **Create**.", "Each event has exactly one Q&A, created with the event."] },
      { title: "Create a rating", steps: ["Click **New interaction** and pick **Rating**.", "Enter a title and the items to score (e.g. \"Content\"). **Add rating item** adds more, up to 10.", "Choose **Stars** or **Score**, then the max (3–10).", "Turn on **Allow guest comments** for written feedback, or **Anonymous display** to hide names.", "Click **Create**. When it's time, click **Set as current** — phones and the screen switch together.", "You see each item's average, distribution and comments. **Close rating** stops it; **Export CSV** downloads every rating."] },
      { title: "Create a lucky draw", steps: ["Click **New interaction** and pick **Lucky draw**.", "Enter a title and the prizes: prize name (e.g. \"First prize\"), how many winners, and an optional description. **Add prize** adds more.", "**Only guests who took part**: only guests who asked, liked, commented, voted, answered or rated can win. When off, everyone who joined with a name is in the pool.", "**Allow repeat winners**: off by default — one person wins at most one prize in this draw.", "Click **Create**. The Pool list on the right lets you **Remove** someone who isn't there, and **Restore** them later.", "To draw, click **Set as current**, then **Start draw** next to a prize; the screen rolls names. **Stop & reveal** picks the winners at random and shows them. See Live lucky draw in the Presenter help.", "Winners appear on the draw page, in the event report and the Excel export; **Export CSV** downloads them on their own."] },
      { title: "Links", steps: ["**Links** lets you make a labelled guest link for each channel (WeChat, email, poster…).", "If a link leaks, click **Revoke** or **Reset links**. No data is lost.", "The report shows how many guests each link brought."] },
      { title: "Moderators and presenters", steps: ["Click **Members** on the left.", "In **Add member**, pick an existing account and choose Moderator or Presenter.", "No account yet? Ask a super admin to create one under Users."] },
      { title: "After the event", steps: ["Click **Event report** on the left: guests, interaction mix, trend, top contributors, top questions, rating results and lucky-draw winners.", "**Download all** gives an Excel file; each section also has its own CSV.", "To share it, create a **Report share** link (view only) under Links.", "Click **End event** at the top and confirm, so guests can no longer submit."] },
    ],
    faq: [["Do guests need an app?", "No. They scan the QR code and it opens as a web page."], ["Can I run more than one Q&A?", "Each event has one Q&A, but as many polls, quizzes, ratings, open topics and lucky draws as you like."], ["Is the draw fair?", "Yes. Winners are picked at random by the server the moment you click **Stop & reveal**; the rolling names on the screen are only an animation, so nobody can know or choose the result in advance."], ["Where are my past events?", "In My events — filter by All / Live / Upcoming / Ended or search."], ["If I change a link, are questions lost?", "No. Data belongs to the event, not the link."], ["I ended the event by mistake.", "Click **Reopen**. The event goes back to Live, guests can submit again and nothing is lost."], ["Who can change the status?", "Event admins and super admins can pick any status; presenters can start, end and reopen; moderators can only see it."]],
    tips: ["Share the link a day or two early to collect more good questions.", "Add a few blocked words to keep out spam."],
    links: [{ label: "My events", href: "/dashboard" }, { label: "Profile", href: "/dashboard/profile" }],
  },
  {
    role: "moderator", name: "Moderator",
    intro: "You are the gatekeeper: check guests' questions so only good ones reach the screen and phones.",
    can: ["Approve or reject questions", "Turn auto-review on or off", "Archive or delete, see review history", "Find questions by status or keyword", "See rating and lucky-draw results"],
    quick: [
      "Sign in with your staff account and open the event you were added to (its card says Moderator).",
      "Click **Q&A** on the left, then the **Pending** tab.",
      "Click the green **Approve** for a good question — it shows on phones and the screen right away.",
      "Click **Reject** for anything unsuitable.",
      "Made a mistake? In **History**, click **Approve instead**.",
    ],
    sections: [
      { title: "Auto-review and spam filter", steps: ["With **Auto-review** on, new questions show straight away.", "Even then, questions with blocked words, too short, repeated or with links still go to Pending with a red reason tag.", "Guests posting too fast are paused for a moment."] },
      { title: "Tidy up", steps: ["Click **⋯** on a question to archive, reject or delete it.", "**Archive all** clears every showing question — handy between topics.", "**Filter** by status: featured, pinned, answered, flagged.", "**Search** by question text or name."] },
    ],
    faq: [["Can I pin or spotlight?", "Those are presenter actions — you need the presenter role too."], ["Do guests see rejected questions?", "No."], ["Can I see rating results?", "Yes — click the rating on the left to see averages, distribution and comments, and **Export CSV**. The event admin or presenter creates and closes ratings."], ["Can I run a lucky draw?", "No. Moderators can view and export the winners; presenters or the event admin run the draw."]],
    tips: ["Check Pending a few times before the event starts.", "Approve one of several similar questions and archive the rest."],
    links: [{ label: "My events", href: "/dashboard" }],
  },
  {
    role: "presenter", name: "Presenter / screen operator",
    intro: "You run the big screen: open it, switch what it shows, and spotlight the question being discussed.",
    can: ["Open the screen and go full screen", "Switch between welcome page and interactions", "Spotlight one question", "Pin, feature, mark answered", "Start, end or reopen the event", "Start and stop quizzes and ratings", "Run lucky draws: start, reveal, redraw"],
    quick: [
      "Sign in with your staff account and open the event you were added to (its card says Presenter).",
      "Click **Screen** at the top. With a second display choose **Open in new window** and drag it over; with one display choose **Open in current window**.",
      "Click **Full screen** at the bottom left of the screen.",
      "Before you start, choose **Switch to welcome page** in the **Screen** menu — it shows the event name and QR code.",
      "When the session starts, choose **Switch to interaction channel**.",
    ],
    sections: [
      { title: "Start and end the event", steps: ["The tag next to the event name shows the status: **Upcoming**, **Live** or **Ended**.", "At the start, click **Start event** — the status becomes Live and guests can join everything.", "At the end, click **End event**, then **End event** again in the confirm box. Guests can no longer submit; existing content stays visible.", "Need more input? Click **Reopen**.", "You can also click the small arrow next to the status tag. Only the event admin can set it back to Upcoming."] },
      { title: "Live actions on questions", steps: ["Click the orange button (**Spotlight on the big screen**) on a showing question to show it large on the screen. Click again to remove it.", "Click the star to make it **Featured**.", "Click the blue **Pin** to keep it at the top.", "Click the green tick to mark it **Answered**."] },
      { title: "Pages, zoom, full screen", steps: ["Use the bottom-left bar to page through questions (e.g. \"1/2\").", "Use **−** / **+** to fit the screen size.", "**Full screen** toggles full screen. The bar fades when idle — move the mouse to bring it back.", "Switch Hot / Newest at the top of the screen."] },
      { title: "Interactions and quizzes", steps: ["Pick an interaction on the left and click **Set as current** — the screen and phones switch together.", "Quiz: **Start quiz** → guests answer → **Reveal answer** → **Next question**; a leaderboard shows at the end."] },
      { title: "Live rating", steps: ["Pick the rating and click **Set as current**. Phones show the rating form; the screen shows averages, stars, raters and a chart, refreshing automatically.", "Click **Close rating** when done — guests can no longer submit or change.", "Click **Reopen rating** to continue."] },
      { title: "Live lucky draw", steps: ["Pick the draw and click **Set as current**. Before drawing, the screen shows the prizes and the QR code.", "Click **Start draw** next to a prize — the screen rolls guests' names. To draw only a few at a time, enter a number in \"This round\" first.", "Click **Stop & reveal**: winners are picked at random on the spot, shown large on the screen, and winners' phones show \"Congratulations, you won …\".", "Slots left? Click **Draw again** for the remaining ones.", "Winner not there? Click **Void** — the record stays, marked Voided, and that person won't be drawn again; then **Redraw** fills the slot.", "**Reset** at the top right clears every winner of this draw.", "Clicked Start by mistake? **Cancel** stops it without drawing anyone."] },
    ],
    faq: [["How often does the screen update?", "Every 2 seconds, automatically."], ["Can unapproved questions appear?", "No. Only approved questions are shown."]],
    tips: ["Open the screen before the event to check colours and text size.", "Mark questions Answered as you go so the audience sees progress."],
    links: [{ label: "My events", href: "/dashboard" }],
  },
  {
    role: "guest", name: "Guest",
    intro: "You're an attendee: scan the code and type your name to ask, like and take part. No account, no email, no sign-in.",
    can: ["Ask questions before or during the event", "Like and comment on questions", "Join polls, quizzes, ratings and open topics", "Take part in lucky draws"],
    quick: [
      "Scan the QR code at the venue or in WeChat, or open the link.",
      "Type your name — that's the only thing you need to enter — and tap **Join**.",
      "Tap **Tap to ask a question**, write it and tap **Submit question**.",
      "It shows \"Under review\" (only to you) until it's approved; then everyone can see it.",
    ],
    sections: [
      { title: "Like and comment", steps: ["Browse questions under Hot or Newest.", "Tap 👍 to like; tap again to undo.", "Tap **⋯** → **Comment** to reply."] },
      { title: "Other interactions", steps: ["When the host starts a poll, quiz, rating or open topic, your page switches to it automatically.", "Use the tabs at the top to go back to Q&A."] },
      { title: "Rating", steps: ["Tap stars or a number for each item. Add a few words under Comment (optional) if shown.", "Tap **Submit rating**. It is sent with the name you joined with — one per person.", "Until it closes you can tap **Change rating**, then **Update rating**."] },
      { title: "Lucky draw", steps: ["When the host starts a draw, you see a card with the prizes, how many winners each has, and how many people are in the pool.", "You don't need to do anything: joining with your name puts you in the pool (if the host chose \"Only guests who took part\", ask, like or vote first).", "Watch the big screen. After the reveal the winners show on your phone; if you won, a \"Congratulations, you won …\" banner appears at the top."] },
    ],
    faq: [["Do I need an account, sign-in or app?", "No. Open the web page, type your name and you're in."], ["Why isn't my question showing?", "It may still be under review."], ["Can I change my name?", "Yes, tap **Edit info** at the bottom."], ["Is rating anonymous?", "If the host turned on Anonymous display, your name isn't shown; otherwise it appears next to your comment."], ["I won — how do I collect it?", "Follow the host's instructions; the winner banner stays on your page."], ["The link says it has expired?", "The host changed the link — scan the newest QR code."]],
    tips: ["Specific questions are more likely to be picked.", "Someone already asked it? Just like it — popular questions rise to the top."],
    links: [],
  },
];

export const HELP = { zh: ZH, en: EN };
