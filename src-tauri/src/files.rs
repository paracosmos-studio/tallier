use std::fs;
use std::path::PathBuf;
use tauri::Manager;

// expand leading "~/" or bare "~" using the HOME env var
fn expand_tilde(path: &str) -> Result<PathBuf, String> {
    if let Some(rest) = path.strip_prefix("~/") {
        let home = std::env::var("HOME").map_err(|e| e.to_string())?;
        Ok(PathBuf::from(home).join(rest))
    } else if path == "~" {
        let home = std::env::var("HOME").map_err(|e| e.to_string())?;
        Ok(PathBuf::from(home))
    } else {
        Ok(PathBuf::from(path))
    }
}

#[tauri::command]
pub fn path_exists(path: String) -> Result<bool, String> {
    let resolved = expand_tilde(&path)?;
    Ok(resolved.exists())
}

#[tauri::command]
pub fn write_text_file(path: String, contents: String) -> Result<String, String> {
    let resolved = expand_tilde(&path)?;
    if let Some(parent) = resolved.parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }
    fs::write(&resolved, contents).map_err(|e| e.to_string())?;
    Ok(resolved.to_string_lossy().into_owned())
}

// resolve (and lazily create) the avatars directory inside the app data dir
fn avatars_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("avatars");
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    }
    Ok(dir)
}

// keep only a safe lowercase alphanumeric extension, defaulting to png
fn safe_ext(ext: &str) -> String {
    let cleaned: String = ext
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .collect::<String>()
        .to_lowercase();
    if cleaned.is_empty() { "png".to_string() } else { cleaned }
}

// reject anything but a bare filename to block path traversal
fn is_safe_name(name: &str) -> bool {
    !name.is_empty()
        && !name.contains('/')
        && !name.contains('\\')
        && !name.contains("..")
}

// copy image bytes into the app data dir, returning the generated filename
#[tauri::command]
pub fn save_avatar(app: tauri::AppHandle, bytes: Vec<u8>, ext: String) -> Result<String, String> {
    let dir = avatars_dir(&app)?;
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_nanos();
    let name = format!("{stamp}.{}", safe_ext(&ext));
    fs::write(dir.join(&name), bytes).map_err(|e| e.to_string())?;
    Ok(name)
}

// remove a stored avatar by filename; missing files are a no-op
#[tauri::command]
pub fn delete_avatar(app: tauri::AppHandle, name: String) -> Result<(), String> {
    if !is_safe_name(&name) {
        return Err("invalid avatar name".to_string());
    }
    let path = avatars_dir(&app)?.join(&name);
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}
