# 功夫预编译二进制文件发布管理

## 目标 - Requirements

做为一个跨平台项目，功夫有很多组件涉及平台相关的二进制文件，需要针对每个操作系统单独编译及发布。随着项目复杂度增加，编译时间可能会增长到数分钟甚至数十分钟。在使用这些组件作为依赖时，如果可以直接下载预先编译好的二进制文件，就可以避免在本地配置编译环境以及超长编译时间带来的麻烦。具体而言，一个完善的预编译二进制文件的发布管理流程有以下几个目标：

- 文件信息包含版本及操作系统信息，使得用户根据使用环境可以精确定位具体的下载路径。

- 预编译文件的发布应配合[功夫版本控制流程](https://github.com/kungfu-trader/action-bump-version)，当且仅当对应版本完成发布流程时才会同时发布相应的预编译文件。发布的预编译文件应和对应版本的代码严格一一对应。

- 预编译文件的下载应考虑 CI 服务器和开发者的桌面环境，针对机器所在位置（中国境内或海外）做出适配，以避免网络问题导致无法下载。

## 规则 - Rules

出于以上需求，我们结合使用 GitHub Actions、AWS 国际和中国区的服务器为预编译文件提供上传及下载服务。在执行编译环节的 GitHub Actions 运行期间，需要将各操作系统环境下产生的二进制文件通过 GitHub 的[上传 Artifacts 功能](https://github.com/actions/upload-artifact)上传到 GitHub 的文件中转区。编译结束后，在调用本 action 之前，需要通过 GitHub 的[下载 Artifacts 功能](https://github.com/actions/download-artifact)下载到 Action Runner 的本地，并通过 github-artifacts 参数设定具体的路径。

为配合[功夫版本控制流程](https://github.com/kungfu-trader/action-bump-version)，需支持将预编译文件上传到待发布状态的缓存区，待相关 Pull Request 审核通过之后才正式发布到公共下载区。

## 用法 - Usage in GitHub Workflow YML

### 输入参数 - Inputs

- aws-proxy 如需使用针对海内外的专有网络加速服务，可通过此参数设置相关服务，需符合 hosts 文件格式。相关设置会写入到 /etc/hosts。使用此参数时需要同时使用具备对 /etc/hosts 文件有写入权限的 docker 镜像。

- artifacts-path 在编译相关的 GitHub Action 中上传的文件所对应的路径，必填参数

- bucket-prebuilt-staging

- bucket-prebuilt

- bucket-app-staging

- bucket-app

### 输出参数 - Outputs

无