/* ============================================================
 * TeacherYO · 配置
 * ============================================================
 * 【默认状态】envId 留空 = 本地模式。
 *   数据保存在浏览器里，不用注册任何账号，双击 index.html 就能用。
 *   适合：试用、备课、单机演示。
 *
 * 【多人协作】想让「学生手机扫码提交 → 大屏实时汇聚」，才需要填下面的
 *   CloudBase 配置。完整步骤见 README 的「云端协作版」一节，简述：
 *     1. 在腾讯云开通云开发 CloudBase，记下环境 ID（形如 teacheryo-xxxx）
 *     2. 在控制台开启「匿名登录」，并建好 courses / boards / submissions 三张表
 *     3. 把环境 ID 和 Publishable Key 填到下面
 *
 * 【安全提醒 · 重要】
 *   前端直连数据库，这个文件会随网页一起被任何人下载到。
 *   所以：
 *     · accessKey 只能填 Publishable Key（公开密钥），绝不能填 Secret Key
 *     · 请使用自己的环境，不要共用别人的 envId
 *     · 建表后务必按 README 收紧数据库权限（RLS），否则知道 envId 的人
 *       就能读写你的数据
 *
 *   想把自己的真实配置排除在 Git 之外：写到 config.local.js 即可
 *   （该文件已被 .gitignore 忽略，见 README）。
 * ============================================================ */
window.TY_CONFIG = {
  envId: '',
  region: 'ap-shanghai',
  accessKey: '',
  baseUrl: '',
  tables: { courses: 'courses', boards: 'boards', submissions: 'submissions' }
};
