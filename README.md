# Atelier Québec · 潜在客户审阅台

这是一个无外部依赖、可直接放到 GitHub Pages 的纯静态站点骨架。它从
`data/prospects.json` 读取站点级潜在客户，支持：

- 店名、城市、邮编、业务和收件人角色全文搜索；
- 魁北克行政区、主营业务与设备适配度筛选；
- 邮寄地址核验、企业联络入口和高适配站点统计；
- 桌面表格与移动端卡片视图；
- 空资料、无匹配结果和读取错误三种状态。

当前 `data/prospects.json` 是空数组，不包含任何真实企业或个人信息。

## 本地预览

浏览器直接打开 `index.html` 时，部分浏览器会阻止读取 JSON。请在本目录启动任意静态网页服务器，例如：

```powershell
python -m http.server 8000
```

然后打开 `http://localhost:8000/`。

## GitHub Pages

把本目录内容放在仓库发布分支的根目录，再在仓库 Settings → Pages 中选择从该分支发布。
`.nojekyll` 会让 GitHub Pages 原样提供静态文件。

重要：GitHub Pages 页面及其 `data/prospects.json` 可以被访问者直接下载。若页面公开，仓库中只能放脱敏、允许发布的资料。完整收件人姓名、邮箱、企业手机/短信号码、直线电话、联络依据、拒绝联系记录等，应保存在有访问控制的 Excel、CRM、私有数据库或其他受控系统中。界面遮挡字段不构成安全保护。

## JSON 数据结构

根节点必须是数组。下面是字段示例，不代表真实商家：

```json
[
  {
    "site_id": "QC-DEMO-0001",
    "business_name": "示例维修站",
    "legal_name": "示例企业名称",
    "chain_brand": "",
    "municipality": "示例城市",
    "admin_region": "06 · Montréal",
    "primary_category": "C01",
    "primary_business": "综合机械维修",
    "service_tags": ["轮胎服务", "四轮定位"],
    "mailing": {
      "address_line1": "100 rue Exemple",
      "address_line2": "",
      "postal_code": "H0H 0H0",
      "mailability_level": "A2"
    },
    "equipment_fit": {
      "lift": 5,
      "tire_changer": 3,
      "balancer": 3
    },
    "sales_priority_score": 75,
    "contact_public": {
      "main_phone": "",
      "website": "",
      "has_business_email": true,
      "has_business_mobile": false,
      "recipient_role_available": true
    },
    "verification": {
      "status": "pending",
      "last_verified_at": "",
      "source_summary": ""
    }
  }
]
```

设备适配分值：

- `0`：不适用；
- `1`：极低可能；
- `2`：偶发或间接需求；
- `3`：合理潜在需求；
- `4`：强需求；
- `5`：主营核心设备。

`primary_category` 支持：

- `C01`：综合机械维修；
- `C02`：轮胎销售与服务；
- `C03`：钣金与碰撞维修；
- `C04`：经销商售后；
- `C05`：快保与检测；
- `C06`：重型车辆维修；
- `C07`：私营车队维修基地；
- `C08`：市政及公共车队；
- `C09`：培训机构；
- `C10`：专项机械服务。

正式潜客的商业地址必须至少达到 `A2`：企业来源与另一独立来源一致。邮箱或企业手机存在时，内部库必须同时保存公开联系人姓名或职务及来源；公开 JSON 只保存 `has_business_email`、`has_business_mobile` 和 `recipient_role_available` 布尔值，不保存实际邮箱、企业手机或姓名。

## 建议的数据边界

- 公开 Pages 数据：企业名称、可公开商业地址、主营业务、企业总机、网站、汇总适配度及“有无企业邮箱/企业手机”的布尔状态。
- 受控内部数据：具体收件人、邮箱、企业手机、来源与采集日期、联系依据、邮寄核验详情、沟通记录和拒绝联系状态。
- 无可靠姓名时，收件人优先使用职位，例如 `À l’attention du directeur du service`，不要猜测姓名或邮箱格式。

## 快速校验

```powershell
node --check assets/app.js
```
