// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn set_window_opacity(window: tauri::WebviewWindow, value: f64) -> Result<(), String> {
    let value = value.clamp(0.4, 1.0);

    #[cfg(windows)]
    {
        use windows::Win32::Foundation::COLORREF;
        use windows::Win32::UI::WindowsAndMessaging::{
            GetWindowLongPtrW, SetLayeredWindowAttributes, SetWindowLongPtrW, GWL_EXSTYLE,
            LWA_ALPHA, WS_EX_LAYERED,
        };

        let hwnd = window.hwnd().map_err(|error| error.to_string())?;
        let alpha = (value * 255.0).round().clamp(0.0, 255.0) as u8;

        unsafe {
            let ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
            let layered = WS_EX_LAYERED.0 as isize;
            if ex_style & layered == 0 {
                SetWindowLongPtrW(hwnd, GWL_EXSTYLE, ex_style | layered);
            }
            SetLayeredWindowAttributes(hwnd, COLORREF(0), alpha, LWA_ALPHA)
                .map_err(|error| error.to_string())?;
        }
    }

    #[cfg(not(windows))]
    {
        let _ = window;
        let _ = value;
    }

    Ok(())
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
        .invoke_handler(tauri::generate_handler![greet, set_window_opacity])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
