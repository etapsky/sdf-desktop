// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
pub enum AppError {
    #[error("I/O error: {0}")]
    Io(String),
    #[error("SDF parse error: {0}")]
    Parse(String),
    #[error("Not found: {0}")]
    NotFound(String),
}
