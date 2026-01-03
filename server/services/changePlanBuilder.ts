import { FileChange } from "./empathyExecutor";
import { logger } from "../utils/logger";

export interface Recommendation {
  id: string;
  type: string;
  title?: string;
  description?: string;
  priority?: number;
  data?: Record<string, unknown>;
}

export interface ChangePlan {
  recommendationId: string;
  recommendationType: string;
  changes: FileChange[];
  confidence: "high" | "medium" | "low";
  notes?: string;
}

type ChangeBuilder = (rec: Recommendation) => FileChange[];

const changeBuilders: Record<string, ChangeBuilder> = {
  TITLE_TAG_UPDATE: (rec) => {
    const data = rec.data as { oldTitle?: string; newTitle?: string; file?: string } | undefined;
    if (!data?.oldTitle || !data?.newTitle) {
      return [];
    }
    return [{
      file: data.file || "templates/base.html",
      operation: "replace",
      find: `<title>${data.oldTitle}</title>`,
      replace_with: `<title>${data.newTitle}</title>`,
    }];
  },

  META_DESCRIPTION_UPDATE: (rec) => {
    const data = rec.data as { oldDescription?: string; newDescription?: string; file?: string } | undefined;
    if (!data?.newDescription) {
      return [];
    }
    
    if (data.oldDescription) {
      return [{
        file: data.file || "templates/base.html",
        operation: "replace",
        find: `<meta name="description" content="${data.oldDescription}"`,
        replace_with: `<meta name="description" content="${data.newDescription}"`,
      }];
    }
    
    return [{
      file: data.file || "templates/base.html",
      operation: "insert_after",
      find: "<title>",
      replace_with: `\n  <meta name="description" content="${data.newDescription}">`,
    }];
  },

  CANONICAL_TAG_UPDATE: (rec) => {
    const data = rec.data as { oldCanonical?: string; newCanonical?: string; file?: string } | undefined;
    if (!data?.newCanonical) {
      return [];
    }
    
    if (data.oldCanonical) {
      return [{
        file: data.file || "templates/base.html",
        operation: "replace",
        find: `<link rel="canonical" href="${data.oldCanonical}"`,
        replace_with: `<link rel="canonical" href="${data.newCanonical}"`,
      }];
    }
    
    return [{
      file: data.file || "templates/base.html",
      operation: "insert_after",
      find: "</title>",
      replace_with: `\n  <link rel="canonical" href="${data.newCanonical}">`,
    }];
  },

  ROBOTS_TXT_UPDATE: (rec) => {
    const data = rec.data as { content?: string } | undefined;
    if (!data?.content) {
      return [];
    }
    return [{
      file: "robots.txt",
      operation: "overwrite",
      content: data.content,
    }];
  },

  SITEMAP_UPDATE: (rec) => {
    const data = rec.data as { content?: string } | undefined;
    if (!data?.content) {
      return [];
    }
    return [{
      file: "sitemap.xml",
      operation: "overwrite",
      content: data.content,
    }];
  },

  ALT_TEXT_UPDATE: (rec) => {
    const data = rec.data as { imageUrl?: string; oldAlt?: string; newAlt?: string; file?: string } | undefined;
    if (!data?.imageUrl || !data?.newAlt) {
      return [];
    }
    
    const imgPattern = data.oldAlt
      ? `<img src="${data.imageUrl}" alt="${data.oldAlt}"`
      : `<img src="${data.imageUrl}" alt=""`;
    
    return [{
      file: data.file || "templates/index.html",
      operation: "replace",
      find: imgPattern,
      replace_with: `<img src="${data.imageUrl}" alt="${data.newAlt}"`,
    }];
  },

  STRUCTURED_DATA_INSERT: (rec) => {
    const data = rec.data as { jsonLd?: object; file?: string } | undefined;
    if (!data?.jsonLd) {
      return [];
    }
    
    const script = `<script type="application/ld+json">\n${JSON.stringify(data.jsonLd, null, 2)}\n</script>`;
    
    return [{
      file: data.file || "templates/base.html",
      operation: "insert_before",
      find: "</head>",
      replace_with: `${script}\n`,
    }];
  },

  H1_UPDATE: (rec) => {
    const data = rec.data as { oldH1?: string; newH1?: string; file?: string } | undefined;
    if (!data?.oldH1 || !data?.newH1) {
      return [];
    }
    return [{
      file: data.file || "templates/index.html",
      operation: "replace",
      find: `<h1>${data.oldH1}</h1>`,
      replace_with: `<h1>${data.newH1}</h1>`,
    }];
  },

  OPEN_GRAPH_UPDATE: (rec) => {
    const data = rec.data as { property?: string; oldContent?: string; newContent?: string; file?: string } | undefined;
    if (!data?.property || !data?.newContent) {
      return [];
    }
    
    if (data.oldContent) {
      return [{
        file: data.file || "templates/base.html",
        operation: "replace",
        find: `<meta property="${data.property}" content="${data.oldContent}"`,
        replace_with: `<meta property="${data.property}" content="${data.newContent}"`,
      }];
    }
    
    return [{
      file: data.file || "templates/base.html",
      operation: "insert_before",
      find: "</head>",
      replace_with: `<meta property="${data.property}" content="${data.newContent}">\n`,
    }];
  },

  REDIRECT_ADD: (rec) => {
    const data = rec.data as { from?: string; to?: string; statusCode?: number } | undefined;
    if (!data?.from || !data?.to) {
      return [];
    }
    
    const redirectRule = `${data.from} -> ${data.to} ${data.statusCode || 301}`;
    
    return [{
      file: "redirects.txt",
      operation: "append",
      content: `\n${redirectRule}`,
    }];
  },

  NOINDEX_REMOVE: (rec) => {
    const data = rec.data as { file?: string } | undefined;
    return [{
      file: data?.file || "templates/base.html",
      operation: "replace",
      find: `<meta name="robots" content="noindex"`,
      replace_with: `<meta name="robots" content="index, follow"`,
    }];
  },
};

export function buildChangePlan(recommendation: Recommendation): ChangePlan {
  const builder = changeBuilders[recommendation.type];
  
  if (!builder) {
    logger.warn("ChangePlanBuilder", `No builder for recommendation type: ${recommendation.type}`);
    return {
      recommendationId: recommendation.id,
      recommendationType: recommendation.type,
      changes: [],
      confidence: "low",
      notes: `No automated fix available for ${recommendation.type}`,
    };
  }

  const changes = builder(recommendation);
  
  return {
    recommendationId: recommendation.id,
    recommendationType: recommendation.type,
    changes,
    confidence: changes.length > 0 ? "high" : "low",
    notes: changes.length === 0 ? "Missing required data for this fix" : undefined,
  };
}

export function buildChangePlansFromRecommendations(recommendations: Recommendation[]): ChangePlan[] {
  return recommendations.map(rec => buildChangePlan(rec));
}

export function aggregateChanges(plans: ChangePlan[]): FileChange[] {
  const allChanges: FileChange[] = [];
  
  for (const plan of plans) {
    allChanges.push(...plan.changes);
  }
  
  return allChanges;
}

export function getSupportedFixTypes(): string[] {
  return Object.keys(changeBuilders);
}
