# HTML 互动课件实验台

用于探索不同学科、年级、知识点的沉浸式互动课件。每次实验独立存放，可采用原生 JavaScript 或按需引入类库。共享层只收纳可跨实验复用的内容。

## 开始使用

开发需要 Node.js 20 或更新版本。首次安装固定版本的构建依赖：

```sh
npm ci
```

启动时自动生成案例目录与下载包：

```sh
npm run dev
```

打开 http://localhost:5173 查看案例中心。支持中文关键词、学科、年级、互动类型组合筛选。进入案例详情可查看学习目标、教学流程与使用条件，再启动沉浸演示或下载 ZIP。通过 HTTP 访问课件，不要直接双击 HTML 文件。

创建一个实验：

```sh
npm run new -- --subject geography --grade grade-7 --topic earth-rotation --name 地球自转初探
npm run check
```

命令自动分配该知识点下的实验编号，并更新首页目录。参数使用小写英文和连字符，展示名称可使用中文。年级推荐 `grade-1` 至 `grade-12`，跨年级可用 `mixed`。

## 目录约定

```text
experiments/                        所有独立实验
  geography/                        学科
    grade-7/                        年级
      earth-rotation/               知识点
        exp-001/                    一次实验
          index.html                课件入口
          main.js                   本实验交互
          style.css                 本实验样式
          experiment.json           教学信息、状态和依赖记录
          README.md                 实验记录
          assets/                   本实验图片、音频、模型等
          data/                     本实验数据
shared/
  styles/                           公用设计变量与基础样式
  js/                               公用 JavaScript 工具
  components/                       可复用的教学组件
  assets/                           跨实验通用素材
  vendor/                           固定版本第三方类库与许可证
templates/basic/                    新实验模板
catalog/experiments.json             首页目录，由创建命令维护
scripts/                            创建、预览与检查工具
docs/                               项目与设计约定
```

相同知识点的另一种教学方案创建 `exp-002`，独立保留，不覆盖旧实验。实验不互相导入文件；稳定的复用能力再提取到 `shared/`。创建命令生成可编辑的起点，实际课件在对应实验目录中继续制作。

## 已有课件

- [七年级地理：地球自转与昼夜交替](experiments/geography/grade-7/earth-rotation/exp-001/README.md)：包含地球互动模型、五城市追踪、四个教学环节与三题反馈练习。启动本地服务后从首页进入。

## 共享类库

公共设计位于 `shared/styles/tokens.css`，通用工具位于 `shared/js/classroom.js`。第三方库按 `shared/vendor/<库名>/<版本>/` 存放，登记来源与许可证，详见 [共享资源约定](docs/shared-resources.md)。地球案例使用 Three.js 0.186.1 与 GSAP 3.15.0，提供三维光照、大气边缘和镜头过渡，同时保留二维兼容模式。其他案例按教学需要选库，不加载无关依赖。

本地预览服务仅供开发，默认监听 `127.0.0.1`。课件及目录页是静态文件，可部署到静态网站；GitHub 仓库本身不会自动发布网页。

## 实验维护

在 `experiment.json` 中填写学习目标、适用年级、课时、依赖和实验状态；在实验 README 中记录课堂反馈。案例元信息是唯一编辑来源，`catalog/experiments.json` 自动生成，请勿手工维护重复信息。

## 打包与发布

```sh
npm run build
npm run check
npm test
```

`build` 同步固定版本浏览器类库，扫描元信息，生成 `downloads/*.zip` 和 `catalog/downloads.json`，最后生成可部署的 `dist/` 静态站点。下载信息包括大小、版本和 SHA-256。无需线上打包服务。开发中修改案例后需要重新构建，保证下载包是最新内容。

每个 ZIP 只包含该案例、其 `sharedAssets` 与 `libraries` 声明的资源、许可证、独立入口及 Node.js 本地服务。解压后运行 `node scripts/serve.mjs`，无需 `npm install`，运行时无需联网。端口占用时可运行 `node scripts/serve.mjs --port 5180`。不要只移动案例子目录，也不要直接双击 HTML。

本地验证部署产物：`node scripts/serve.mjs --root dist --port 5180`。所有站内资源采用相对路径，支持子目录静态托管。项目不会自动开启 GitHub Pages。

新增案例字段参考 [案例元信息约定](docs/case-metadata.md)。平台页面位于 `platform/`，详情入口为 `case.html?id=<完整案例键>`，不同知识点的同名实验编号互不冲突。
