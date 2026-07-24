"use strict";

(() => {
  const DATA_URL = "data/prospects.json";

  const QUEBEC_REGIONS = [
    "01 · Bas-Saint-Laurent",
    "02 · Saguenay–Lac-Saint-Jean",
    "03 · Capitale-Nationale",
    "04 · Mauricie",
    "05 · Estrie",
    "06 · Montréal",
    "07 · Outaouais",
    "08 · Abitibi-Témiscamingue",
    "09 · Côte-Nord",
    "10 · Nord-du-Québec",
    "11 · Gaspésie–Îles-de-la-Madeleine",
    "12 · Chaudière-Appalaches",
    "13 · Laval",
    "14 · Lanaudière",
    "15 · Laurentides",
    "16 · Montérégie",
    "17 · Centre-du-Québec",
  ];

  const CATEGORY_LABELS = {
    C01: "综合机械维修",
    C02: "轮胎销售与服务",
    C03: "钣金与碰撞维修",
    C04: "经销商售后",
    C05: "快保与检测",
    C06: "重型车辆维修",
    C07: "私营车队维修基地",
    C08: "市政及公共车队",
    C09: "培训机构",
    C10: "专项机械服务",
  };

  const EQUIPMENT_LABELS = {
    lift: "举升机",
    tire_changer: "扒胎机",
    balancer: "平衡机",
  };

  const FIT_LABELS = ["不适用", "极低", "偶发", "合理", "强", "核心"];

  const elements = {
    form: document.querySelector("#filter-form"),
    search: document.querySelector("#search-input"),
    region: document.querySelector("#region-filter"),
    category: document.querySelector("#category-filter"),
    equipment: document.querySelector("#equipment-filter"),
    reset: document.querySelector("#reset-filters"),
    resultSummary: document.querySelector("#result-summary"),
    statSites: document.querySelector("#stat-sites"),
    statSitesContext: document.querySelector("#stat-sites-context"),
    statMailable: document.querySelector("#stat-mailable"),
    statContactable: document.querySelector("#stat-contactable"),
    statHighFit: document.querySelector("#stat-high-fit"),
    loadError: document.querySelector("#load-error"),
    emptyState: document.querySelector("#empty-state"),
    emptyTitle: document.querySelector("#empty-title"),
    emptyCopy: document.querySelector("#empty-copy"),
    tableView: document.querySelector("#table-view"),
    tableBody: document.querySelector("#prospects-body"),
    cardView: document.querySelector("#card-view"),
    dataFootnote: document.querySelector("#data-footnote"),
  };

  const state = {
    prospects: [],
    filtered: [],
    loadFailed: false,
  };

  function text(value, fallback = "—") {
    if (value === null || value === undefined) return fallback;
    const normalized = String(value).trim();
    return normalized || fallback;
  }

  function toSearchText(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("fr-CA");
  }

  function fitScore(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.max(0, Math.min(5, Math.round(value)));
    }

    const normalized = toSearchText(value).replace(/[\s_-]+/g, "");
    if (["5", "core", "essential", "coeur"].includes(normalized)) return 5;
    if (["4", "high", "veryhigh", "eleve", "tresfort", "haut"].includes(normalized)) return 4;
    if (["3", "medium", "moderate", "moyen", "moyenne", "reasonable"].includes(normalized)) {
      return 3;
    }
    if (["2", "occasional", "indirect"].includes(normalized)) return 2;
    if (["1", "low", "faible", "bas"].includes(normalized)) return 1;
    return 0;
  }

  function normalizeRegion(value) {
    const raw = text(value, "");
    if (!raw) return "";

    const rawSearch = toSearchText(raw).replace(/^\d{1,2}\s*[·.\-–—:]?\s*/, "");
    const match = QUEBEC_REGIONS.find((region) => {
      const regionName = region.replace(/^\d{2}\s*·\s*/, "");
      return toSearchText(regionName) === rawSearch;
    });
    return match || raw;
  }

  function normalizeRecord(record, index) {
    const mailing = record.mailing || record.address || {};
    const contact = record.contact_public || {};
    const verification = record.verification || {};
    const equipment = record.equipment_fit || record.equipment || {};
    const services = Array.isArray(record.service_tags)
      ? record.service_tags.filter(Boolean).map(String)
      : Array.isArray(record.services)
        ? record.services.filter(Boolean).map(String)
        : [];

    const normalized = {
      id: text(record.site_id || record.id, `prospect-${index + 1}`),
      name: text(record.business_name || record.site_name || record.name, "未命名站点"),
      legalName: text(record.legal_name, ""),
      chainBrand: text(record.chain_brand || record.brand, ""),
      city: text(record.municipality || record.city || mailing.municipality || mailing.city, ""),
      region: normalizeRegion(record.admin_region || record.region || mailing.admin_region),
      postalCode: text(record.postal_code || mailing.postal_code, ""),
      addressLine1: text(record.address_line1 || mailing.address_line1 || mailing.street, ""),
      addressLine2: text(record.address_line2 || mailing.address_line2 || mailing.unit, ""),
      mailVerified: Boolean(
        record.mail_deliverable === true ||
          record.mail_deliverable_status === "verified" ||
          ["A2", "A3", "A4"].includes(
            text(record.mailability_level || mailing.mailability_level, "").slice(0, 2),
          ) ||
          mailing.verified === true ||
          mailing.deliverable_status === "verified",
      ),
      category: text(record.primary_category || record.category, "C10"),
      primaryBusiness: text(record.primary_business || record.business_nature, ""),
      services,
      lift: fitScore(equipment.lift ?? record.lift_fit_score ?? record.lift_fit),
      tireChanger: fitScore(
        equipment.tire_changer ?? record.tire_changer_fit_score ?? record.tire_changer_fit,
      ),
      balancer: fitScore(
        equipment.balancer ?? record.wheel_balancer_fit_score ?? record.balancer_fit,
      ),
      priority: Number(record.sales_priority_score || record.priority_score || 0) || 0,
      recipientRoleAvailable: Boolean(contact.recipient_role_available),
      hasBusinessEmail: Boolean(contact.has_business_email),
      hasBusinessMobile: Boolean(contact.has_business_mobile),
      phone: text(contact.main_phone || record.public_main_phone, ""),
      website: text(contact.website || record.website, ""),
      verificationStatus: text(
        verification.status || record.verification_status || record.evidence_status,
        "pending",
      ).toLocaleLowerCase("en-CA"),
      verifiedAt: text(verification.last_verified_at || record.last_verified_at, ""),
      sourceSummary: text(record.source_summary || verification.source_summary, ""),
    };

    normalized.searchIndex = toSearchText(
      [
        normalized.name,
        normalized.legalName,
        normalized.chainBrand,
        normalized.city,
        normalized.region,
        normalized.postalCode,
        normalized.category,
        normalized.primaryBusiness,
        normalized.services.join(" "),
      ].join(" "),
    );

    return normalized;
  }

  function createOption(value, label = value) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    return option;
  }

  function populateFilters() {
    const regions = new Set(QUEBEC_REGIONS);
    const categories = new Set(Object.keys(CATEGORY_LABELS));

    state.prospects.forEach((prospect) => {
      if (prospect.region) regions.add(prospect.region);
      if (prospect.category) categories.add(prospect.category);
    });

    [...regions]
      .sort((a, b) => a.localeCompare(b, "fr-CA", { numeric: true }))
      .forEach((region) => elements.region.append(createOption(region)));

    [...categories]
      .sort((a, b) =>
        (CATEGORY_LABELS[a] || a).localeCompare(CATEGORY_LABELS[b] || b, "zh-Hans"),
      )
      .forEach((category) => {
        elements.category.append(createOption(category, CATEGORY_LABELS[category] || category));
      });
  }

  function categoryLabel(category) {
    return CATEGORY_LABELS[category] || text(category);
  }

  function statusLabel(status) {
    const labels = {
      verified: "已核验",
      pending: "待核验",
      partial: "部分核验",
      stale: "需更新",
      rejected: "不采用",
    };
    return labels[status] || text(status);
  }

  function statusClass(status) {
    if (status === "verified") return "status-verified";
    if (status === "stale" || status === "rejected") return `status-${status}`;
    return "status-pending";
  }

  function safeWebsite(value) {
    const raw = text(value, "");
    if (!raw) return "";

    try {
      const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }

  function safeEmail(value) {
    const email = text(value, "");
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
  }

  function el(tagName, options = {}) {
    const node = document.createElement(tagName);
    if (options.className) node.className = options.className;
    if (options.text !== undefined) node.textContent = options.text;
    if (options.href) node.href = options.href;
    if (options.target) node.target = options.target;
    if (options.rel) node.rel = options.rel;
    if (options.title) node.title = options.title;
    return node;
  }

  function addTextLine(parent, value, className = "cell-line") {
    if (!value) return;
    parent.append(el("span", { className, text: value }));
  }

  function createTags(values, includeCategory = false) {
    const container = el("div", { className: "tag-list" });
    values.filter(Boolean).slice(0, 4).forEach((value, index) => {
      container.append(
        el("span", {
          className: `tag${includeCategory && index === 0 ? " category-tag" : ""}`,
          text: value,
        }),
      );
    });
    return container;
  }

  function createFitList(prospect) {
    const container = el("div", { className: "fit-list" });
    const values = {
      lift: prospect.lift,
      tire_changer: prospect.tireChanger,
      balancer: prospect.balancer,
    };

    Object.entries(values).forEach(([key, score]) => {
      const row = el("div", { className: `fit-row fit-level-${score}` });
      row.append(el("span", { text: EQUIPMENT_LABELS[key] }));
      const track = el("span", { className: "fit-track" });
      track.append(el("span", { className: "fit-fill" }));
      row.append(track);
      row.append(el("span", { text: FIT_LABELS[score] }));
      container.append(row);
    });
    return container;
  }

  function createContactContent(prospect) {
    const container = document.createDocumentFragment();

    if (prospect.phone) {
      const telephone = prospect.phone.replace(/[^\d+]/g, "");
      const phoneLink = el("a", {
        className: "cell-line cell-link",
        text: prospect.phone,
        href: telephone ? `tel:${telephone}` : undefined,
      });
      container.append(phoneLink);
    }

    const website = safeWebsite(prospect.website);
    if (website) {
      container.append(
        el("a", {
          className: "cell-line cell-link",
          text: "企业网站",
          href: website,
          target: "_blank",
          rel: "noopener noreferrer",
        }),
      );
    }

    const availability = [
      prospect.hasBusinessEmail ? "有企业邮箱" : "",
      prospect.hasBusinessMobile ? "有企业手机" : "",
      prospect.recipientRoleAvailable ? "有收件职务" : "",
    ].filter(Boolean);
    if (availability.length) {
      container.append(el("span", { className: "cell-meta", text: availability.join(" · ") }));
    }

    if (!availability.length && !prospect.phone && !website) {
      container.append(el("span", { className: "cell-meta", text: "暂无联络入口" }));
    }
    return container;
  }

  function createTableRow(prospect) {
    const row = document.createElement("tr");

    const identity = document.createElement("td");
    identity.append(el("span", { className: "cell-title", text: prospect.name }));
    addTextLine(identity, prospect.chainBrand || prospect.legalName, "cell-meta");
    addTextLine(identity, `ID · ${prospect.id}`, "cell-meta");
    row.append(identity);

    const location = document.createElement("td");
    addTextLine(location, [prospect.city, prospect.region].filter(Boolean).join(" · "), "cell-title");
    addTextLine(
      location,
      [prospect.addressLine1, prospect.addressLine2].filter(Boolean).join(", "),
    );
    addTextLine(location, prospect.postalCode);
    if (prospect.mailVerified) {
      location.append(el("span", { className: "status-badge status-verified", text: "邮寄已核验" }));
    }
    row.append(location);

    const business = document.createElement("td");
    business.append(
      createTags(
        [categoryLabel(prospect.category), prospect.primaryBusiness, ...prospect.services],
        true,
      ),
    );
    row.append(business);

    const fit = document.createElement("td");
    fit.append(createFitList(prospect));
    row.append(fit);

    const contact = document.createElement("td");
    contact.append(createContactContent(prospect));
    row.append(contact);

    const verification = document.createElement("td");
    verification.append(
      el("span", {
        className: `status-badge ${statusClass(prospect.verificationStatus)}`,
        text: statusLabel(prospect.verificationStatus),
      }),
    );
    addTextLine(verification, prospect.verifiedAt, "cell-meta");
    row.append(verification);

    return row;
  }

  function createProspectCard(prospect) {
    const card = el("article", { className: "prospect-card" });

    const top = el("div", { className: "prospect-card-top" });
    const identity = document.createElement("div");
    identity.append(el("span", { className: "cell-title", text: prospect.name }));
    addTextLine(identity, [prospect.city, prospect.region].filter(Boolean).join(" · "), "cell-meta");
    top.append(identity);
    top.append(
      el("span", {
        className: `status-badge ${statusClass(prospect.verificationStatus)}`,
        text: statusLabel(prospect.verificationStatus),
      }),
    );
    card.append(top);

    card.append(
      createTags(
        [categoryLabel(prospect.category), prospect.primaryBusiness, ...prospect.services],
        true,
      ),
    );

    const details = el("div", { className: "prospect-card-section" });
    const fit = document.createElement("div");
    fit.append(el("span", { className: "card-label", text: "设备适配" }));
    fit.append(createFitList(prospect));
    details.append(fit);

    const contact = document.createElement("div");
    contact.append(el("span", { className: "card-label", text: "联络入口" }));
    contact.append(createContactContent(prospect));
    details.append(contact);
    card.append(details);

    return card;
  }

  function matchesEquipment(prospect, equipment) {
    if (!equipment) return true;
    const scoreByEquipment = {
      lift: prospect.lift,
      tire_changer: prospect.tireChanger,
      balancer: prospect.balancer,
    };
    return (scoreByEquipment[equipment] || 0) >= 3;
  }

  function filterProspects() {
    const query = toSearchText(elements.search.value);
    const selectedRegion = elements.region.value;
    const selectedCategory = elements.category.value;
    const selectedEquipment = elements.equipment.value;

    state.filtered = state.prospects
      .filter((prospect) => {
        const matchesQuery = !query || prospect.searchIndex.includes(query);
        const matchesRegion = !selectedRegion || prospect.region === selectedRegion;
        const matchesCategory = !selectedCategory || prospect.category === selectedCategory;
        return (
          matchesQuery &&
          matchesRegion &&
          matchesCategory &&
          matchesEquipment(prospect, selectedEquipment)
        );
      })
      .sort(
        (a, b) =>
          b.priority - a.priority ||
          a.name.localeCompare(b.name, "fr-CA", { sensitivity: "base" }),
      );

    render();
  }

  function hasContactEntry(prospect) {
    return Boolean(
      prospect.hasBusinessEmail ||
        prospect.hasBusinessMobile ||
        text(prospect.phone, "") ||
        safeWebsite(prospect.website),
    );
  }

  function renderStats() {
    const displayed = state.filtered;
    const mailables = displayed.filter((prospect) => prospect.mailVerified).length;
    const contactable = displayed.filter(hasContactEntry).length;
    const highFit = displayed.filter(
      (prospect) => Math.max(prospect.lift, prospect.tireChanger, prospect.balancer) >= 4,
    ).length;

    elements.statSites.textContent = displayed.length.toLocaleString("fr-CA");
    elements.statMailable.textContent = mailables.toLocaleString("fr-CA");
    elements.statContactable.textContent = contactable.toLocaleString("fr-CA");
    elements.statHighFit.textContent = highFit.toLocaleString("fr-CA");
    elements.statSitesContext.textContent = state.prospects.length
      ? `全库 ${state.prospects.length.toLocaleString("fr-CA")} 个站点`
      : "尚未导入资料";
  }

  function renderEmptyState() {
    const hasData = state.prospects.length > 0;
    const hasResults = state.filtered.length > 0;

    elements.emptyState.hidden = hasResults;
    elements.tableView.hidden = !hasResults;
    elements.cardView.hidden = !hasResults;

    if (!hasResults) {
      if (state.loadFailed) {
        elements.emptyTitle.textContent = "无法显示资料";
        elements.emptyCopy.textContent =
          "修复 JSON 路径或格式后重新载入页面。此错误不会改动任何原始资料。";
      } else if (hasData) {
        elements.emptyTitle.textContent = "没有符合当前条件的站点";
        elements.emptyCopy.textContent =
          "尝试清除一个或多个筛选条件，或使用城市、邮编和主营业务中的关键词搜索。";
      } else {
        elements.emptyTitle.textContent = "资料库尚未导入任何潜在客户";
        elements.emptyCopy.textContent =
          "当前 JSON 为安全的空资料。完成来源核验后，可按 README 的字段结构导入脱敏记录；完整联系人请勿提交到公开仓库。";
      }
    }
  }

  function renderRows() {
    elements.tableBody.replaceChildren();
    elements.cardView.replaceChildren();

    const tableFragment = document.createDocumentFragment();
    const cardFragment = document.createDocumentFragment();
    state.filtered.forEach((prospect) => {
      tableFragment.append(createTableRow(prospect));
      cardFragment.append(createProspectCard(prospect));
    });
    elements.tableBody.append(tableFragment);
    elements.cardView.append(cardFragment);
  }

  function render() {
    renderStats();
    renderRows();
    renderEmptyState();

    elements.resultSummary.textContent = state.loadFailed
      ? "资料读取失败"
      : `显示 ${state.filtered.length.toLocaleString("fr-CA")} / ${state.prospects.length.toLocaleString("fr-CA")} 个站点`;
  }

  async function loadProspects() {
    try {
      const response = await fetch(DATA_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const raw = await response.json();
      if (!Array.isArray(raw)) throw new TypeError("prospects.json must contain a JSON array");

      state.prospects = raw.map(normalizeRecord);
      state.loadFailed = false;
      populateFilters();
      elements.dataFootnote.textContent = `资料状态：已读取 ${state.prospects.length.toLocaleString("fr-CA")} 条站点记录`;
      filterProspects();
    } catch (error) {
      state.loadFailed = true;
      state.prospects = [];
      state.filtered = [];
      elements.loadError.hidden = false;
      elements.dataFootnote.textContent = "资料状态：读取失败";
      render();
      console.error("Unable to load prospect data:", error);
    }
  }

  elements.form.addEventListener("input", filterProspects);
  elements.form.addEventListener("change", filterProspects);
  elements.form.addEventListener("reset", () => {
    window.requestAnimationFrame(filterProspects);
  });

  loadProspects();
})();
