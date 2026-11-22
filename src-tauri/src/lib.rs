// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg(windows)]
fn grant_webview2_permissions(path: &std::path::Path) {
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    const CREATE_NO_WINDOW: u32 = 0x08000000;

    for sid in ["*S-1-15-2-2", "*S-1-15-2-1"] {
        let _ = Command::new("icacls")
            .arg(path)
            .arg("/grant")
            .arg(format!("{sid}:(OI)(CI)(RX)"))
            .arg("/C")
            .creation_flags(CREATE_NO_WINDOW)
            .output();
    }
}

#[cfg(windows)]
fn setup_portable_webview2() {
    use std::env;

    if env::var_os("WEBVIEW2_BROWSER_EXECUTABLE_FOLDER").is_some() {
        return;
    }

    let Some(exe_dir) = env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(std::path::Path::to_path_buf))
    else {
        return;
    };

    let runtime_dir = exe_dir.join("WebView2Runtime");
    if runtime_dir.join("msedgewebview2.exe").is_file() {
        grant_webview2_permissions(&runtime_dir);
        unsafe {
            env::set_var("WEBVIEW2_BROWSER_EXECUTABLE_FOLDER", runtime_dir);
        }
    }
}

#[cfg(not(windows))]
fn setup_portable_webview2() {}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    setup_portable_webview2();
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
