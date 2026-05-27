use std::fs;
use std::path::PathBuf;

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
