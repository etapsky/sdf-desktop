// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
use crate::error::AppError;
use serde::{Deserialize, Serialize};
use tauri::Manager;

const KEYCHAIN_SERVICE: &str = "com.etapsky.sdf-desktop";
const KEYCHAIN_ACCOUNT: &str = "refresh-token";
const SIGNING_PRIVATE_KEY_ACCOUNT: &str = "signing-private-key";
const SIGNING_PUBLIC_KEY_ACCOUNT: &str = "signing-public-key";
const SIGNING_ALGORITHM_ACCOUNT: &str = "signing-algorithm";

fn entry() -> Result<keyring::Entry, AppError> {
    keyring::Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT).map_err(|e| AppError::Io(e.to_string()))
}

fn signing_private_entry() -> Result<keyring::Entry, AppError> {
    keyring::Entry::new(KEYCHAIN_SERVICE, SIGNING_PRIVATE_KEY_ACCOUNT).map_err(|e| AppError::Io(e.to_string()))
}

fn signing_public_entry() -> Result<keyring::Entry, AppError> {
    keyring::Entry::new(KEYCHAIN_SERVICE, SIGNING_PUBLIC_KEY_ACCOUNT).map_err(|e| AppError::Io(e.to_string()))
}

fn signing_algorithm_entry() -> Result<keyring::Entry, AppError> {
    keyring::Entry::new(KEYCHAIN_SERVICE, SIGNING_ALGORITHM_ACCOUNT).map_err(|e| AppError::Io(e.to_string()))
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

// ─── File-based signing key storage ──────────────────────────────────────────
// Storing self-signed ECDSA keys in the OS keychain triggers macOS permission
// dialogs for unsigned/dev binaries. The app-local data directory is always
// writable without extra permissions and is protected by OS file-system ACLs.

#[derive(Debug, Serialize, Deserialize)]
pub struct SigningKeyStore {
    pub private_key_b64: String,
    pub public_key_b64:  String,
    pub algorithm:       String,
}

fn signing_keys_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, AppError> {
    let dir = app.path().app_local_data_dir()
        .map_err(|e| AppError::Io(format!("app_local_data_dir: {e}")))?;
    std::fs::create_dir_all(&dir)
        .map_err(|e| AppError::Io(format!("create_dir_all: {e}")))?;
    Ok(dir.join("signing_keys.json"))
}

/// Persist the self-signed key pair to the app-local data directory.
#[tauri::command]
pub async fn signing_keys_save(
    app: tauri::AppHandle,
    private_key_b64: String,
    public_key_b64: String,
    algorithm: String,
) -> Result<(), AppError> {
    let store = SigningKeyStore { private_key_b64, public_key_b64, algorithm };
    let json = serde_json::to_string(&store)
        .map_err(|e| AppError::Parse(e.to_string()))?;
    let path = signing_keys_path(&app)?;
    std::fs::write(&path, json)
        .map_err(|e| AppError::Io(format!("signing_keys_save: {e}")))
}

/// Load the self-signed key pair from the app-local data directory.
#[tauri::command]
pub async fn signing_keys_load(
    app: tauri::AppHandle,
) -> Result<Option<SigningKeyStore>, AppError> {
    let path = signing_keys_path(&app)?;
    match std::fs::read_to_string(&path) {
        Ok(json) => {
            let store: SigningKeyStore = serde_json::from_str(&json)
                .map_err(|e| AppError::Parse(format!("signing_keys_load parse: {e}")))?;
            Ok(Some(store))
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(AppError::Io(format!("signing_keys_load: {e}"))),
    }
}

// ─── Legacy keychain commands (auth token only) ───────────────────────────────

#[tauri::command]
pub async fn keychain_set_signing_private_key(value: String) -> Result<(), AppError> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(AppError::Parse("signing private key is empty".into()));
    }
    signing_private_entry()?
        .set_password(trimmed)
        .map_err(|e| AppError::Io(e.to_string()))
}

#[tauri::command]
pub async fn keychain_get_signing_private_key() -> Result<Option<String>, AppError> {
    match signing_private_entry()?.get_password() {
        Ok(v) => Ok(Some(v)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(AppError::Io(e.to_string())),
    }
}

#[tauri::command]
pub async fn keychain_set_signing_public_key(value: String) -> Result<(), AppError> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(AppError::Parse("signing public key is empty".into()));
    }
    signing_public_entry()?
        .set_password(trimmed)
        .map_err(|e| AppError::Io(e.to_string()))
}

#[tauri::command]
pub async fn keychain_get_signing_public_key() -> Result<Option<String>, AppError> {
    match signing_public_entry()?.get_password() {
        Ok(v) => Ok(Some(v)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(AppError::Io(e.to_string())),
    }
}

#[tauri::command]
pub async fn keychain_set_signing_algorithm(value: String) -> Result<(), AppError> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(AppError::Parse("signing algorithm is empty".into()));
    }
    signing_algorithm_entry()?
        .set_password(trimmed)
        .map_err(|e| AppError::Io(e.to_string()))
}

#[tauri::command]
pub async fn keychain_get_signing_algorithm() -> Result<Option<String>, AppError> {
    match signing_algorithm_entry()?.get_password() {
        Ok(v) => Ok(Some(v)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(AppError::Io(e.to_string())),
    }
}
