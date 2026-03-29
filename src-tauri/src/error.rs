// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
pub enum AppError {
    #[error("I/O error: {0}")]
    Io(String),
    /// Reserved for SDF parsing errors (not yet wired).
    #[allow(dead_code)]
    #[error("SDF parse error: {0}")]
    Parse(String),
    /// Reserved for missing resources (not yet wired).
    #[allow(dead_code)]
    #[error("Not found: {0}")]
    NotFound(String),
}
