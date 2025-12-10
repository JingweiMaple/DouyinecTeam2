

## 项目结构

```
monorepo-demo/
├── apps/
│   ├── backend/
│   └── frontend/
│       ├── dashboard/
│       └── home/
├── packages/
│   ├── cli/
│   └── tools/
│   └── ui/
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── README.md
```

- **apps/**: 包含业务逻辑代码。
  - **backend/**: 后端服务代码。
  - **frontend/**: 前端应用代码。
    - **dashboard/**: 示例应用，展示如何集成 `packages/ui` 库。
    - **home/**: 另一个前端应用。
- **packages/**: 包含所有共享库。
  - **cli/**: 管理 `monorepo` 的脚本。
  - **tools/**: 项目中的一些通用工具函数。
  - **ui/**: UI 组件库。

## 快速开始

- 全局安装 **pnpm**
    ```bash
    npm i pnpm -g
    ```
- 全局安装 **turbo**
    ```sh
    npm install -g turbo
    ```
- 在根目录运行 `pnpm i` 安装所有依赖
- 根目录下运行 `pnpm dev` 启动示例应用和热更新。



