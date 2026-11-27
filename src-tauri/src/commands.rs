use std::collections::HashMap;
use std::io::Read;
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::State;

#[derive(Default)]
pub struct ProcessRegistry {
    children: Mutex<HashMap<String, Child>>,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteResult {
    success: bool,
    exit_code: Option<i32>,
    stdout_tail: String,
    stderr_tail: String,
    error: Option<String>,
}

const OUTPUT_LIMIT: usize = 16_000;

fn tail(bytes: &[u8]) -> String {
    let text = String::from_utf8_lossy(bytes);
    if text.chars().count() <= OUTPUT_LIMIT {
        return text.into_owned();
    }
    text.chars()
        .rev()
        .take(OUTPUT_LIMIT)
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect()
}

fn configure_command(command: &mut Command) {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        command.creation_flags(CREATE_NO_WINDOW);
    }
    #[cfg(not(windows))]
    let _ = command;
}

fn build_command(shell: &str, command: &str) -> Command {
    match shell {
        "powershell" => {
            let mut cmd = Command::new("powershell.exe");
            cmd.arg("-NoProfile")
                .arg("-NonInteractive")
                .arg("-Command")
                .arg(command);
            configure_command(&mut cmd);
            cmd
        }
        _ => {
            let mut cmd = Command::new("cmd.exe");
            cmd.arg("/D").arg("/S").arg("/C").arg(command);
            configure_command(&mut cmd);
            cmd
        }
    }
}

#[tauri::command]
pub fn execute_command(
    command_id: String,
    command: String,
    shell: String,
    cwd: Option<String>,
    registry: State<'_, ProcessRegistry>,
) -> Result<ExecuteResult, String> {
    if shell != "powershell" && shell != "cmd" {
        return Err("unsupported shell".into());
    }

    let cwd = cwd.map(|value| value.trim().to_string()).filter(|v| !v.is_empty());
    if let Some(ref path) = cwd {
        let dir = PathBuf::from(path);
        if !dir.is_dir() {
            return Ok(ExecuteResult {
                success: false,
                exit_code: None,
                stdout_tail: String::new(),
                stderr_tail: String::new(),
                error: Some(format!(
                    "working directory does not exist or is not absolute: {path}"
                )),
            });
        }
    }

    let mut child = {
        let mut registry = registry.children.lock().map_err(|e| e.to_string())?;
        if let Some(existing) = registry.get_mut(&command_id) {
            let _ = existing.kill();
            let _ = existing.wait();
            registry.remove(&command_id);
        }
        let mut built = build_command(&shell, &command);
        built
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        if let Some(path) = &cwd {
            built.current_dir(path);
        }
        built.spawn().map_err(|e| e.to_string())?
    };

    let mut stdout = Vec::new();
    let mut stderr = Vec::new();
    if let Some(mut pipe) = child.stdout.take() {
        let _ = pipe.read_to_end(&mut stdout);
    }
    if let Some(mut pipe) = child.stderr.take() {
        let _ = pipe.read_to_end(&mut stderr);
    }
    let status = child.wait().map_err(|e| e.to_string())?;

    let mut registry = registry.children.lock().map_err(|e| e.to_string())?;
    registry.remove(&command_id);

    Ok(ExecuteResult {
        success: status.success(),
        exit_code: status.code(),
        stdout_tail: tail(&stdout),
        stderr_tail: tail(&stderr),
        error: None,
    })
}

#[tauri::command]
pub fn stop_command(command_id: String, registry: State<'_, ProcessRegistry>) -> Result<bool, String> {
    let mut registry = registry.children.lock().map_err(|e| e.to_string())?;
    let Some(child) = registry.get_mut(&command_id) else {
        return Ok(false);
    };
    child.kill().map_err(|e| e.to_string())?;
    let _ = child.wait();
    registry.remove(&command_id);
    Ok(true)
}

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
