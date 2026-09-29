# 案例元信息约定

每份课件对应一个 `experiment.json`，是搜索、详情与打包的唯一信息来源。更改后运行 `npm run build`。

| 字段 | 含义 |
| --- | --- |
| id / subject / grade / topic | 与目录路径严格对应的标识，完整案例键由这四部分构成 |
| title / summary | 展示标题与简短介绍，均必填 |
| version / status | 内容版本与 draft、prototype、ready 状态 |
| cover | 相对案例目录的封面路径；null 时使用通用封面 |
| objectives | 可观察的学习目标数组 |
| durationMinutes | 建议时长，正数；草稿可为 null |
| scenario / textbook / requirements | 课堂场景、教材匹配说明、设备及运行条件 |
| interactions / tags | 用于筛选与关键词搜索的标签数组 |
| steps | `{title, minutes, description}` 教学环节数组 |
| libraries | `{name, version}` 固定版本类库，对应共享 registry |
| sharedAssets | 案例实际引用的共享文件，包含传递引用（例如 CSS 导入的 tokens.css） |

不要在元信息中存放平台绝对地址。构建自动推导 `key`、`path` 和 `download`，生成的目录和下载摘要应由脚本更新。

案例私有资源全部随案例打包，隐藏文件、测试与 node_modules 排除；公共库仅按清单收集。共享资源若增加传递依赖，也应同步声明。自动测试会检查 ZIP 内静态 HTML/CSS/ES Module 的相对引用，运行时生成的动态 URL 仍需浏览器验证。
