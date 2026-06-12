# Android APK 打包和安装测试

CloudAsset Android 客户端基于 Expo，推荐用 EAS 云构建生成 APK，最省心，也最适合 Windows 环境。

## 1. 准备账号

1. 注册或登录 Expo 账号：https://expo.dev
2. 在本地登录：

```bash
cd packages/android
pnpm exec eas login
```

如果 PowerShell 无法识别 `pnpm exec eas`，可直接运行：

```powershell
.\node_modules\.bin\eas.CMD login
```

## 2. 检查配置

应用配置位于：

```text
packages/android/app.json
packages/android/eas.json
```

当前包名：

```text
com.cloudasset.app
```

preview profile 会生成可直接安装测试的 APK。

## 3. 类型检查

```bash
pnpm android:typecheck
```

通过后再打包。

## 4. 云端构建 APK

```bash
pnpm android:build:eas
```

等构建完成后，EAS 会在终端输出 APK 下载链接。下载到手机后安装即可。

## 5. GitHub Actions 构建 APK

仓库包含 workflow：

```text
.github/workflows/android-eas.yml
```

使用步骤：

1. 在 Expo 创建 Access Token。
2. 到 GitHub 仓库设置 `Settings -> Secrets and variables -> Actions`。
3. 新增 secret：

```text
EXPO_TOKEN=<你的 Expo token>
```

4. 打开 Actions，手动运行 `Build Android APK`。

## 6. 本地构建 APK

本地构建需要 Android SDK、Gradle、JDK 和 EAS 本地构建环境：

```bash
pnpm android:build:apk
```

Windows 上如果没有 `ANDROID_HOME`，本地构建会失败。此时请使用 EAS 云构建。

## 7. 安装测试

手机安装 APK 后：

1. 打开 CloudAsset。
2. 服务器地址填写 `https://asset.example.com`。
3. API Key 填服务端 `.env` 中的值。
4. 测试列表、搜索、上传、图片预览、分享。

## 8. 常见问题

| 问题 | 处理 |
|---|---|
| 构建提示未登录 | 执行 `eas login` |
| GitHub Actions 构建失败 | 检查 `EXPO_TOKEN` |
| 手机无法连接服务器 | 检查 HTTPS、域名、防火墙、API Key |
| 图片不显示 | 确认服务端 `/api/assets/:id/content` 能通过 API Key 访问 |
| 本地 APK 构建失败 | 优先改用 EAS 云构建 |
