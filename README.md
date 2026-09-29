# HTML 互动课件实验台

用于探索不同学科、年级、知识点的沉浸式互动课件。每次实验独立存放，可采用原生 JavaScript 或按需引入类库。共享层只收纳可跨实验复用的内容。

## 开始使用

需要 Node.js 20 或更新版本，无需安装依赖。

```sh
npm run dev
```

打开 http://localhost:5173 查看实验目录。通过 HTTP 访问课件，不要直接双击 HTML 文件；ES Modules 和数据请求需要本地服务。

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

公共设计位于 `shared/styles/tokens.css`，通用工具位于 `shared/js/classroom.js`。第三方库按 `shared/vendor/<库名>/<版本>/` 存放，登记来源与许可证，详见 [共享资源约定](docs/shared-resources.md)。暂不预装地图、图表或 3D 类库，避免每个实验承担无关依赖。

本地预览服务仅供开发，默认监听 `127.0.0.1`。课件及目录页是静态文件，可部署到静态网站；GitHub 仓库本身不会自动发布网页。

## 实验维护

在 `experiment.json` 中填写学习目标、适用年级、课时、依赖和实验状态；在实验 README 中记录课堂反馈。修改实验标题时同步更新 `catalog/experiments.json`。`npm run check` 检查目录记录、入口文件与实验信息是否一致。
