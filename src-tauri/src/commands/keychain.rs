// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
use crate::error::AppError;

const KEYCHAIN_SERVICE: &str = "com.etapsky.sdf-desktop";
const KEYCHAIN_ACCOUNT: &str = "refresh-token";

fn entry() -> Result<keyring::Entry, AppError> {
    keyring::Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT).map_err(|e| AppError::Io(e.to_string()))
}

#[tauri::command]
pub async fn keychain_set_refresh_token(token: String) -> Result<(), AppError> {
    let trimmed = token.trim();
    if trimmed.is_empty() {
        return Err(AppError::Parse("refresh token is empty".into()));
    }
    entry()?.set_password(trimmed).map_err(|e| AppError::Io(e.to_string()))
}

#[tauri::command]
pub async fn keychain_get_refresh_token() -> Result<Option<String>, AppError> {
    match entry()?.get_password() {
        Ok(v) => Ok(Some(v)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(AppError::Io(e.to_string())),
    }
}

#[tauri::command]
pub async fn keychain_delete_refresh_token() -> Result<(), AppError> {
    match entry()?.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(AppError::Io(e.to_string())),
    }
}
