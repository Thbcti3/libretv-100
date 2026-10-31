// LibreTV 启动器：从 sources.json 注入点播源，然后启动 Next.js standalone 服务
// 用法: node start.js   （可用 PORT 环境变量覆盖端口，默认 8080）
const fs = require('fs')
const path = require('path')

const dir = __dirname
const file = path.join(dir, 'sources.json')

let sources = []
try {
  sources = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''))
  if (!Array.isArray(sources)) throw new Error('必须是 JSON 数组')
  const valid = sources.filter((s) => s && typeof s.name === 'string' && /^https?:\/\//.test(String(s.url || '')))
  if (valid.length !== sources.length) console.warn(`[LibreTV] sources.json 中有 ${sources.length - valid.length} 条格式不正确，已忽略`)
  sources = valid
} catch (e) {
  console.error(`[LibreTV] 读取 sources.json 失败: ${e.message}`)
  process.exit(1)
}

process.env.DEFAULT_SOURCES = JSON.stringify(
  sources.map((s) => ({ name: s.name, url: s.url.replace(/\/+$/, ''), ...(s.detail ? { detail: s.detail } : {}) }))
)
// 访问密码：首次打开需输入
process.env.PASSWORD = process.env.PASSWORD || '13622'

// 后台管理员账号（/admin）
process.env.ADMIN_USER = process.env.ADMIN_USER || '1362280'
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Aa230702'

process.env.PORT = process.env.PORT || '8080'
process.env.HOSTNAME = '0.0.0.0'

// 首页默认展示豆瓣推荐（热度/美剧/动漫/其他 四个分类 tab 在这个板块里）
process.env.DEFAULT_RECOMMEND_SOURCE = process.env.DEFAULT_RECOMMEND_SOURCE || 'douban'

// 30 个源并行搜索，默认 5 页/源太慢：限 2 页，并把单源超时放宽到 8 秒
process.env.SEARCH_MAX_PAGES = process.env.SEARCH_MAX_PAGES || '1'
process.env.SEARCH_SOURCE_TIMEOUT_MS = process.env.SEARCH_SOURCE_TIMEOUT_MS || '5000'
process.env.SEARCH_CONCURRENCY = process.env.SEARCH_CONCURRENCY || '100'

console.log(`[LibreTV] 预置点播源 ${sources.length} 个，端口 ${process.env.PORT}`)

require('./server.js')
