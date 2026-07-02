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

#[tauri::command]
pub fn write_file(path: String, bytes: Vec<u8>) -> Result<String, String> {
    let resolved = expand_tilde(&path)?;
    if let Some(parent) = resolved.parent() {
        if !parent.as_os_str().is_empty() && !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
    }
    fs::write(&resolved, bytes).map_err(|e| e.to_string())?;
    Ok(resolved.to_string_lossy().into_owned())
}

// resolve (and lazily create) the avatars directory inside the app data dir
pub(crate) fn avatars_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
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
pub(crate) fn is_safe_name(name: &str) -> bool {
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

// map a filename extension to an image mime, defaulting to png
fn image_mime(name: &str) -> &'static str {
    match name.rsplit('.').next().unwrap_or("").to_ascii_lowercase().as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "svg" => "image/svg+xml",
        "webp" => "image/webp",
        _ => "image/png",
    }
}

const B64: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// standard base64 (with padding); kept dependency-free for a single small use
fn base64_encode(data: &[u8]) -> String {
    let mut out = String::with_capacity(data.len().div_ceil(3) * 4);
    for chunk in data.chunks(3) {
        let n = ((chunk[0] as u32) << 16)
            | ((*chunk.get(1).unwrap_or(&0) as u32) << 8)
            | (*chunk.get(2).unwrap_or(&0) as u32);
        out.push(B64[((n >> 18) & 63) as usize] as char);
        out.push(B64[((n >> 12) & 63) as usize] as char);
        out.push(if chunk.len() > 1 { B64[((n >> 6) & 63) as usize] as char } else { '=' });
        out.push(if chunk.len() > 2 { B64[(n & 63) as usize] as char } else { '=' });
    }
    out
}

// read a stored avatar and return it as a self-contained data URI for portable
// HTML exports; missing files surface as an error the caller can ignore
#[tauri::command]
pub fn read_avatar(app: tauri::AppHandle, name: String) -> Result<String, String> {
    if !is_safe_name(&name) {
        return Err("invalid avatar name".to_string());
    }
    let bytes = fs::read(avatars_dir(&app)?.join(&name)).map_err(|e| e.to_string())?;
    Ok(format!("data:{};base64,{}", image_mime(&name), base64_encode(&bytes)))
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
