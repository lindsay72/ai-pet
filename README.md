# AI Desktop Pet

一个桌面宠物原型。包含拖拽、点击互动、喂食、玩耍、睡觉、洗澡、心情和能量状态。

## 桌面运行

第一次运行先安装 Electron：

```bash
npm install
```

然后启动桌面宠物：

```bash
npm start
```

桌面模式会打开一个透明、置顶、无边框的小窗口。按住宠物身体拖动可以移动它。

## Windows 运行

如果这个项目是从 macOS 拷贝过来的，请先在 Windows 上重新安装依赖，让 Electron 下载 Windows 版本：

```powershell
npm install
```

然后启动：

```powershell
npm run start:win
```

也可以运行冒烟测试：

```powershell
npm run smoke:win
```

## 浏览器预览

```bash
npm run web
```

然后打开：

```text
http://localhost:5173
```

## 下一步

- 打包成 macOS `.app`。
- 增加本地记忆和日程提醒。
- 接入语音或聊天模型，让宠物能陪聊。
