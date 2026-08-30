# Dyad Capability Spike

## Investigation

We investigated the capabilities of the installed "Dyad" agent (Antigravity IDE) to determine if it can be invoked headlessly via the cycle script.

- **Installation/Version Detected:** Antigravity 1.107.0 (via `antigravity --version`)
- **Exact Commands Tested:**
  - `antigravity --help`
  - `antigravity chat --help`
  - `cmd /c "mkdir temp-dyad-test && cd temp-dyad-test && antigravity chat \"Create a file called test-dyad.txt containing the word hello and stop.\""`
- **CLI / Headless Availability:** The system provides a CLI (`antigravity`), but it is **not headless**. The `antigravity chat` subcommand dispatches the prompt to a running GUI chat window (acting as an IPC client).
- **Prompt-input Mechanism:** A prompt string can be passed via the CLI (e.g. `antigravity chat "<prompt>"`), but it executes inside the IDE GUI.
- **Working-tree / Diff Behavior:** The agent applies changes directly to the working tree using its editor tools. It does not output a standard patch/diff to the CLI.
- **Context/File Scoping:** While context can be passed (e.g., `--add-file`), the agent is a generalized AI and operates across the entire opened workspace context.
- **Exit-code Behavior:** The CLI returns `0` immediately upon successfully dispatching the IPC message to the GUI. It does **not** block to wait for the agent's completion, nor does it return an exit code reflecting the agent's success or failure.
- **Unattended Automation:** Native unattended headless automation is **impossible** in this context because the CLI doesn't wait for completion and the agent requires the GUI environment to function.

## Evidence from Actual Test

A test was performed in a temporary sandbox (`temp-dyad-test`) with the command:
`antigravity chat "Create a file called test-dyad.txt containing the word hello and stop."`

**Result:**
- The command exited immediately with code `0`.
- The CLI did not block to wait for the agent's execution.
- Inspection of the `temp-dyad-test` directory revealed no files were created synchronously (0 files found during the script execution).

## Conclusion: Mode B

Because Dyad (Antigravity) is effectively **GUI-only** and lacks a blocking, headless CLI execution mode with meaningful exit status, we must proceed with **Mode B**. 

**Cycle Runner Implementation (Mode B):**
1. The `cycle.sh` script will run the automated checks (TypeScript, Biome, Playwright).
2. If checks fail, it will aggregate the structured error output into a prompt file.
3. The script will **pause** execution and prompt the human operator: "Please paste the contents of `prompt.txt` into the Dyad chat window, and press ENTER here when the agent finishes applying changes."
4. After the operator resumes the script, the runner will rerun checks and detect working-tree changes to verify if the iteration succeeded.
