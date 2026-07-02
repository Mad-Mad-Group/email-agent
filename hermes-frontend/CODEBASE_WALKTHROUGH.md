# Hermes Frontend — 代码框架完整教学

本文用最简单的方式带你读懂整个项目。想像你在组装一台机器：先认识每个零件（第一部分），再看零件之间怎么连线（第二部分），最后拆开每个零件看里面的齿轮怎么转（第三部分）。

---

## 第一部分：每个档案的作用（零件清单）

### 根目录入口

`src/main.tsx` — 整个应用的开机按钮，把 App 组件挂载到 HTML 页面上的 `#root` 节点。

`src/App.tsx` — 应用的总控制台，负责把所有「外壳」套上（主题、路由、认证、API 快取），并定义每个 URL 对应显示哪个页面。

### 样式系统 (`src/styles/`)

`theme.ts` — 一本颜色、间距、圆角、字体的字典，所有组件要用颜色或间距时都来这里查，改一个值就能改全站。

`GlobalStyles.ts` — 全站的「装修基底」，重置浏览器预设样式（去掉 margin、padding），设定字体、字体大小、背景色等全局规则。

`media.ts` — 响应式断点工具，提供 mobile、tablet、desktop 等媒体查询字串，让组件能根据萤幕宽度切换布局。

`styled.d.ts` — TypeScript 的「翻译官」，告诉 styled-components：「你的 theme 长什么样」，让你在写 CSS 时能得到自动提示。

### 类型定义 (`src/types/`)

`theme.ts` — 定义 HermesTheme 介面，规定 theme 物件必须有哪些栏位（colors、spacing、radii 等），相当于 theme 的规格书。

`index.ts` — 定义业务数据的形状，包括 Lead（线索）、EmailDraft（邮件草稿）、SearchResult（搜索结果）、AgentStatus（代理状态）等介面。

### API 层 (`src/api/`)

`client.ts` — HTTP 请求的基础工具，建立一个预设好 baseURL 和 timeout 的 axios 实例，并自动附加认证 token、解包后端回应、处理 401 未授权跳转。

`auth.ts` — 认证相关的 API 函式集合（登入、注册、取得个人资料、改密码等），同时管理 localStorage 里的 token 存取。

`leads.ts` — 线索（Lead）的 CRUD API：列表查询、建立、更新、删除、改状态、标记有兴趣、触发爬取。

`emailQueue.ts` — 邮件队列的 API：列表、查看单封、编辑、审核通过、拒绝、发送。

`services.ts` — 其他业务 API 的集合：用户管理、角色管理、系统设定、搜索、任务队列、AI 分析、Hermes 流水线、文件上传、定时任务。

`hooks.ts` — 把上面所有 API 函式包装成 React Hook（useLeads、useEmailQueue、useUsers 等），让组件能用一行代码就取得数据、自动快取、自动刷新。

`sse.ts` — Server-Sent Events 客户端，跟后端建立持久连线，即时接收线索更新、邮件发送等事件，页面失焦时还能弹出浏览器通知。

`index.ts` — API 模组的统一出口，把所有子模组 re-export，让外部只要写 `from '../api'` 就能引入任何 API 工具。

### 认证上下文 (`src/contexts/`)

`AuthContext.tsx` — 全局认证状态管理器，用 React Context 把「当前用户是谁、有没有登入、怎么登入/登出」这些资讯广播给整个应用。

### 国际化 (`src/i18n/`)

`index.ts` — i18next 的初始化设定，注册三种语言（繁体中文、简体中文、英文），预设繁体中文。

`locales/zhTW.ts` — 繁体中文翻译字典，包含约 250 个键值对。

`locales/zhCN.ts` — 简体中文翻译字典。

`locales/en.ts` — 英文翻译字典。

### 布局 (`src/layouts/`)

`AppLayout.tsx` — 主布局骨架，用 CSS Grid 把画面切成左侧边栏 + 右侧主区域，管理侧边栏展开/收合状态，并提供行动装置的汉堡选单和遮罩。

### 共用组件 (`src/components/`)

`index.ts` — 组件的统一出口（barrel file），让外部一行 import 就能引入多个组件。

`Button/index.tsx` — 通用按钮组件，支援 default（白底边框）、primary（蓝底白字）、sm（小尺寸）三种样式。

`Sidebar/index.tsx` — 左侧导航栏，包含 Logo、分组选单、展开收合动画、滚动条渐变效果、语言切换，底部有登出按钮。

`Topbar/index.tsx` — 顶部工具列，显示页面标题、汉堡按钮（控制侧边栏收合）、搜索框、通知图标、用户头像。

`Table/index.tsx` — 通用表格组件，接受 columns 和 data 阵列，渲染表头和表身，支持空状态和载入状态。

`StatusBadge/index.tsx` — 状态标签组件，根据传入的 status 值（new/pending/contacted/rejected/qualified）自动上色。

`Card/index.tsx` — 白底卡片容器，提供圆角、阴影等基础卡片样式。

`KPICard/index.tsx` — 数据指标卡片，显示一个数值和标题，用在 Dashboard 上展示统计数字。

`PageHeader/index.tsx` — 页面标题组件，显示标题文字和可选的操作按钮区域。

`FilterBar/index.tsx` — 筛选列组件，提供下拉选单和搜索框，让用户过滤表格数据。

`FormField/index.tsx` — 表单栏位组件，包含 label + input 的封装，统一表单项的间距和样式。

`Pagination/index.tsx` — 分页组件，显示页码按钮和上一页/下一页控制。

`LiveFeed/index.tsx` — 即时动态列表，用在 Dashboard 展示最近的系统事件。

### 页面 (`src/pages/`)

`Login/index.tsx` — 登入页面，包含 email/password 表单，提交后调用 AuthContext 的 login 函式。

`Register/index.tsx` — 注册页面，表单结构和登入类似，多了 name 栏位。

`Dashboard/index.tsx` — 仪表板页面，展示 KPI 卡片、折线图、最近线索列表和即时动态。

`Leads/index.tsx` — 线索池（CMS），连接真实 API 展示线索列表，支援筛选、分页、状态切换。

`EmailQueue/index.tsx` — 邮件发件箱（CMS），展示待审核/已发送邮件列表，支持审核、拒绝、发送操作。

`Search/index.tsx` — 线索搜索（CMS），输入关键词和地区触发后端爬虫搜索，展示结果列表。

`Tasks/index.tsx` — 任务管理（CMS），展示后端工作队列的任务列表。

`Users/index.tsx` — 团队管理（CMS），展示系统用户列表。

`Settings/index.tsx` — 系统设定（CMS），展示和更新后端设定项。

`EmailApp/index.tsx` — 邮件客户端（Application），模拟 Luno 风格的邮件收件箱界面，使用 mock 数据。

`Calendar/index.tsx` — 日历页面（Application），使用 mock 数据。

`Customers/index.tsx` — 客户列表（Application），使用 mock 数据。

`Pipeline/index.tsx` — 销售管道（Application），使用 mock 数据。

`Placeholder/index.tsx` — 占位页面，所有尚未实作的路由都指向这里，显示「Coming Soon」。

`AgentPanel/index.tsx` — AI 代理面板（Application），显示代理状态，使用 mock 数据。

`SearchPanel/index.tsx` — 搜索面板（Application），使用 mock 数据。

### Mock 数据 (`src/mock/`)

`leads.ts` — 假的线索数据，供 Application 区域的页面使用。

`emails.ts` — 假的邮件数据。

`agents.ts` — 假的 AI 代理状态数据。

`searchResults.ts` — 假的搜索结果数据。

`index.ts` — Mock 模组的统一出口。

### 工具函式 (`src/utils/`)

`pushNotifications.ts` — Web Push 通知的底层工具函式：检测浏览器支援、注册 Service Worker、订阅/取消订阅推播、将订阅资讯发送到后端。

### 自订 Hook (`src/hooks/`)

`usePushNotifications.ts` — 把 pushNotifications.ts 的工具函式包装成 React Hook，提供 isSubscribed、isLoading、togglePush 等状态和方法，让组件用起来像开关一样简单。

### 公用档案 (`public/`)

`sw.js` — Service Worker 脚本，在浏览器背景执行，负责接收后端推送的通知并显示给用户。

---

## 第二部分：档案之间的互动（连线图）

### 启动链

应用启动像一条链：`main.tsx` 挂载 `App.tsx`，App 里面像套娃一样从外到内层层包裹：最外层是 `QueryClientProvider`（API 快取），然后是 `AuthProvider`（认证状态），再来是 `ThemeProvider`（主题颜色），最里面是 `BrowserRouter`（路由）。每一层都给内部所有组件提供一种能力。

### 认证流程

`AuthContext.tsx` 是认证的中枢。它调用 `auth.ts` 的函式跟后端通讯（登入/注册），auth.ts 内部用 `client.ts` 发 HTTP 请求。登入成功后，AuthContext 把 token 存到 localStorage（通过 auth.ts 里的 tokenStore），同时把 user 和 token 放进 React 状态。之后 client.ts 的请求拦截器会自动从 localStorage 取 token 塞到每个请求的 Header 里，所以其他 API 调用不用手动处理认证。如果后端回 401，client.ts 的回应拦截器会清掉 token 并跳转到登入页。

### 路由守卫

`App.tsx` 里有个 `ProtectedRoute` 组件。它从 AuthContext 读 token：有 token 就放行（渲染 `<Outlet />`），没有就重定向到 `/login`。所有需要登入的页面都嵌套在 ProtectedRoute 内部。

### 布局与页面的关系

通过路由守卫后，所有页面都渲染在 `AppLayout` 里面。AppLayout 用 CSS Grid 画出「侧边栏 + 主区域」的骨架，主区域里面放 Topbar 和一个 `<Outlet />`。这个 Outlet 就是「页面插槽」——路由匹配到哪个页面组件（Dashboard、Leads、Settings 等），那个组件就填进这个插槽。

### 主题怎么流动

`theme.ts` 定义主题物件 → `App.tsx` 里的 ThemeProvider 把它注入 → 任何 styled-component 都能通过 `${({ theme }) => theme.colors.blue}` 读取。`styled.d.ts` 让 TypeScript 知道 theme 的结构，所以你写 `theme.colors.` 时编辑器会自动提示 canvas、surface、blue 等选项。`GlobalStyles.ts` 也读取 theme 来设定全局字体和背景色。

### API 数据怎么从后端到页面

以 Leads 页面为例：`Leads/index.tsx` 调用 `useLeads()`（来自 hooks.ts）→ useLeads 内部用 TanStack Query 的 `useQuery` 包装 `leadsApi.list()`（来自 leads.ts）→ leadsApi.list 用 `client`（来自 client.ts）发 GET 请求到 `/leads` → client.ts 自动加上 token 和 baseURL → 后端回应经过 client.ts 的回应拦截器解包 → useQuery 把数据存入快取 → 组件拿到 `{ data, isLoading }` 去渲染。改动数据时（例如删除一个 lead），useMutation 发请求后会调用 `queryClient.invalidateQueries` 通知快取「leads 的数据过期了」，TanStack Query 自动重新拉取最新列表。

### CMS 页面 vs Application 页面

CMS 页面（路由以 `/cms-` 开头）调用 `hooks.ts` 里的 Hook，这些 Hook 会发真实 API 请求。Application 页面（路由以 `/app-` 开头或像 `/dashboard`）从 `mock/` 资料夹取假数据。两种页面用的 UI 组件（Table、Button、StatusBadge 等）是共用的。

### 国际化怎么运作

`i18n/index.ts` 在 App 启动时初始化 i18next 并注册三个语言包。任何组件调用 `useTranslation()` 就能拿到 `t` 函式，用 `t('nav.dashboard')` 查找对应语言的翻译文字。切换语言时所有用 `t()` 的地方自动更新。Sidebar 底部的语言选择器调用 `i18n.changeLanguage()` 来切换。

### 即时事件流

`sse.ts` 里的 `sseClient`（单例）在某个地方调用 `connect(url)` 后，会跟后端建立一条 EventSource 长连线。后端有新事件（lead_update、email_sent 等）会即时推过来。sseClient 把事件分发给所有通过 `onEvent()` 注册的回调函式。如果页面失焦且浏览器允许通知，sseClient 还会自动弹出浏览器通知。

### Web Push 通知

`pushNotifications.ts` 处理与浏览器 Push API 的交互（注册 SW、订阅推播），`usePushNotifications.ts` 把它包装成 Hook 让组件使用。`sw.js`（Service Worker）在浏览器关闭后依然能接收后端推来的讯息并显示通知。跟 SSE 不同，Push 不需要页面打开就能收到通知。

### 组件之间的组合

页面组件（如 Leads）内部会组合多个共用组件：FilterBar 做筛选 → 结果传给 Table 渲染 → Table 底下放 Pagination 控制分页 → 每行的 status 栏位用 StatusBadge 上色。页面自己管理 state（筛选条件、当前页码），通过 props 传给这些子组件。

---

## 第三部分：每个档案的语法与逻辑（齿轮怎么转）

### `src/main.tsx`

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
```
前三行是 import，从 react 和 react-dom 取工具。`StrictMode` 是 React 的除错工具，会在开发模式重复渲染组件帮你找 bug。`createRoot` 是 React 18+ 的新挂载方式。`App` 是我们自己的根组件。

```tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```
`document.getElementById('root')` 找到 HTML 里 id 为 root 的 div。后面的 `!` 是 TypeScript 的「非空断言」——告诉编译器「我保证这不会是 null」。`createRoot` 建立一个渲染根节点，`.render()` 把 App 画上去。JSX 的 `<App />` 就像 HTML 标签一样，但其实是呼叫 App 函式。

### `src/App.tsx`

```tsx
const ProtectedRoute: React.FC = () => {
  const { token, loading } = useAuth();
  if (loading) return null;
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};
```
这是一个函式组件。`React.FC` 是 TypeScript 的类型标注，表示「这是一个 React 函式组件」。`useAuth()` 是自订 Hook，从 AuthContext 拿认证状态。如果还在载入就回传 null（什么都不画），如果有 token 就渲染 `<Outlet />`（子路由插槽），否则跳转到登入页。`replace` 表示用「替换」而非「推入」历史记录，这样用户按返回键不会回到受保护的页面。

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
  },
});
```
建立 TanStack Query 的客户端实例。`staleTime: 5 * 60 * 1000` 意思是数据在 5 分钟内算「新鲜」，不会重复请求。`retry: 1` 表示请求失败只重试一次。

```tsx
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider theme={theme}>
          <GlobalStyles />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  ...
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
```
这里的嵌套顺序非常重要。Provider 像洋葱皮一样一层包一层，每层给内部提供一种能力。`<GlobalStyles />` 没有子元素，它通过 `createGlobalStyle` 把 CSS 注入到全局。路由结构：`/login` 和 `/register` 在 ProtectedRoute 外面（不需要登入就能访问），其他路由都在里面。`path="*"` 是万用路由，匹配所有未定义的路径，重定向到 dashboard。

### `src/styles/theme.ts`

```tsx
export const theme: HermesTheme = {
  colors: {
    canvas: '#f0f3f5',     // 页面底色（灰）
    surface: '#ffffff',     // 卡片/面板底色（白）
    blue: '#7fb5ba',        // 主色调
    ...
  },
  spacing: {
    xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
  },
  ...
};
```
这是一个普通的 JavaScript 物件，但有 TypeScript 类型标注 `: HermesTheme`。这意味著你不能随便加减栏位——必须严格符合 HermesTheme 介面定义的结构。颜色用十六进制字串，间距用数字（px 值）。之后在 styled-components 里通过 `${({ theme }) => theme.spacing.md}px` 来读取。

### `src/styles/GlobalStyles.ts`

```tsx
export const GlobalStyles = createGlobalStyle`
  *, *::before, *::after {
    margin: 0; padding: 0; box-sizing: border-box;
  }
  body {
    font-family: ${({ theme }) => theme.fonts.primary};
    color: ${({ theme }) => theme.colors.textPrimary};
    background-color: ${({ theme }) => theme.colors.canvas};
  }
  ...
`;
```
`createGlobalStyle` 是 styled-components 的特殊函式，用反引号 `` ` `` 包裹的是 CSS 模板字串。`*` 选择器选中所有元素。`box-sizing: border-box` 让元素的宽高包含 padding 和 border（否则预设是只算内容区域，加 padding 会撑大元素）。`${({ theme }) => ...}` 是模板字串插值——在 CSS 中间插入 JavaScript 表达式，从 theme 读取值。

### `src/styles/media.ts`

```tsx
export const media = {
  mobile: `@media (max-width: 639px)`,
  tablet: `@media (min-width: 640px) and (max-width: 1023px)`,
  desktop: `@media (min-width: 1024px)`,
  ...
};
```
每个属性都是一个 CSS 媒体查询字串。用法：在 styled-component 里写 `${media.mobile} { display: none; }`，就像在 CSS 里写 `@media (max-width: 639px) { display: none; }`。这样避免每次都手写数字。

### `src/styles/styled.d.ts`

```tsx
import 'styled-components';
import { HermesTheme } from '../types/theme';

declare module 'styled-components' {
  export interface DefaultTheme extends HermesTheme {}
}
```
这是 TypeScript 的「模组扩展」。styled-components 原本的 DefaultTheme 是个空介面。这里告诉 TypeScript：「把 DefaultTheme 扩展成 HermesTheme 的形状」。这样你在 `${({ theme }) => theme.colors.blue}` 里面打 `theme.` 就会自动提示 colors、spacing 等属性。`declare module` 不会产生任何 JavaScript 代码，纯粹是类型声明。

### `src/types/theme.ts`

```tsx
export interface StatusColor {
  bg: string;
  fg: string;
}

export interface HermesTheme {
  colors: { canvas: string; surface: string; ... };
  spacing: { xs: number; sm: number; ... };
  ...
}
```
`interface` 定义了物件的「形状」。如果你给 theme 物件少了一个必要栏位或类型不对，TypeScript 编译时就会报错。`StatusColor` 被嵌套在 HermesTheme 的 `status` 属性里，每个状态（new、pending 等）都有背景色 bg 和前景色 fg。

### `src/types/index.ts`

```tsx
export interface Lead {
  id: string;
  company: string;
  status: 'new' | 'pending' | 'contacted' | 'qualified' | 'rejected';
  aiScore: number;
  ...
}
```
`'new' | 'pending' | ...` 是 TypeScript 的「联合类型」，表示 status 只能是这几个字串之一，写错会报错。这些介面主要给 Application 页面的 mock 数据用。CMS 页面用的介面定义在各自的 API 档案里（如 leads.ts）。

### `src/api/client.ts`

```tsx
const client: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});
```
`axios.create` 建立一个自订的 HTTP 客户端。`import.meta.env.VITE_API_URL` 读取 Vite 环境变数（定义在 `.env` 档案里），如果没设就用 `/api` 作为预设。`timeout: 15000` 表示请求超过 15 秒自动失败。

```tsx
client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('hermes_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);
```
「拦截器」是 axios 的中间件机制。每个请求发出前，这段代码会先跑一遍：从 localStorage 取 token，塞到请求标头里。`Bearer` 是 JWT 认证的标准格式。如果没有 token 就不加——这样登入请求就不会带 token。

```tsx
client.interceptors.response.use(
  (response: AxiosResponse) => {
    const body = response.data;
    if (body && typeof body === 'object' && 'status' in body && 'data' in body && body.status === 'success') {
      response.data = body.data;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('hermes_token');
      localStorage.removeItem('hermes_user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```
回应拦截器有两个函式：第一个处理成功回应，第二个处理错误。后端回应格式是 `{ status: 'success', data: { ... } }`，拦截器把它「解包」，让调用方直接拿到 data 部分而不需要写 `res.data.data`。401 错误代表「未授权」（token 过期或无效），拦截器自动清掉本地 token 并跳到登入页。`?.` 是可选链（optional chaining），如果 error.response 是 undefined 就不会继续访问 .status，避免报错。

### `src/api/auth.ts`

```tsx
export const authApi = {
  login: (data: LoginPayload) =>
    client.post<AuthResult>('/auth/login', data),
  me: () =>
    client.get<User>('/auth/me'),
  ...
};
```
每个方法都是一个箭头函式，调用 client 的 get/post/patch 方法。`client.post<AuthResult>` 里的 `<AuthResult>` 是泛型——告诉 TypeScript 回应的 data 类型是 AuthResult，这样你拿到结果后打 `.data.` 就能看到 access_token 和 user 的提示。

```tsx
export const tokenStore = {
  get: () => localStorage.getItem('hermes_token'),
  set: (token: string) => localStorage.setItem('hermes_token', token),
  remove: () => {
    localStorage.removeItem('hermes_token');
    localStorage.removeItem('hermes_user');
  },
  ...
};
```
tokenStore 把 localStorage 操作封装起来，这样如果将来要改存储方式（比如改用 cookie），只要改这一个地方。

### `src/api/leads.ts`

```tsx
export type CreateLeadPayload = Omit<Lead, '_id' | 'createdAt' | 'updatedAt'>;
export type UpdateLeadPayload = Partial<CreateLeadPayload>;
```
`Omit<Lead, '_id' | 'createdAt' | 'updatedAt'>` 是 TypeScript 工具类型，意思是「Lead 介面去掉 _id、createdAt、updatedAt 这三个栏位」——因为建立时这三个由后端自动生成。`Partial<...>` 让所有栏位变成可选——因为更新时你可能只想改其中几个栏位。

```tsx
export const leadsApi = {
  list: (params?: LeadListParams) =>
    client.get<LeadListResponse>('/leads', { params }),
  update: (id: string, data: UpdateLeadPayload) =>
    client.patch<Lead>(`/leads/${id}`, data),
  ...
};
```
`{ params }` 是 ES6 物件简写，等价于 `{ params: params }`。axios 会自动把 params 物件转成 URL query string（例如 `?page=1&limit=10`）。反引号 `` ` `` 包裹的是模板字串，`${id}` 会被变数值替换。

### `src/api/emailQueue.ts`

结构跟 leads.ts 完全一样：定义介面 → 导出 API 物件。每个方法对应一个后端 endpoint。approve/reject/send 是针对单封邮件的动作 endpoint。

### `src/api/services.ts`

这个档案把多个小 API 集合放在一起：usersApi、rolesApi、settingsApi、searchApi、tasksApi、aiApi、hermesApi、uploadsApi、jobsApi。每个集合的写法都一样——一个物件里面放几个箭头函式。

```tsx
export const uploadsApi = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post('/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
```
文件上传需要用 `FormData` 而非 JSON，所以要手动设定 Content-Type 为 `multipart/form-data`。`File` 是浏览器的原生类型，代表用户通过 `<input type="file">` 选中的文件。

### `src/api/hooks.ts`

```tsx
export const useLeads = (params?: LeadListParams) =>
  useQuery({
    queryKey: ['leads', params],
    queryFn: () => leadsApi.list(params).then(r => r.data),
  });
```
`useQuery` 是 TanStack Query 的核心 Hook。`queryKey` 是快取的键——相同的 key 共享同一份快取数据。params 也放进 key，这样不同筛选条件的结果分开快取。`queryFn` 是实际取数据的函式。useQuery 返回 `{ data, isLoading, isError, refetch }` 等状态。

```tsx
export const useCreateLead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: leadsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
};
```
`useMutation` 用于修改操作（POST/PATCH/DELETE）。`mutationFn` 是要执行的 API 函式。`onSuccess` 在成功后调用 `invalidateQueries`——这不是直接删除快取，而是标记 `['leads']` 相关的快取为「过期」，TanStack Query 会在下次需要时自动重新请求。`useQueryClient()` 取得 App.tsx 里建立的 queryClient 实例。

### `src/api/sse.ts`

```tsx
export class SSEClient {
  private eventSource: EventSource | null = null;
  private listeners: Map<SSEEventType, Set<EventCallback>> = new Map();
  ...
}
```
这是少数用 class（类）而非函式组件的地方。`private` 表示外部不能直接访问这些属性。`Map<SSEEventType, Set<EventCallback>>` 是一个「映射表」——每个事件类型对应一组回调函式。`EventSource` 是浏览器原生的 SSE API。

```tsx
connect(url: string): void {
  this.disconnect();
  this.eventSource = new EventSource(url);
  eventTypes.forEach((type) => {
    this.eventSource!.addEventListener(type, (event: MessageEvent) => {
      const sseEvent: SSEEvent = {
        type,
        data: JSON.parse(event.data),
        timestamp: new Date().toISOString(),
      };
      if (this.browserNotificationsEnabled) {
        maybeShowBrowserNotification(sseEvent);
      }
      this.emit(type, sseEvent);
    });
  });
}
```
`connect` 先断开旧连线，再建新的。`forEach` 遍历所有事件类型，为每种类型注册监听器。收到事件时先解析 JSON，然后尝试弹通知，最后调用 `emit` 分发给所有已注册的回调。

```tsx
export const sseClient = new SSEClient();
```
最后一行建立一个单例——全应用只有一个 SSEClient 实例，避免建立多条重复连线。

### `src/contexts/AuthContext.tsx`

```tsx
const AuthContext = createContext<AuthState | null>(null);
```
`createContext` 建立一个 React Context 容器。泛型 `<AuthState | null>` 表示容器里可以装 AuthState 或 null。初始值是 null，因为 Provider 还没挂载前没有有效状态。

```tsx
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(tokenStore.getUser());
  const [token, setToken] = useState<string | null>(tokenStore.get());
  ...
```
`useState` 是 React 的状态 Hook。初始值从 localStorage 读取——这样页面刷新后如果有储存的 token，用户不需要重新登入。`useState<User | null>` 明确类型：user 可能是 User 物件也可能是 null。

```tsx
  useEffect(() => {
    if (token && !user) {
      authApi.me()
        .then(res => { setUser(res.data); tokenStore.setUser(res.data); })
        .catch(() => { tokenStore.remove(); setToken(null); setUser(null); });
    }
  }, []);
```
`useEffect` 在组件挂载后执行。空依赖阵列 `[]` 表示只跑一次。逻辑：如果有 token 但没有 user 资料（可能只存了 token），就调用 `/auth/me` 补回 user 资讯。失败的话清掉一切，让用户重新登入。

```tsx
  const login = useCallback(async (data: LoginPayload) => {
    setLoading(true);
    try {
      const res = await authApi.login(data);
      const { access_token, user: u } = res.data;
      tokenStore.set(access_token);
      setToken(access_token);
      setUser(u);
    } finally {
      setLoading(false);
    }
  }, []);
```
`useCallback` 记忆化函式——除非依赖改变，否则每次渲染都返回同一个函式引用，避免不必要的子组件重新渲染。`async/await` 让异步代码看起来像同步的。`const { access_token, user: u } = res.data` 是解构赋值，`user: u` 表示把 user 重命名为 u（因为外层已有 user 变数）。`finally` 不管成功失败都执行——确保 loading 状态被重置。

```tsx
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
```
自订 Hook，从 Context 取值。如果在 AuthProvider 外面调用（ctx 为 null），直接报错——这是一种防御性程式设计，帮你在开发时立即发现错误。

### `src/i18n/index.ts`

```tsx
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    'zh-TW': { translation: zhTW },
    'zh-CN': { translation: zhCN },
  },
  lng: 'zh-TW',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});
```
`.use(initReactI18next)` 把 i18next 和 React 绑定（让 useTranslation Hook 能用）。`resources` 注册语言包，每个语言下面有一个 `translation` 命名空间。`lng` 是预设语言。`fallbackLng` 是找不到翻译时的退路语言。`escapeValue: false` 关闭 HTML 转义——React 已经自动防 XSS 了。

### `src/layouts/AppLayout.tsx`

```tsx
const Shell = styled.div<{ $collapsed?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $collapsed }) => $collapsed ? '61px' : '225px'} 1fr;
  min-height: 100vh;
  transition: grid-template-columns 0.3s ease;
  ...
`;
```
`styled.div<{ $collapsed?: boolean }>` 建立一个带自订 prop 的 styled div。`$` 前缀是 styled-components v5+ 的惯例，表示「transient prop」——不会传递到真实的 DOM 元素上（避免 React 报 unknown prop 警告）。CSS Grid 的 `grid-template-columns` 定义了两列：侧边栏（展开 225px / 收合 61px）和内容区域（1fr = 剩余空间全部占满）。`transition` 让宽度变化有 0.3 秒的动画。

```tsx
const AppLayout: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const toggleSidebar = useCallback(() => setSidebarCollapsed(prev => !prev), []);
  ...
  return (
    <Shell $collapsed={sidebarCollapsed}>
      <Sidebar collapsed={sidebarCollapsed} ... />
      <Main>
        <Topbar onToggleSidebar={toggleSidebar} sidebarCollapsed={sidebarCollapsed} ... />
        <Content>
          <PageTransition key={location.key}>
            <Outlet />
          </PageTransition>
        </Content>
      </Main>
    </Shell>
  );
};
```
`useState(false)` 初始状态：侧边栏展开、手机选单关闭。`prev => !prev` 是基于前一个状态的更新——比 `!sidebarCollapsed` 更安全，因为 setState 是异步的。`key={location.key}` 让每次路由切换时 PageTransition 组件重新挂载，从而触发淡入动画。`<Outlet />` 是 react-router 的子路由插槽。

### `src/components/Button/index.tsx`

```tsx
const primaryStyles = css`
  background: ${({ theme }) => theme.colors.blue};
  color: #fff;
`;

const StyledButton = styled.button<{ $variant: string }>`
  ...
  ${({ $variant }) => $variant === 'primary' && primaryStyles}
`;
```
`css` 是 styled-components 的辅助函式，把一段 CSS 封装成可复用的片段。在 StyledButton 里用条件判断——如果 variant 是 'primary' 就把 primaryStyles 的 CSS 混入。`&&` 短路求值：左边为 false 时整个表达式为 false（不套用），左边为 true 时返回右边的值（套用 CSS）。

```tsx
export const Button: React.FC<ButtonProps> = ({
  variant = 'default', children, onClick, disabled, type = 'button',
}) => (
  <StyledButton $variant={variant} onClick={onClick} disabled={disabled} type={type}>
    {children}
  </StyledButton>
);
```
函式参数的 `= 'default'` 是预设值。`children` 是 React 的特殊 prop，代表标签之间的内容（例如 `<Button>点我</Button>` 里的「点我」）。外部传 `variant="primary"`，内部转成 `$variant="primary"` 传给 styled 组件。

### `src/api/index.ts`

```tsx
export * from './hooks';
export * from './auth';
export { default as apiClient } from './client';
export { sseClient } from './sse';
```
`export * from` 把另一个档案的所有 named export 全部 re-export。`export { default as apiClient }` 把 client.ts 的 default export 重命名为 apiClient 再导出。这样其他档案只要 `import { useLeads, authApi, apiClient } from '../api'` 就能取得任何 API 工具，不需要记住每个子档案的路径。

### `src/utils/pushNotifications.ts`

```tsx
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}
```
`'serviceWorker' in navigator` 检查浏览器是否支援 Service Worker。`in` 运算子检查物件是否有某个属性。三个条件用 `&&` 连接——全部为 true 才算支援。

```tsx
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  ...
}
```
VAPID 公钥用 URL-safe Base64 编码，但浏览器的 `subscribe()` 需要 `Uint8Array`。这个函式做转换：先补齐 padding，把 URL-safe 字符换回标准 Base64 字符，用 `atob` 解码成原始字串，再逐字节转成 Uint8Array。

```tsx
export async function subscribeToPush(): Promise<PushSubscription | null> {
  const permission = await requestPushPermission();
  if (permission !== 'granted') return null;
  const registration = await registerServiceWorker();
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }
  await sendSubscriptionToServer(subscription);
  return subscription;
}
```
订阅流程：先请求通知权限 → 注册 Service Worker → 检查是否已有订阅 → 没有就建立新的 → 把订阅资讯发到后端。`userVisibleOnly: true` 是 Chrome 的要求，表示每次收到推送都必须显示通知（不能静默推送）。`applicationServerKey` 是 VAPID 公钥，让后端能验证推送来源。

### `src/hooks/usePushNotifications.ts`

```tsx
const [state, setState] = useState<PushNotificationState>({
  isSupported: false, isSubscribed: false, permission: 'default',
  isLoading: false, error: null,
});
```
把多个相关状态合成一个 state 物件——比用五个 `useState` 更好维护。`setState((prev) => ({ ...prev, isLoading: true }))` 用展开运算子 `...prev` 保留其他栏位不变，只更新 isLoading。

```tsx
const togglePush = useCallback(async () => {
  if (state.isSubscribed) {
    const success = await unsubscribeFromPush();
    ...
  } else {
    const subscription = await subscribeToPush();
    ...
  }
}, [state.isSubscribed]);
```
`[state.isSubscribed]` 是依赖阵列——当 isSubscribed 变化时才重新建立函式，确保函式内部读到的 isSubscribed 是最新值。toggle 逻辑：已订阅就取消，未订阅就订阅。

### 页面组件的共通模式

所有 CMS 页面（Leads、EmailQueue、Search、Tasks、Users、Settings）都遵循同一个模式：

1. import styled-components + useTranslation + API hooks
2. 用 styled-components 定义页面专用的样式组件（Page、Card、CardHeader、CardBody 等）
3. 在函式组件里调用 `const { t } = useTranslation()` 和 API hook（如 `useLeads()`）
4. 用 `useState` 管理本地状态（筛选条件、分页、Modal 开关等）
5. return JSX，用上面的样式组件搭建页面结构

以 Settings 为例：

```tsx
const Settings: React.FC = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useSettings();
  const [busy, setBusy] = useState(false);
  ...
  const entries: [string, unknown][] = data ? Object.entries(data) : [];
  ...
  return (
    <Page>
      <Card>
        <CardHeader><h2>{t('settings.currentConfig')}</h2></CardHeader>
        <CardBody>
          {isLoading && <EmptyText>{t('settings.loadingSettings')}</EmptyText>}
          {!isLoading && entries.map(([key, val]) => (
            <SettingRow key={key}>
              <SettingKey>{humanKey(key)}</SettingKey>
              <SettingValue>{renderValue(val, t)}</SettingValue>
            </SettingRow>
          ))}
        </CardBody>
      </Card>
    </Page>
  );
};
```
`Object.entries(data)` 把物件转成 `[key, value]` 阵列。`.map()` 遍历每一对，渲染一个 SettingRow。`key={key}` 是 React 列表渲染的必要 prop——帮助 React 识别哪个项目变了。`{isLoading && ...}` 是条件渲染：isLoading 为 true 时才渲染后面的元素。

---

以上就是整个 Hermes Frontend 的代码框架。核心思路总结：main.tsx 启动 → App.tsx 搭建外壳（Provider 层层嵌套）→ AppLayout 画骨架（Grid 布局）→ 各页面通过 API Hooks 取数据 → styled-components 处理样式 → i18n 处理多语言 → 认证/路由守卫保护页面安全。

---

## 第四部分：团队分工与你必须掌握的技术

### 团队结构

这个项目有三个人：

Person A（前端工程师，也就是你的岗位）负责整个 React 前端，包括所有页面、共用组件、多语言、Storybook。

Person B（后端核心工程师）负责 NestJS 项目骨架、用户系统（JWT 认证、角色权限）、全局基础设施（统一回应格式、安全配置、文件上传）。他提供 Guards 和 API 格式规范给 A 和 C 用。

Person C（后端业务 / AI 工程师）负责搜客核心业务逻辑：Lead 管理、CUA 搜寻、爬虫、AI 分析、Email 草稿生成、Pipeline 调度、SSE 即时广播。

简单来说：B 盖房子的地基和水电，C 在房子里摆家具和开店做生意，A 负责顾客看到和摸到的一切——门面、装潢、按钮、萤幕上的每一个画素。

### 前端（Person A）必会技能清单

以下按「面试被问到必须答得出来」的标准整理，分核心和加分两级。

#### 核心必会（不会就过不了关）

**React 基础与 Hooks**
你在这个项目里天天用的东西。必须能解释清楚：useState 怎么触发重新渲染、useEffect 的依赖阵列机制（空阵列 vs 有值 vs 不传）、useCallback/useMemo 为什么存在（避免不必要的重新渲染）、useContext 怎么跨组件传递数据。自订 Hook 的写法和用途（如 useAuth、usePushNotifications）。组件的生命周期概念（挂载、更新、卸载对应 useEffect 的行为）。

项目对应：AuthContext.tsx（useContext + useState + useEffect + useCallback 全用上了）、usePushNotifications.ts（自订 Hook 完整范例）、所有页面组件。

**TypeScript**
不需要精通泛型体操，但必须会：interface 和 type 的定义与差别、泛型的基本用法（`useState<User | null>`、`client.get<Lead>`）、工具类型 Omit/Partial/Pick 的含义、联合类型（`'new' | 'pending' | 'contacted'`）、可选属性（`?`）和非空断言（`!`）。

项目对应：types/theme.ts（介面定义）、leads.ts（Omit + Partial）、styled.d.ts（模组扩展）。

**styled-components（CSS-in-JS）**
面试常问的方向：为什么用 CSS-in-JS 而不是普通 CSS（作用域隔离、动态样式、主题系统）、ThemeProvider 的原理（React Context）、transient props（`$` 前缀）的作用、`css` helper 的用途、怎么做响应式（media queries）。

项目对应：所有组件和页面的 styled 定义、theme.ts（design tokens）、GlobalStyles.ts、media.ts。

**React Router**
路由配置（Routes/Route 嵌套）、`<Outlet />` 的作用（子路由插槽）、路由守卫的实现方式（ProtectedRoute）、`<Navigate>` 重定向、`useLocation`/`useNavigate` 的用法。

项目对应：App.tsx（完整的路由配置 + 守卫逻辑）、AppLayout.tsx（用 useLocation 判断当前路径）。

**Axios + HTTP 请求**
axios.create 建立实例、拦截器（interceptors）的概念和用途——请求拦截器加 token、回应拦截器解包和错误处理。REST API 的 CRUD 对应（GET/POST/PATCH/DELETE）。JWT Bearer Token 认证流程。

项目对应：client.ts（完整的拦截器范例）、auth.ts + leads.ts + emailQueue.ts + services.ts（各种 API 调用）。

**TanStack Query（React Query）**
useQuery 和 useMutation 的区别、queryKey 的快取机制、staleTime 的含义、invalidateQueries 怎么触发重新拉取、为什么用它而不是手动 useEffect + fetch（自动快取、自动重试、loading/error 状态管理、避免重复请求）。

项目对应：hooks.ts（所有 useQuery 和 useMutation 的用法）、App.tsx（QueryClient 配置）。

**组件设计模式**
怎么拆分共用组件（Button、Table、Pagination 等）、props 设计（哪些必传、哪些可选、预设值怎么设）、children prop 的用法、条件渲染（`&&` 短路、三元运算子）、列表渲染（`.map()` + key）。Barrel file（index.ts 统一导出）的模式。

项目对应：components/ 整个目录、每个页面的 JSX 结构。

#### 加分项（会了让你脱颖而出）

**i18next 多语言**
初始化配置、useTranslation Hook、语言切换机制、翻译键值的组织方式。面试问「你怎么做国际化」时能完整回答。

项目对应：i18n/index.ts + 三个 locale 档案 + 所有组件里的 `t()` 调用。

**Vite**
为什么用 Vite 不用 Webpack（ESM 原生支持、冷启动快、HMR 快）、环境变数的用法（`import.meta.env.VITE_*`）、基本配置。

项目对应：vite.config.ts、client.ts 里的 `import.meta.env.VITE_API_URL`。

**SSE（Server-Sent Events）**
跟 WebSocket 的区别（单向 vs 双向、自动重连、更轻量）、EventSource API 的用法、在什么场景下选 SSE。

项目对应：sse.ts。

**Web Push + Service Worker**
Push API 的整体流程（订阅 → 发到后端 → 后端推送 → SW 接收 → 显示通知）、VAPID 的作用、Service Worker 的生命周期。

项目对应：pushNotifications.ts + usePushNotifications.ts + sw.js。

**Storybook**
为什么要用（组件开发和测试的隔离环境、设计师和开发者的沟通工具）、CSF3 格式的写法、怎么覆盖不同状态（loading/empty/error）。

项目对应：.storybook/ 配置 + 各组件的 story 档案。

**CSS Grid + Flexbox**
Grid 的 `grid-template-columns`、`1fr` 的含义、Grid 和 Flex 的选择时机（Grid 做大布局、Flex 做一维排列）。

项目对应：AppLayout.tsx（Grid 布局）、几乎所有组件（Flex 排列）。

### 面试怎么讲这个项目

别人问你「实习做了什么」时，可以这样组织：

「我在一个三人团队里负责前端，项目是一个 B2B Lead Scraper CMS，用 React + TypeScript + Vite 搭建。技术上我做了这些事：用 styled-components 搭建了完整的主题系统和 design tokens，实现了包括 Table、FilterBar、Pagination 在内的十多个共用组件；用 React Router 做了路由守卫和嵌套路由；用 TanStack Query 管理所有 API 状态，包括快取、自动重新拉取和乐观更新；用 i18next 实现了三语支持，覆盖了约 250 个翻译键；整合了 SSE 即时事件流和 Web Push 通知；用 Storybook 为所有共用组件写了 stories，覆盖 loading/empty/error 状态。和后端的协作方面，他们用 NestJS 提供 RESTful API，统一的回应格式是 `{ status, data, total, page }`，我在前端用 Axios 拦截器自动解包，JWT token 自动附加和 401 跳转都在拦截器里处理。」

### 你需要了解但不需要深入的后端知识

作为前端，你不需要会写 NestJS，但面试可能问到「你跟后端怎么协作」「你了解后端架构吗」：

Person B 做的基础设施你要知道的：JWT 认证流程（前端怎么存 token、怎么自动带到请求里、token 过期怎么处理）、统一 API 回应格式（`{ status: 'success', data: {...} }`，你的拦截器怎么解包）、CORS 是什么（跨域请求，开发时为什么需要 proxy 或后端配置允许）。

Person C 做的业务你要知道的：Lead 的状态流转（new → pending → contacted）你前端怎么展示和切换、SSE 事件有哪些类型（hermes_log、lead_update、pipeline_progress、email_sent）你前端怎么监听和处理、Email Queue 的审批流程（pending → approved → sent 或 rejected）你前端怎么提供操作按钮。

核心原则：你不用知道后端怎么实现的，但你要能清楚说出「前端和后端之间的接口是什么、数据怎么流动」。
