const DEFAULT_API_BASE_URL =
  process.env.ID_CARD_GENERATOR_API_URL || "https://id-generator-backend-jet.vercel.app/api";
const DEFAULT_WEB_BASE_URL =
  process.env.ID_CARD_GENERATOR_WEB_URL || "https://syedishaq.me/ID-Generator";
const DEFAULT_TEMPLATE_ID =
  process.env.ID_CARD_GENERATOR_TEMPLATE_ID || "6a20197fc3242cca3fcd19ff";

const DIGIVAL_PHOTO_DEFAULTS = {
  photoX: "0",
  photoY: "0",
  photoWidth: "300",
  photoHeight: "346",
};

const normalizeBaseUrl = (value) => String(value || "").replace(/\/$/, "");

const toAbsoluteGeneratorUrl = (pathOrUrl, apiBaseUrl) => {
  if (!pathOrUrl) return "";
  if (/^(data:|blob:|https?:\/\/)/i.test(pathOrUrl)) return pathOrUrl;

  const apiBase = normalizeBaseUrl(apiBaseUrl);
  const webOrigin = apiBase.replace(/\/api\/?$/, "");

  if (pathOrUrl.startsWith("/api/")) return `${webOrigin}${pathOrUrl}`;
  if (pathOrUrl.startsWith("/")) return `${webOrigin}${pathOrUrl}`;
  return pathOrUrl;
};

const getIntegrationConfig = (template) => {
  const idCardGenerator = template?.integration?.idCardGenerator || {};

  return {
    enabled: Boolean(idCardGenerator.enabled),
    templateId: String(idCardGenerator.templateId || DEFAULT_TEMPLATE_ID).trim(),
    apiBaseUrl: normalizeBaseUrl(idCardGenerator.apiBaseUrl || DEFAULT_API_BASE_URL),
    webBaseUrl: normalizeBaseUrl(idCardGenerator.webBaseUrl || DEFAULT_WEB_BASE_URL),
    source: String(idCardGenerator.source || "google-form").trim(),
    qrData: String(idCardGenerator.qrData || "STATIC_DIGIVAL_QR").trim(),
    fieldMap: {
      name: "name",
      email: "email",
      photo: "photo",
      employeeId: "employeeId",
      bloodGroup: "bloodGroup",
      phone: "phone",
      ...(idCardGenerator.fieldMap || {}),
    },
  };
};

const answerMapFromArray = (answers = []) =>
  answers.reduce((map, answer) => {
    if (answer?.fieldName) {
      map.set(answer.fieldName, answer.value);
    }
    return map;
  }, new Map());

const normalizePrimitiveValue = (value) => {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return "";
  return String(value).trim();
};

const readAnswer = (map, key) => normalizePrimitiveValue(map.get(key));

const parseDataUrl = (dataUrl) => {
  const match = String(dataUrl || "").match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) return null;

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
};

const uploadPhoto = async ({ value, apiBaseUrl }) => {
  if (!value) return { imageUrl: "", storedValue: value };

  if (typeof value === "string") {
    if (!value.startsWith("data:")) {
      return {
        imageUrl: toAbsoluteGeneratorUrl(value, apiBaseUrl),
        storedValue: value,
      };
    }
  }

  const dataUrl = typeof value === "string" ? value : value.dataUrl;
  const parsed = parseDataUrl(dataUrl);

  if (!parsed) {
    return {
      imageUrl: "",
      storedValue:
        typeof value === "object"
          ? {
              fileName: value.fileName || value.name || "uploaded-file",
              fileType: value.fileType || value.type || "",
              fileSize: value.fileSize || value.size || 0,
            }
          : value,
    };
  }

  if (typeof FormData === "undefined" || typeof Blob === "undefined") {
    return {
      imageUrl: dataUrl,
      storedValue: {
        fileName: value.fileName || "uploaded-photo",
        fileType: parsed.mimeType,
        fileSize: parsed.buffer.length,
        imageUrl: dataUrl,
      },
    };
  }

  const formData = new FormData();
  const fileName = value.fileName || value.name || "id-card-photo.png";
  const blob = new Blob([parsed.buffer], { type: parsed.mimeType });

  formData.append("photo", blob, fileName);

  const response = await fetch(`${apiBaseUrl}/uploads/photo`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Image upload failed with status ${response.status}`);
  }

  const payload = await response.json();
  const rawImageUrl = payload.imageUrl || payload.file?.imageUrl || "";
  const imageUrl = toAbsoluteGeneratorUrl(rawImageUrl, apiBaseUrl);

  return {
    imageUrl,
    storedValue: {
      fileName,
      fileType: parsed.mimeType,
      fileSize: parsed.buffer.length,
      imageUrl,
    },
  };
};

const getTemplateSnapshot = async (config) => {
  const response = await fetch(`${config.apiBaseUrl}/templates/${config.templateId}`);

  if (!response.ok) {
    throw new Error(`ID-card template lookup failed with status ${response.status}`);
  }

  return response.json();
};

const applyTemplateDefaults = (templateSnapshot, formData) => {
  const withDefaults = { ...formData };

  (templateSnapshot?.fields || []).forEach((field) => {
    if (withDefaults[field.key] === undefined || withDefaults[field.key] === "") {
      withDefaults[field.key] = field.defaultValue || "";
    }
  });

  return withDefaults;
};

const buildGeneratedCardUrl = (webBaseUrl, templateId, cardId) =>
  `${normalizeBaseUrl(webBaseUrl)}/generate/${templateId}?cardId=${cardId}`;

const createCard = async ({ config, payload }) => {
  const response = await fetch(`${config.apiBaseUrl}/cards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `ID card creation failed with status ${response.status}`);
  }

  return response.json();
};

exports.isIdCardIntegrationEnabled = (template) => getIntegrationConfig(template).enabled;

exports.createIdCardFromSurvey = async ({ template, responseId, answers }) => {
  const config = getIntegrationConfig(template);

  if (!config.enabled) {
    return {
      status: "none",
      storedAnswers: answers,
      idCard: {},
    };
  }

  const answersByField = answerMapFromArray(answers);
  const fieldMap = config.fieldMap;
  const rawPhotoValue = answersByField.get(fieldMap.photo);
  const uploadedPhoto = await uploadPhoto({ value: rawPhotoValue, apiBaseUrl: config.apiBaseUrl });
  const templateSnapshot = await getTemplateSnapshot(config);

  const formData = applyTemplateDefaults(templateSnapshot, {
    ...DIGIVAL_PHOTO_DEFAULTS,
    name: readAnswer(answersByField, fieldMap.name),
    email: readAnswer(answersByField, fieldMap.email),
    employeeId: readAnswer(answersByField, fieldMap.employeeId),
    bloodGroup: readAnswer(answersByField, fieldMap.bloodGroup),
    phone: readAnswer(answersByField, fieldMap.phone),
    photo: uploadedPhoto.imageUrl,
  });

  const payload = {
    templateId: config.templateId,
    formData,
    photo: uploadedPhoto.imageUrl,
    logo: "",
    qrData: templateSnapshot?.layoutKey === "digival" ? "STATIC_DIGIVAL_QR" : config.qrData,
    templateSnapshot,
    recipientEmail: formData.email || "",
    source: config.source,
    googleSubmissionId: String(responseId),
  };

  const createdCard = await createCard({ config, payload });
  const cardId = createdCard?._id || createdCard?.data?._id;
  const generatedCardUrl = cardId
    ? buildGeneratedCardUrl(config.webBaseUrl, config.templateId, cardId)
    : "";

  const storedAnswers = answers.map((answer) => {
    if (answer.fieldName !== fieldMap.photo) return answer;

    return {
      ...answer,
      value: uploadedPhoto.storedValue,
    };
  });

  return {
    status: "completed",
    storedAnswers,
    idCard: {
      generatorTemplateId: config.templateId,
      generatedCardId: cardId || "",
      generatedCardUrl,
      cardsUrl: `${config.webBaseUrl}/cards`,
      photoUrl: uploadedPhoto.imageUrl,
      emailStatus: createdCard?.emailStatus || createdCard?.data?.emailStatus || "",
    },
  };
};
