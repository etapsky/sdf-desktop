// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
export type { DocTypeConfig, FormField, ProduceState } from "./types";
export { nominationConfig }          from "./nomination";
export { purchaseOrderConfig }       from "./purchase-order";
export { invoiceConfig }             from "./invoice";
export { govTaxDeclarationConfig }   from "./gov-tax-declaration";
export { govCustomsDeclarationConfig } from "./gov-customs-declaration";
export { govHealthReportConfig }     from "./gov-health-report";
export { govPermitApplicationConfig } from "./gov-permit-application";

import { nominationConfig }           from "./nomination";
import { purchaseOrderConfig }        from "./purchase-order";
import { invoiceConfig }              from "./invoice";
import { govTaxDeclarationConfig }    from "./gov-tax-declaration";
import { govCustomsDeclarationConfig } from "./gov-customs-declaration";
import { govHealthReportConfig }      from "./gov-health-report";
import { govPermitApplicationConfig } from "./gov-permit-application";
import type { DocTypeConfig }         from "./types";

export const ALL_DOC_CONFIGS: DocTypeConfig[] = [
  nominationConfig,
  purchaseOrderConfig,
  invoiceConfig,
  govTaxDeclarationConfig,
  govCustomsDeclarationConfig,
  govHealthReportConfig,
  govPermitApplicationConfig,
];
